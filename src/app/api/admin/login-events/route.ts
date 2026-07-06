import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/login-events?email=&limit=200
// 로그인 이력 조회 (관리자 전용) — 계정 공유/이상 접속 점검용
export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000)

  try {
    let q = supabaseAdmin
      .from('login_events')
      .select('id, email, ip, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (email) q = q.eq('email', email)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ events: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
