'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { isApprovedRole } from '@/lib/auth-policy'
import { loadBrowserProfile } from '@/lib/browser-profile'
import { getAccountDisplayEmail, getAuthSource } from '@/lib/account-source'

interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'vendor'
  brands: string[]  // [] = 전체 브랜드 접근 (admin)
  vendor_name?: string  // 협력사 사용자의 업체명
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  // 브랜드 필터: admin은 null (전체), 나머지는 배열
  allowedBrands: string[] | null
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  allowedBrands: [],
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    let disposed = false
    let generation = 0
    async function syncUser(account: User | null, preserveOnFailure = false) {
      const current = ++generation
      if (disposed) return
      setUser(account)
      if (!account || (getAuthSource(account) === 'microsoft' && account.app_metadata.microsoft_access_approved !== true)) {
        setProfile(null)
        setLoading(false)
        return
      }
      try {
        const data = await loadBrowserProfile(supabase, account.id)
        if (disposed || current !== generation) return
        const local = localStorage.getItem('bcave_session_token')
        if (data?.session_token && local && data.session_token !== local) {
          await fetch('/api/auth/session', { method: 'DELETE', signal: AbortSignal.timeout(5_000) }).catch(() => {})
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
        setProfile(data && isApprovedRole(data.role)
          ? { ...data, email: getAccountDisplayEmail(account) || data.email } as Profile : null)
      } catch {
        if (!disposed && current === generation && !preserveOnFailure) setProfile(null)
      } finally {
        if (!disposed && current === generation) setLoading(false)
      }
    }

    // INITIAL_SESSION supplies the first session; a separate getSession would
    // duplicate that profile read. Do not await Supabase calls inside its callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => { if (!disposed) void syncUser(session?.user ?? null) })
    })
    const onFocus = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!disposed && session?.user) void syncUser(session.user, true)
      })
    }
    window.addEventListener('focus', onFocus)
    return () => {
      disposed = true
      generation++
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAdmin = profile?.role === 'admin'
  // admin 또는 brands가 비어있으면 전체 접근 (null = 필터 없음)
  const allowedBrands = !profile ? [] : (isAdmin || !profile.brands?.length) ? null : profile.brands

  async function signOut() {
    const isVendor = profile?.role === 'vendor'
    if (typeof window !== 'undefined') localStorage.removeItem('bcave_session_token')
    await fetch('/api/auth/session', { method: 'DELETE', signal: AbortSignal.timeout(5_000) }).catch(() => {})
    await supabase.auth.signOut()
    window.location.href = isVendor ? '/vendor/login' : '/login'
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, allowedBrands, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
