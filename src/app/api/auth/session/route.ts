import { MICROSOFT_SESSION_COOKIE } from '@/lib/microsoft-session'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { isApprovedRole, LOGIN_ERROR_MESSAGES } from '@/lib/auth-policy'
import { isCurrentAccountSessionAllowed, canCurrentAccountSkipOtp } from '@/lib/server-account-session'
import { getAccountDisplayEmail, getAuthSource, getLegacyMicrosoftProviderIds } from '@/lib/account-source'

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await isCurrentAccountSessionAllowed(supabase, user)) {
    return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.sso_session_required }, { status: 401 })
  }
  const { data: profile, error } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.auth_unavailable }, { status: 503 })
  if (!isApprovedRole(profile?.role)) return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.not_approved }, { status: 403 })
  return NextResponse.json({ valid: true, role: profile.role, authSource: getAuthSource(user),
    skipOtp: await canCurrentAccountSkipOtp(supabase, user),
    legacyMicrosoftLinked: getAuthSource(user) === 'email'
      && user.identities?.some(identity => getLegacyMicrosoftProviderIds().includes(identity.provider)) === true,
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * POST /api/auth/session
 * 로그인 직후 클라이언트가 호출.
 *  1) 새 session_token 발급 → profiles 에 저장(단일 세션) → 토큰 반환
 *  2) 로그인 이력(IP/UA) 기록(감사)
 *
 * 마이그레이션(20260624_security.sql) 미적용 상태에서도 앱이 깨지지 않도록
 * 모든 DB 작업을 방어적으로 감싼다.
 */
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (!await isCurrentAccountSessionAllowed(supabase, user)) {
    return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.sso_session_required }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) {
    return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.auth_unavailable }, { status: 503 })
  }
  if (!isApprovedRole(profile?.role)) {
    return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.not_approved }, { status: 403 })
  }

  const skipOtp = await canCurrentAccountSkipOtp(supabase, user)
  const { data: aal, error: aalError } = skipOtp
    ? { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null }
    : await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalError || !aal) {
    return NextResponse.json({ error: LOGIN_ERROR_MESSAGES.auth_unavailable }, { status: 503 })
  }
  if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return NextResponse.json({ error: '인증 앱의 OTP 확인이 필요합니다.' }, { status: 403 })
  }

  const sessionToken = crypto.randomUUID()

  // 1) 단일 세션 토큰 저장 (컬럼 없으면 무시)
  try {
    await supabaseAdmin
      .from('profiles')
      .update({ session_token: sessionToken })
      .eq('id', user.id)
  } catch {
    // session_token 컬럼 미생성 — 무시
  }

  // 2) 로그인 이력 기록 (테이블 없으면 무시)
  try {
    const fwd = req.headers.get('x-forwarded-for') || ''
    const ip = fwd.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
    const ua = req.headers.get('user-agent') || null
    await supabaseAdmin.from('login_events').insert({
      user_id: user.id,
      email: getAccountDisplayEmail(user),
      ip,
      user_agent: ua,
    })
  } catch {
    // login_events 테이블 미생성 — 무시
  }

  const redirectTo = process.env.REQUIRE_MFA === 'true' && aal.currentLevel !== 'aal2'
    ? '/settings/security'
    : profile.role === 'vendor' ? '/vendor' : '/dashboard'
  return NextResponse.json({ sessionToken, redirectTo })
}

// Clearing this browser's proof is allowed even after its auth session expires.
// Supabase session revocation remains the existing client's signOut operation.
export async function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  response.cookies.set(MICROSOFT_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
