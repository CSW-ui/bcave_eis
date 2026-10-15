import { authServerFetch } from '@/lib/auth-network'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: authServerFetch },
      cookies: {
        // 사용자 객체는 중복 전송하지 않고 토큰만 쿠키에 저장한다.
        encode: 'tokens-only',
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 쿠키 설정 무시
          }
        },
      },
    }
  )
}
