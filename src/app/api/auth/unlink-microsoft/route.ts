import { NextResponse } from 'next/server'
import { getServerProfile } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getAuthSource, getLegacyMicrosoftProviderIds } from '@/lib/account-source'
import { isPasswordAccountSession } from '@/lib/microsoft-session'

// 과거 자동 연결로 붙은 로그인 수단만 제거한다. 기존 사용자와 프로필은 보존한다.
export async function POST() {
  if (!await getServerProfile()) return NextResponse.json({ error: 'EIS 계정으로 로그인하고 OTP 인증을 완료해주세요.' }, { status: 401 })
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || getAuthSource(user) !== 'email') {
    return NextResponse.json({ error: '기존 EIS 계정에서만 연결을 해제할 수 있습니다.' }, { status: 403 })
  }
  const { data: current, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !isPasswordAccountSession(user, current.session)) {
    return NextResponse.json({ error: 'EIS 비밀번호로 다시 로그인하고 OTP 인증을 완료해주세요.' }, { status: 401 })
  }
  const providers = getLegacyMicrosoftProviderIds()
  const identities = user.identities?.filter(item => providers.includes(item.provider)) || []
  if (!identities.length) return NextResponse.json({ success: true })
  if (!user.identities?.some(item => item.provider === 'email')) {
    return NextResponse.json({ error: '기존 비밀번호 로그인 수단을 확인할 수 없습니다.' }, { status: 409 })
  }
  for (const identity of identities) {
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) {
      if (error.code === 'manual_linking_disabled') {
        return NextResponse.json({ error: 'Supabase 프로젝트에서 연결 해제가 차단돼 있습니다. 프로젝트 소유자가 이 계정의 Microsoft identity를 해제해야 합니다. 기존 자동 연결 공급자는 비활성화돼 있습니다.' }, { status: 409 })
      }
      return NextResponse.json({ error: '연결을 해제하지 못했습니다. 기존 계정 정보는 보존했습니다.' }, { status: 503 })
    }
  }
  const verified = await supabase.auth.getUser()
  if (verified.error || verified.data.user?.identities?.some(item => providers.includes(item.provider))) {
    return NextResponse.json({ error: '연결 해제 결과를 확인하지 못했습니다.' }, { status: 503 })
  }
  return NextResponse.json({ success: true })
}
