import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/users/reset-mfa — 특정 사용자의 2단계 인증(OTP) 초기화
// 인증기 분실 시 관리자가 등록된 TOTP factor를 모두 제거한다.
// 초기화 후 해당 사용자는 다음 로그인 때 OTP를 다시 등록해야 한다(REQUIRE_MFA=true인 경우 강제).
export async function POST(req: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId 필요' }, { status: 400 })

    // 대상 사용자의 등록된 인증수단 조회
    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 })

    const factors = userRes.user?.factors ?? []
    if (factors.length === 0) {
      return NextResponse.json({ success: true, removed: 0, message: '등록된 2단계 인증이 없습니다.' })
    }

    // 모든 factor 삭제
    let removed = 0
    for (const f of factors) {
      const { error: delErr } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: f.id, userId })
      if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
      removed++
    }

    return NextResponse.json({ success: true, removed })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
