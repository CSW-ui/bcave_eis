import { isTransientAuthFailure, waitForAuthRecovery } from '@/lib/auth-network'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { isApprovedRole } from '@/lib/auth-policy'
import { resolveAuthRequestOrigin, logAuthOriginRejection } from '@/lib/auth-urls'
import { exchangeMicrosoftAuthCode, verifyMicrosoftIdToken, MICROSOFT_TRANSACTION_COOKIE } from '@/lib/microsoft-auth'
import { ensureMicrosoftAccount } from '@/lib/microsoft-account'
import { getAuthSource } from '@/lib/account-source'
import { createMicrosoftSessionProof, getSessionId, MICROSOFT_SESSION_COOKIE, MICROSOFT_SESSION_COOKIE_MAX_AGE } from '@/lib/microsoft-session'

function logMicrosoftFailure(stage: string, error?: { status?: number; code?: string }) {
  // 공급자 응답 원문에는 인증 정보가 포함될 수 있어 상태와 오류 코드만 기록한다.
  console.warn('[Microsoft SSO]', stage, {
    status: error?.status,
    code: error?.code && /^[a-z0-9_:-]{1,80}$/i.test(error.code) ? error.code : undefined,
  })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  let origin: string | null
  try {
    origin = resolveAuthRequestOrigin(request)
  } catch {
    origin = null
  }
  if (!origin) {
    logAuthOriginRejection(request)
    return NextResponse.json({ error: '허용되지 않은 로그인 주소입니다.' }, { status: 400 })
  }
  function finish(response: NextResponse) {
    response.headers.set('Cache-Control', 'no-store')
    response.cookies.set(MICROSOFT_TRANSACTION_COOKIE, '', {
      httpOnly: true, secure: origin!.startsWith('https:'), sameSite: 'lax', path: '/auth', maxAge: 0,
    })
    return response
  }
  const failure = (reason: string) => finish(
    NextResponse.redirect(new URL(`/login?error=${reason}`, origin))
  )

  if (process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED !== 'true') {
    return failure('sso_disabled')
  }

  if (url.searchParams.has('error')) {
    logMicrosoftFailure('authorization', { code: url.searchParams.get('error') || undefined })
    return failure(url.searchParams.get('error') === 'access_denied' ? 'sso_cancelled' : 'sso_failed')
  }

  const code = url.searchParams.get('code')
  if (!code) return failure('sso_failed')

  try {
    const microsoft = await exchangeMicrosoftAuthCode({
      code,
      state: url.searchParams.get('state') || '',
      transactionCookie: cookies().get(MICROSOFT_TRANSACTION_COOKIE)?.value || '',
      origin,
    })
    // Microsoft 서명·issuer·audience·nonce·tid·oid를 직접 검증한다.
    const identity = await verifyMicrosoftIdToken({ idToken: microsoft.idToken, nonce: microsoft.nonce })
    const account = await ensureMicrosoftAccount(identity)
    if (account.app_metadata.microsoft_access_approved !== true) return failure('sso_not_approved')
    // MS 계정의 별도 UUID만 조회한다. 같은 이메일의 EIS 프로필로 대체하지 않는다.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', account.id)
      .maybeSingle()

    if (profileError || !isApprovedRole(profile?.role)) {
      return failure(profileError ? 'auth_unavailable' : 'sso_not_approved')
    }

    // 서버 내부에서만 독립 Auth 계정의 일회용 grant를 교환한다. 메일을 발송하지 않는다.
    type AuthClient = ReturnType<typeof createSupabaseServerClient>
    let supabase: AuthClient | undefined
    let completed: Awaited<ReturnType<AuthClient['auth']['verifyOtp']>>['data'] | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      // Never replay a possibly consumed OTP. Generate a fresh grant for the same
      // verified, independent account on every recovery attempt.
      const grant = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: account.email! })
      if (grant.error) {
        logMicrosoftFailure('session_grant', grant.error)
        if (isTransientAuthFailure(grant.error) && attempt < 2) {
          await waitForAuthRecovery(attempt)
          continue
        }
        return failure(isTransientAuthFailure(grant.error) ? 'auth_unavailable' : 'sso_failed')
      }
      if (grant.data?.user?.id !== account.id || !grant.data?.properties?.hashed_token
        || getAuthSource(grant.data.user) !== 'microsoft'
        || grant.data.user.app_metadata.microsoft_access_approved !== true) return failure('sso_failed')
      supabase ??= createSupabaseServerClient()
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'magiclink', token_hash: grant.data.properties.hashed_token,
      })
      if (error) {
        logMicrosoftFailure('session_exchange', error)
        if (isTransientAuthFailure(error) && attempt < 2) {
          await waitForAuthRecovery(attempt)
          continue
        }
        await supabase.auth.signOut({ scope: 'local' })
        return failure(isTransientAuthFailure(error) ? 'auth_unavailable' : 'sso_failed')
      }
      if (data.user?.id !== account.id || !data.session || getAuthSource(data.user) !== 'microsoft'
        || data.user.app_metadata.microsoft_access_approved !== true) {
        await supabase.auth.signOut({ scope: 'local' })
        return failure('sso_failed')
      }
      completed = data
      if (attempt > 0) console.info('[Microsoft SSO] session_recovered', { attempt: attempt + 1 })
      break
    }
    if (!completed?.session) return failure('auth_unavailable')
    const proof = await createMicrosoftSessionProof({
      userId: account.id, sessionId: getSessionId(completed.session.access_token),
      tenantId: identity.tenantId, objectId: identity.objectId,
      companyDomainVerified: identity.companyDomainVerified,
    })
    // OTP 확인, 단일 세션 토큰 발급, 감사 로그는 비밀번호 로그인과 같은 흐름에서 처리한다.
    const response = finish(NextResponse.redirect(new URL('/login?auth_complete=1', origin)))
    response.cookies.set(MICROSOFT_SESSION_COOKIE, proof, {
      httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'lax', path: '/',
      maxAge: MICROSOFT_SESSION_COOKIE_MAX_AGE,
    })
    return response
  } catch (error) {
    logMicrosoftFailure('callback')
    if (error instanceof Error && error.name === 'MicrosoftDomainNotAllowedError') return failure('sso_domain_not_allowed')
    return failure('auth_unavailable')
  }
}
