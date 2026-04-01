import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/admin/users — 전체 사용자 목록
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, name, role, brands, vendor_name')
      .order('role')
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/admin/users — 사용자 생성
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, name, role, brands } = body

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }

    // Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    if (!authData.user) return NextResponse.json({ error: '사용자 생성 실패' }, { status: 500 })

    // profiles 테이블에 프로필 생성
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        name,
        role,
        brands: brands ?? [],
      })

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PUT /api/admin/users — 사용자 수정
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, role, brands, password } = body

    if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 })

    // 프로필 업데이트
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (brands !== undefined) updateData.brands = brands

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 비밀번호 변경 요청이 있으면
    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/admin/users — 사용자 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 })

    // profiles 먼저 삭제
    await supabaseAdmin.from('profiles').delete().eq('id', id)
    // auth 사용자 삭제
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
