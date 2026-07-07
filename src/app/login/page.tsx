'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 2단계 인증(OTP) 단계
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  // 비밀번호 인증 통과 후 공통 마무리: 단일 세션 토큰 발급 + 역할별 리다이렉트
  async function finishLogin(userId: string) {
    try {
      const res = await fetch('/api/auth/session', { method: 'POST' })
      const { sessionToken } = await res.json()
      if (sessionToken) localStorage.setItem('bcave_session_token', sessionToken)
    } catch { /* 무시 */ }
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    window.location.href = prof?.role === 'vendor' ? '/vendor' : '/dashboard'
  }

  // 이미 로그인된 세션이 있으면 역할에 따라 리다이렉트
  // 단, OTP 등록은 했으나 이번 세션 OTP를 안 푼 경우(미완료)는 챌린지 화면을 띄운다.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors()
          const totp = factors?.totp?.find(f => f.status === 'verified')
          if (totp) { setMfaFactorId(totp.id); setMfaStep(true); return }
          // factor는 없는데 세션이 aal2를 요구하는 깨진 상태(인증앱 삭제 등) → 로그아웃하고 일반 로그인
          await supabase.auth.signOut()
          return
        }
      } catch { /* 무시하고 일반 리다이렉트 */ }
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      window.location.href = prof?.role === 'vendor' ? '/vendor' : '/dashboard'
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

      // 2단계 인증 필요 여부 확인 (등록한 사용자만 해당)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find(f => f.status === 'verified')
        if (totp) {
          setMfaFactorId(totp.id)
          setMfaStep(true)
          setLoading(false)
          return // OTP 입력 대기
        }
      }

      await finishLogin(authData.user.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다' : msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaFactorId) return
    setError(null)
    setLoading(true)
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (chErr) throw chErr
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: ch.id, code: mfaCode.trim(),
      })
      if (vErr) { setError('인증번호가 올바르지 않습니다.'); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) await finishLogin(user.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <ReleaseNotesModal />
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-accent mb-4">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">B.cave Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">팀 계정으로 로그인하세요</p>
        </div>

        {mfaStep ? (
          <form onSubmit={handleMfaVerify} className="bg-white rounded-2xl shadow-sm border border-surface-border p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1.5">인증 앱의 6자리 번호</label>
              <input
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoFocus
                className="w-full text-lg tracking-widest text-center border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent"
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading || mfaCode.length !== 6}
              className="w-full text-sm font-medium bg-brand-accent text-white py-2.5 rounded-lg hover:bg-brand-accent-hover disabled:opacity-50 transition-colors">
              {loading ? '확인 중...' : '인증 완료'}
            </button>
          </form>
        ) : (
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
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          계정이 없으신가요? 관리자에게 문의하세요
        </p>
      </div>
    </div>
  )
}
