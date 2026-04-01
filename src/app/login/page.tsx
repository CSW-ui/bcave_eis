'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  // 이미 로그인된 세션이 있으면 역할에 따라 리다이렉트
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        window.location.href = prof?.role === 'vendor' ? '/vendor' : '/dashboard'
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // 프로필 조회하여 vendor면 /vendor로 리다이렉트
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()
      window.location.href = prof?.role === 'vendor' ? '/vendor' : '/dashboard'
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-accent mb-4">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">B.cave Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">팀 계정으로 로그인하세요</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-surface-border p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@bcave.com"
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-medium bg-brand-accent text-white py-2.5 rounded-lg hover:bg-brand-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          계정이 없으신가요? 관리자에게 문의하세요
        </p>
      </div>
    </div>
  )
}
