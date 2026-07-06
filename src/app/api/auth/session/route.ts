import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

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
      email: user.email,
      ip,
      user_agent: ua,
    })
  } catch {
    // login_events 테이블 미생성 — 무시
  }

  return NextResponse.json({ sessionToken })
}
