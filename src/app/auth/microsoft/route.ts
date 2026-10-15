import { NextResponse } from 'next/server'
import { resolveAuthRequestOrigin, logAuthOriginRejection } from '@/lib/auth-urls'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { MICROSOFT_SESSION_COOKIE } from '@/lib/microsoft-session'
import {
  createMicrosoftAuthRequest,
  MICROSOFT_TRANSACTION_COOKIE,
  MICROSOFT_TRANSACTION_TTL_SECONDS,
} from '@/lib/microsoft-auth'

export async function GET(request: Request) {
  let origin: string | null
  try { origin = resolveAuthRequestOrigin(request) } catch { origin = null }
  if (!origin) {
    logAuthOriginRejection(request)
    return new NextResponse('Invalid authentication origin', { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const failure = () => NextResponse.redirect(new URL('/login?error=sso_disabled', origin))
  if (process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED !== 'true') return failure()

  try {
    const { authorizationUrl, transactionCookie } = createMicrosoftAuthRequest(origin)
    // 계정 유형을 전환할 때 기존 EIS/MS 세션을 이어서 사용하지 않는다.
    const signedOut = await createSupabaseServerClient().auth.signOut({ scope: 'local' })
    if (signedOut.error) return failure()
    const response = NextResponse.redirect(authorizationUrl)
    response.headers.set('Cache-Control', 'no-store')
    response.cookies.set(MICROSOFT_TRANSACTION_COOKIE, transactionCookie, {
      httpOnly: true,
      secure: origin.startsWith('https:'),
      sameSite: 'lax',
      path: '/auth',
      maxAge: MICROSOFT_TRANSACTION_TTL_SECONDS,
    })
    response.cookies.set(MICROSOFT_SESSION_COOKIE, '', {
      httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'lax', path: '/', maxAge: 0,
    })
    return response
  } catch {
    return failure()
  }
}
