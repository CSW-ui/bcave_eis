import { authServerFetch, isTransientAuthFailure } from '@/lib/auth-network'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isApprovedRole, LOGIN_ERROR_MESSAGES } from '@/lib/auth-policy'
import { isAccountSessionAllowed, requiresAccountSessionCheck, MICROSOFT_SESSION_COOKIE, canSkipMicrosoftOtp, renewMicrosoftSessionProof, MICROSOFT_SESSION_COOKIE_MAX_AGE } from '@/lib/microsoft-session'

// 자체 인증(시크릿)으로 보호되는 서버-서버 API — 라우트가 직접 검증한다.
const SELF_AUTH_API = ['/api/replenishment/cron', '/api/replenishment/calculate']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  // PKCE 코드를 세션으로 교환하기 전에는 로그인 세션이 없을 수 있다.
  if ((pathname === '/api/auth/session' && request.method === 'DELETE') || pathname === '/auth/callback' || pathname === '/auth/microsoft' || SELF_AUTH_API.includes(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: authServerFetch },
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 세션 갱신 쿠키가 리다이렉트·오류·rewrite 응답에서도 유실되지 않도록 한다.
  function withAuthCookies(response: NextResponse) {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }
  const redirect = (path: string) => withAuthCookies(NextResponse.redirect(new URL(path, request.url)))
  const reject = (error: string, status: number) => withAuthCookies(NextResponse.json({ error }, { status }))

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError && isTransientAuthFailure(userError) && pathname !== '/login') {
    const response = reject('인증 서버 연결이 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.', 503)
    response.headers.set('Retry-After', '3')
    response.headers.set('Cache-Control', 'no-store')
    return response
  }
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isVendorRoute = pathname === '/vendor' || pathname.startsWith('/vendor/')

  // 로그인 페이지에서 두 방식의 OTP와 로그인 마무리 처리를 공통으로 수행한다.
  if (isLoginPage) return supabaseResponse
  if (!user) {
    if (isApiRoute) return reject('로그인이 필요합니다.', 401)
    if (isVendorRoute) return supabaseResponse
    return redirect('/login')
  }

  let skipOtp = false
  if (requiresAccountSessionCheck(user)) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !await isAccountSessionAllowed(user, sessionData.session,
      request.cookies.get(MICROSOFT_SESSION_COOKIE)?.value)) {
      return isApiRoute
        ? reject(LOGIN_ERROR_MESSAGES.sso_session_required, 401)
        : redirect('/login?error=sso_session_required')
    }
    skipOtp = await canSkipMicrosoftOtp(user, sessionData.session, request.cookies.get(MICROSOFT_SESSION_COOKIE)?.value)
    const renewed = await renewMicrosoftSessionProof(user, sessionData.session, request.cookies.get(MICROSOFT_SESSION_COOKIE)?.value)
    if (renewed) {
      const existingCookies = supabaseResponse.cookies.getAll()
      request.cookies.set(MICROSOFT_SESSION_COOKIE, renewed)
      supabaseResponse = NextResponse.next({ request })
      existingCookies.forEach(cookie => supabaseResponse.cookies.set(cookie))
      supabaseResponse.cookies.set(MICROSOFT_SESSION_COOKIE, renewed, {
        httpOnly: true, sameSite: 'lax', path: '/', maxAge: MICROSOFT_SESSION_COOKIE_MAX_AGE,
        secure: request.nextUrl.protocol === 'https:' || !['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname),
      })
    }

  }

  // SSO로 자동 생성된 Auth 계정만으로는 데이터에 접근할 수 없다.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, brands')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) {
    return isApiRoute
      ? reject(LOGIN_ERROR_MESSAGES.auth_unavailable, 503)
      : redirect('/login?error=auth_unavailable')
  }
  if (!isApprovedRole(profile?.role)) {
    return isApiRoute
      ? reject(LOGIN_ERROR_MESSAGES.not_approved, 403)
      : redirect('/login?error=not_approved')
  }

  // 로그인 화면이 OTP 전에 세션의 계정 유형을 확인하는 읽기 전용 요청.
  if (pathname === '/api/auth/session' && request.method === 'GET') return supabaseResponse

  const { data: aal, error: aalError } = skipOtp
    ? { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null }
    : await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalError || !aal) {
    return isApiRoute
      ? reject(LOGIN_ERROR_MESSAGES.auth_unavailable, 503)
      : redirect('/login?error=auth_unavailable')
  }
  const needStepUp = aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2'
  const needEnroll = process.env.REQUIRE_MFA === 'true' && aal.nextLevel === 'aal1'
  if (needStepUp) {
    return isApiRoute ? reject('인증 앱의 OTP 확인이 필요합니다.', 403) : redirect('/login')
  }
  if (needEnroll) {
    if (isApiRoute && pathname !== '/api/auth/session') {
      return reject('2단계 인증 등록이 필요합니다.', 403)
    }
    const isSecurityPage = pathname === '/settings/security' || pathname.startsWith('/settings/security/')
    if (!isApiRoute && !isSecurityPage) return redirect('/settings/security')
  }

  if (isApiRoute) {
    const url = request.nextUrl
    // 기존에 승인된 사용자의 빈 brands(전체 브랜드) 의미는 유지한다.
    if (url.searchParams.has('brand') && profile.role !== 'admin' &&
        Array.isArray(profile.brands) && profile.brands.length > 0) {
      const allowed: string[] = profile.brands
      const requested = url.searchParams.get('brand')!
      const effective = requested === 'all'
        ? allowed
        : requested.split(',').filter(b => allowed.includes(b))
      if (effective.length === 0) return reject('해당 브랜드 조회 권한이 없습니다.', 403)
      if (effective.join(',') !== requested) {
        const rewritten = url.clone()
        rewritten.searchParams.set('brand', effective.join(','))
        return withAuthCookies(NextResponse.rewrite(rewritten, { request: { headers: request.headers } }))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
