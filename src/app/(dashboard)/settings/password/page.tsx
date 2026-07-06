'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/contexts/AuthContext'

const MIN_LEN = 10 // 비밀번호 정책과 동일하게 유지

export default function PasswordSettingsPage() {
  const supabase = createSupabaseBrowserClient()
  const { user, profile } = useAuth()
  const email = user?.email ?? profile?.email ?? ''

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next.length < MIN_LEN) { setError(`새 비밀번호는 ${MIN_LEN}자 이상이어야 합니다.`); return }
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) { setError('새 비밀번호에 영문과 숫자를 모두 포함하세요.'); return }
    if (next !== confirm) { setError('새 비밀번호와 확인이 일치하지 않습니다.'); return }
    if (next === current) { setError('새 비밀번호가 현재 비밀번호와 같습니다.'); return }
    if (!email) { setError('로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요.'); return }

    setLoading(true)
    try {
      // 1) 현재 비밀번호 확인 (재인증)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current })
      if (signInErr) { setError('현재 비밀번호가 일치하지 않습니다.'); setLoading(false); return }

      // 2) 새 비밀번호로 변경
      const { error: updErr } = await supabase.auth.updateUser({ password: next })
      if (updErr) { setError(updErr.message); setLoading(false); return }

      setDone(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-1">비밀번호 변경</h1>
      <p className="text-sm text-gray-500 mb-6">{email}</p>

      {done && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">
          ✓ 비밀번호가 변경되었습니다.
        </div>
      )}
      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">현재 비밀번호</label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">새 비밀번호 (10자 이상, 영문+숫자)</label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)} required
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">새 비밀번호 확인</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
            className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent" />
        </div>
        <button type="submit" disabled={loading}
          className="text-sm bg-brand-accent text-white rounded-lg px-4 py-2.5 font-semibold disabled:opacity-50">
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  )
}
