import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth'
import { getAccountDisplayEmail, getAuthSource, type AuthSource } from '@/lib/account-source'
import { isApprovedRole } from '@/lib/auth-policy'
import { VALID_BRANDS } from '@/lib/constants'
import type { User } from '@supabase/supabase-js'

interface StoredProfile {
  id: string
  email: string
  name: string
  role: string
  brands: string[]
  vendor_name?: string | null
}

interface ManagedAccount extends Omit<StoredProfile, 'role'> {
  role: string | null
  authSource: AuthSource
  displayEmail: string
  hasProfile: boolean
}

function validBrands(brands: unknown): brands is string[] {
  return Array.isArray(brands) && brands.every(brand => typeof brand === 'string' && VALID_BRANDS.has(brand))
}

async function listAuthUsers(): Promise<User[]> {
  const users: User[] = []
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length === 0 || (!data.nextPage && data.users.length < perPage)) return users
  }
}

// GET /api/admin/users — 전체 사용자 목록
export async function GET() {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  try {
    const profiles: StoredProfile[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, email, name, role, brands, vendor_name')
        .order('id')
        .range(offset, offset + 999)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      profiles.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    const authUsers = await listAuthUsers()
    const authById = new Map(authUsers.map(user => [user.id, user]))
    const profileIds = new Set(profiles.map(profile => profile.id))
    const users: ManagedAccount[] = profiles.map(profile => {
      const authUser = authById.get(profile.id)
      const authSource = getAuthSource(authUser)
      const isPendingMicrosoft = authSource === 'microsoft' && authUser?.app_metadata?.microsoft_access_approved !== true
      return {
        ...profile,
        role: isPendingMicrosoft ? null : profile.role,
        brands: isPendingMicrosoft ? [] : profile.brands,
        authSource,
        displayEmail: getAccountDisplayEmail(authUser) || profile.email,
        hasProfile: !isPendingMicrosoft,
      }
    })

    // Database triggers may create a default profile at first authentication.
    // Only the administrator-controlled approval marker grants Microsoft access.
    for (const user of authUsers) {
      if (getAuthSource(user) !== 'microsoft' || profileIds.has(user.id)) continue
      users.push({
        id: user.id,
        email: user.email ?? '',
        displayEmail: getAccountDisplayEmail(user),
        name: typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : getAccountDisplayEmail(user),
        role: null,
        brands: [],
        vendor_name: null,
        authSource: 'microsoft',
        hasProfile: false,
      })
    }
    users.sort((a, b) => (a.role ?? 'zz').localeCompare(b.role ?? 'zz') || a.name.localeCompare(b.name, 'ko'))
    return NextResponse.json({ users })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/admin/users — 사용자 생성
export async function POST(req: Request) {
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  try {
    const body = await req.json()
    const { email, password, name, role, brands } = body

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password || typeof name !== 'string' || !name.trim() || !isApprovedRole(role)) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요.' }, { status: 400 })
    }
    if (brands !== undefined && !validBrands(brands)) {
      return NextResponse.json({ error: '브랜드 권한을 확인해주세요.' }, { status: 400 })
    }

    // Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { auth_source: 'email' },
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
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
  try {
    const body = await req.json()
    const { id, name, role, brands, password } = body

    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'ID 필요' }, { status: 400 })
    if (role !== undefined && !isApprovedRole(role)) {
      return NextResponse.json({ error: '역할을 선택해주세요.' }, { status: 400 })
    }
    if (brands !== undefined && !validBrands(brands)) {
      return NextResponse.json({ error: '브랜드 권한을 확인해주세요.' }, { status: 400 })
    }
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 })
    }
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(id)
    if (targetError || !target.user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }
    const isMicrosoft = getAuthSource(target.user) === 'microsoft'
    if (isMicrosoft && password) {
      return NextResponse.json({ error: 'Microsoft 계정의 비밀번호는 회사 계정에서 관리합니다.' }, { status: 400 })
    }

    if (isMicrosoft) {
      const { data: existingProfile, error: profileError } = await supabaseAdmin
        .from('profiles').select('id').eq('id', id).maybeSingle()
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
      if (!existingProfile || target.user.app_metadata?.microsoft_access_approved !== true) {
        if (!isApprovedRole(role) || typeof name !== 'string' || !name.trim() || !validBrands(brands)) {
          return NextResponse.json({ error: '권한 등록 시 이름, 역할과 브랜드 권한을 명시해주세요.' }, { status: 400 })
        }
        if (!target.user.email) return NextResponse.json({ error: 'Microsoft 계정 정보를 확인할 수 없습니다.' }, { status: 400 })
        const { error } = await supabaseAdmin.from('profiles').upsert({
          id: target.user.id,
          email: target.user.email,
          name: name.trim(),
          role,
          brands,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        // Profile writes alone cannot approve a Microsoft account. Preserve all
        // identity metadata and grant access only after its explicit profile saves.
        const { error: approvalError } = await supabaseAdmin.auth.admin.updateUserById(target.user.id, {
          app_metadata: { ...target.user.app_metadata, microsoft_access_approved: true },
        })
        if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 500 })
        return NextResponse.json({ success: true })
      }
    }

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
  const gate = await requireAdmin()
  if (gate instanceof NextResponse) return gate
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
