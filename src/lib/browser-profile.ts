import type { SupabaseClient } from '@supabase/supabase-js'
import { createInFlightLoader } from '@/lib/in-flight'

const loaders = new WeakMap<SupabaseClient, ReturnType<typeof createInFlightLoader>>()
const fields = 'id, email, name, role, brands, vendor_name'

export function loadBrowserProfile(client: SupabaseClient, userId: string) {
  let load = loaders.get(client)
  if (!load) { load = createInFlightLoader(); loaders.set(client, load) }
  return load(userId, async () => {
    const result = await client.from('profiles').select(`${fields}, session_token`).eq('id', userId).single()
    // Older databases may not have the optional single-session column yet.
    if (result.error?.code === '42703' || result.error?.code === 'PGRST204') {
      const fallback = await client.from('profiles').select(fields).eq('id', userId).single()
      if (fallback.error) throw fallback.error
      return fallback.data ? { ...fallback.data, session_token: undefined } : null
    }
    if (result.error) throw result.error
    return result.data
  })
}
