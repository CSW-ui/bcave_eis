import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { getAccountDisplayEmail, getAuthSource } from '@/lib/account-source'
import type { User } from '@supabase/supabase-js'

// GET /api/admin/login-events?userId=&email=&limit=200
// 로그인 이력 조회 (관리자 전용) — 계정 공유/이상 접속 점검용
export async function GET(req: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  const userId = searchParams.get('userId') || searchParams.get('user_id')
  const limit = Math.min(Number(searchParams.get('limit')) || 200, 1000)

  try {
    let q = supabaseAdmin
      .from('login_events')
      .select('id, user_id, email, ip, user_agent, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (email) q = q.eq('email', email)
    if (userId) q = q.eq('user_id', userId)

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const usersById = new Map<string, User>()
    const ids = [...new Set<string>((data ?? []).map(event => event.user_id).filter(Boolean))]
    // Resolve display metadata by Auth UUID so equal emails never merge accounts.
    for (let offset = 0; offset < ids.length; offset += 8) {
      await Promise.all(ids.slice(offset, offset + 8).map(async id => {
        const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(id)
        if (!error && target.user) usersById.set(id, target.user)
      }))
    }
    const events = (data ?? []).map(event => {
      const user = usersById.get(event.user_id)
      return {
        ...event,
        displayEmail: getAccountDisplayEmail(user) || event.email,
        authSource: user ? getAuthSource(user) : null,
      }
    })
    return NextResponse.json({ events })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
