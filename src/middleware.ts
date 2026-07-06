import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 자체 인증(시크릿)으로 보호되는 서버-서버 API — 사용자 세션 게이트 제외
const SELF_AUTH_API = ['/api/replenishment/cron', '/api/replenishment/calculate']

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')
  const isVendorRoute = pathname.startsWith('/vendor')

  // ─── API 라우트: 로그인 필수 + 브랜드 권한 서버 강제 ───────────────
  if (isApiRoute) {
    // 크론/계산 등 자체 시크릿으로 인증하는 엔드포인트는 통과 (라우트가 직접 검증)
    if (SELF_AUTH_API.some(p => pathname.startsWith(p))) return supabaseResponse

    // 로그인 안 됐으면 즉시 401 (페이지처럼 리다이렉트하지 않음)
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // 브랜드 권한 강제: ?brand= 파라미터를 사용자 허용 브랜드로 클램프
    // (화면에서만 막던 것을 서버에서 막아 ?brand=all 우회를 차단)
    const url = request.nextUrl
    if (url.searchParams.has('brand')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, brands')
        .eq('id', user.id)
        .single()

      const restricted =
        profile &&
        profile.role !== 'admin' &&
        Array.isArray(profile.brands) &&
        profile.brands.length > 0

      if (restricted) {
        const allowed: string[] = profile!.brands
        const requested = url.searchParams.get('brand')!
        const effective =
          requested === 'all'
            ? allowed
            : requested.split(',').filter(b => allowed.includes(b))

        if (effective.length === 0) {
          return NextResponse.json(
            { error: '해당 브랜드 조회 권한이 없습니다.' },
            { status: 403 }
          )
        }

        // 권한 밖 브랜드를 요청했으면 허용 범위로 치환 후 라우트로 전달
        if (effective.join(',') !== requested) {
          const rewritten = url.clone()
          rewritten.searchParams.set('brand', effective.join(','))
          return NextResponse.rewrite(rewritten)
        }
      }
    }

    return supabaseResponse
  }

  // 협력사 경로는 자체 인증 처리 (vendor layout에서 처리)
  if (isVendorRoute) return supabaseResponse

  // 로그인 안된 상태에서 login 페이지 외 접근 → /login으로
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ─── 2단계 인증(OTP) 전사 강제 (REQUIRE_MFA=true 일 때만) ───
  // 모든 계정이 OTP를 쓰도록 강제: 미등록자는 등록 페이지로, 등록했지만
  // 이번 세션에 OTP를 안 푼 경우(미완료)는 로그인으로 돌려보낸다.
  // 계정을 외부에 공유해도 OTP 기기가 없으면 로그인 불가.
  let mfaSatisfied = true
  if (process.env.REQUIRE_MFA === 'true' && user) {
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const needEnroll = aal?.nextLevel === 'aal1'                                   // 등록된 인증수단 없음
      const needStepUp = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2'   // 등록했으나 OTP 미완료
      mfaSatisfied = !needEnroll && !needStepUp
      const isSecurityPage = pathname.startsWith('/settings/security')
      if (!isLoginPage) {
        if (needStepUp) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
        if (needEnroll && !isSecurityPage) {
          return NextResponse.redirect(new URL('/settings/security', request.url))
        }
      }
    } catch {
      // 확인 실패 시 잠금 회피(가용성 우선) — 로그인 챌린지가 1차 방어선
      mfaSatisfied = true
    }
  }

  // 이미 로그인되고 OTP까지 충족된 상태에서 /login 접근 → /dashboard로
  if (user && isLoginPage && mfaSatisfied) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
