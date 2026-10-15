import { cookies } from 'next/headers'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getAuthSource } from '@/lib/account-source'
import { isAccountSessionAllowed, requiresAccountSessionCheck, MICROSOFT_SESSION_COOKIE, canSkipMicrosoftOtp } from '@/lib/microsoft-session'

// user는 같은 클라이언트의 getUser로 검증된 사용자다.
export async function isCurrentAccountSessionAllowed(supabase: SupabaseClient, user: User): Promise<boolean> {
  if (!requiresAccountSessionCheck(user)) return true
  const { data, error } = await supabase.auth.getSession()
  return !error && isAccountSessionAllowed(user, data.session, cookies().get(MICROSOFT_SESSION_COOKIE)?.value)
}

export async function canCurrentAccountSkipOtp(supabase: SupabaseClient, user: User): Promise<boolean> {
  if (getAuthSource(user) !== 'microsoft') return false
  const { data, error } = await supabase.auth.getSession()
  return !error && canSkipMicrosoftOtp(user, data.session, cookies().get(MICROSOFT_SESSION_COOKIE)?.value)
}
