import { createBrowserClient, memoryLocalStorageAdapter, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { userStorage: typeof window === 'undefined' ? memoryLocalStorageAdapter() : window.localStorage },
      cookies: {
        encode: 'tokens-only',
        getAll() {
          return typeof document === 'undefined' ? []
            : parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? '' }))
        },
        setAll(values) {
          if (typeof document === 'undefined') return
          values.forEach(({ name, value, options }) => {
            document.cookie = serializeCookieHeader(name, value, options)
          })
        },
      },
    }
  )
}
