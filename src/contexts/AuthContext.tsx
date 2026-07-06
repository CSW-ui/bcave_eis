'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

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
  allowedBrands: null,
  isAdmin: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name, role, brands, vendor_name')
      .eq('id', userId)
      .single()
    if (data) setProfile(data as Profile)
  }

  // 단일 세션 강제: 다른 기기에서 로그인하면 먼저 접속한 쪽을 로그아웃.
  // session_token 컬럼이 없으면(마이그레이션 전) 조용히 통과한다.
  async function checkSingleSession(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('session_token')
        .eq('id', userId)
        .single()
      if (error || !data) return
      const remote = (data as { session_token?: string }).session_token
      const local = typeof window !== 'undefined'
        ? localStorage.getItem('bcave_session_token')
        : null
      if (remote && local && remote !== local) {
        await supabase.auth.signOut()
        window.location.href = '/login'
      }
    } catch {
      // 컬럼 미생성 등 — 무시
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
        await checkSingleSession(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    // 창이 다시 활성화될 때마다 단일 세션 재확인 (다른 기기 로그인 즉시 감지)
    const onFocus = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) checkSingleSession(session.user.id)
      })
    }
    window.addEventListener('focus', onFocus)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAdmin = profile?.role === 'admin'
  // admin 또는 brands가 비어있으면 전체 접근 (null = 필터 없음)
  const allowedBrands = (isAdmin || !profile?.brands?.length) ? null : profile.brands

  async function signOut() {
    const isVendor = profile?.role === 'vendor'
    if (typeof window !== 'undefined') localStorage.removeItem('bcave_session_token')
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
