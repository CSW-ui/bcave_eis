'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal'
import { isApprovedRole, LOGIN_ERROR_MESSAGES } from '@/lib/auth-policy'
import { getAuthSource } from '@/lib/account-source'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialCheckStarted = useRef(false)
  const ssoEnabled = process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED === 'true'
  // 2단계 인증(OTP) 단계
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  // 비밀번호와 Microsoft 인증의 공통 마무리: 서버 권한 확인 + 단일 세션 + 감사 로그.
  async function finishLogin() {
    const res = await fetch('/api/auth/session', { method: 'POST', signal: AbortSignal.timeout(15_000) })
    const result = await res.json()
    if (!res.ok || typeof result.sessionToken !== 'string') {
      throw new Error(typeof result.error === 'string' ? result.error : '로그인을 완료하지 못했습니다. 다시 시도해주세요.')
    }
    localStorage.setItem('bcave_session_token', result.sessionToken)
    const destination = ['/dashboard', '/vendor', '/settings/security'].includes(result.redirectTo)
      ? result.redirectTo : '/dashboard'
    window.location.replace(destination)
  }

  async function continueLogin(userId: string, complete: boolean) {
    const sessionCheck = await fetch('/api/auth/session', { cache: 'no-store' })
    const sessionStatus = await sessionCheck.json()
    if (!sessionCheck.ok) {
      if (sessionCheck.status === 401 || sessionCheck.status === 403) {
        await supabase.auth.signOut({ scope: 'local' })
        localStorage.removeItem('bcave_session_token')
      }
      throw new Error(typeof sessionStatus.error === 'string' ? sessionStatus.error : LOGIN_ERROR_MESSAGES.sso_session_required)
    }
    const role = sessionStatus.role
    if (!isApprovedRole(role)) throw new Error(LOGIN_ERROR_MESSAGES.not_approved)

    const { data: aal, error: aalError } = sessionStatus.skipOtp === true
      ? { data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null }
      : await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalError || !aal) throw new Error(LOGIN_ERROR_MESSAGES.auth_unavailable)
    if (aal.currentLevel !== 'aal2' && aal.nextLevel === 'aal2') {
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors()
      if (factorError) throw new Error(LOGIN_ERROR_MESSAGES.auth_unavailable)
      const totp = factors?.totp?.find(f => f.status === 'verified')
      if (!totp) {
        await supabase.auth.signOut()
        throw new Error('인증 수단을 확인할 수 없습니다. 관리자에게 문의해주세요.')
      }
      setMfaFactorId(totp.id)
      setMfaStep(true)
      return
    }

    if (complete) await finishLogin()
    else window.location.replace(role === 'vendor' ? '/vendor' : '/dashboard')
  }

  // 이미 로그인된 세션이 있으면 역할에 따라 리다이렉트
  // 단, OTP 등록은 했으나 이번 세션 OTP를 안 푼 경우(미완료)는 챌린지 화면을 띄운다.
  useEffect(() => {
    // 개발 모드의 effect 재실행도 로그인 이벤트를 두 번 기록하지 않도록 한다.
    if (initialCheckStarted.current) return
    initialCheckStarted.current = true
    const params = new URLSearchParams(window.location.search)
    const errorCode = params.get('error')
    const complete = params.get('auth_complete') === '1'
    // 완료 전에 새로고침해도 세션 토큰·감사 로그 발급을 다시 시도할 수 있도록 marker를 유지한다.
    if (errorCode) window.history.replaceState(null, '', '/login')
    if (errorCode) {
      const message = LOGIN_ERROR_MESSAGES[errorCode]
      setError(typeof message === 'string' ? message : LOGIN_ERROR_MESSAGES.sso_failed)
      setLoading(false)
      return
    }

    async function resumeLogin() {
      try {
        // The callback already established a server-verified Microsoft session.
        // Complete it through the protected server endpoint without repeating
        // browser-to-Supabase user/profile requests.
        if (complete) { await finishLogin(); return }
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await continueLogin(user.id, complete)
        else if (complete) setError(LOGIN_ERROR_MESSAGES.sso_failed)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : LOGIN_ERROR_MESSAGES.auth_unavailable)
      } finally {
        setLoading(false)
      }
    }
    void resumeLogin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (getAuthSource(authData.user) === 'microsoft') {
        await supabase.auth.signOut({ scope: 'local' })
        throw new Error(LOGIN_ERROR_MESSAGES.sso_session_required)
      }

      await continueLogin(authData.user.id, true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다' : msg)
    } finally {
      setLoading(false)
    }
  }

  function handleMicrosoftLogin() {
    setError(null)
    setSsoLoading(true)
    window.location.assign('/auth/microsoft')
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
      if (!user) throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.')
      await finishLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
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
            {error && <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
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
            <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || ssoLoading}
            className="w-full text-sm font-medium bg-brand-accent text-white py-2.5 rounded-lg hover:bg-brand-accent-hover disabled:opacity-50 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
          {ssoEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="h-px flex-1 bg-surface-border" />
                <span>또는</span>
                <span className="h-px flex-1 bg-surface-border" />
              </div>
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading || ssoLoading}
                className="w-full flex items-center justify-center gap-2.5 text-sm font-medium border border-surface-border text-gray-700 bg-white py-2.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#f25022" d="M0 0h8.5v8.5H0z" />
                  <path fill="#7fba00" d="M9.5 0H18v8.5H9.5z" />
                  <path fill="#00a4ef" d="M0 9.5h8.5V18H0z" />
                  <path fill="#ffb900" d="M9.5 9.5H18V18H9.5z" />
                </svg>
                {ssoLoading ? 'Microsoft로 이동 중...' : '회사 Microsoft 계정으로 로그인'}
              </button>
            </>
          )}
        </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          계정이 없으신가요? 관리자에게 문의하세요
        </p>
      </div>
    </div>
  )
}
