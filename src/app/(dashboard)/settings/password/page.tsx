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

  // MFA(OTP) 재확인 단계
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)

  // 실제 비밀번호 변경 (AAL2 충족 상태에서 호출)
  async function applyPasswordChange() {
    const { error: updErr } = await supabase.auth.updateUser({ password: next })
    if (updErr) { setError(updErr.message); return false }
    setDone(true)
    setCurrent(''); setNext(''); setConfirm('')
    setMfaStep(false); setMfaCode(''); setMfaFactorId(null)
    return true
  }

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
      // 1) 현재 비밀번호 확인 (재인증) — MFA 계정은 이 시점 세션이 AAL1로 내려감
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current })
      if (signInErr) { setError('현재 비밀번호가 일치하지 않습니다.'); setLoading(false); return }

      // 2) MFA가 켜져 있으면 OTP로 AAL2 승격이 필요
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      const needStepUp = aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2'
      if (needStepUp) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find(f => f.status === 'verified')
        if (totp) {
          setMfaFactorId(totp.id)
          setMfaStep(true)   // OTP 입력 화면 표시
          setLoading(false)
          return
        }
      }

      // 3) MFA 없음 → 바로 변경
      await applyPasswordChange()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!mfaFactorId) return
    setError(null); setLoading(true)
    try {
      // OTP 검증으로 세션을 AAL2로 승격
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (chErr) { setError(chErr.message); setLoading(false); return }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId, challengeId: ch.id, code: mfaCode.trim(),
      })
      if (vErr) { setError('인증번호가 올바르지 않습니다. 다시 시도하세요.'); setLoading(false); return }

      // AAL2 확보 → 비밀번호 변경
      await applyPasswordChange()
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

      {/* MFA(OTP) 재확인 단계 */}
      {mfaStep && !done && (
        <form onSubmit={handleMfaVerify} className="space-y-4">
          <div className="text-sm text-gray-600 bg-gray-50 border border-surface-border rounded-lg p-3">
            보안을 위해 인증 앱의 6자리 코드를 한 번 더 입력해야 비밀번호를 변경할 수 있습니다.
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">인증 앱 6자리 코드</label>
            <input
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              inputMode="numeric"
              autoFocus
              className="w-full text-2xl font-mono tracking-[0.5em] text-center border border-surface-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading || mfaCode.length !== 6}
              className="text-sm bg-brand-accent text-white rounded-lg px-4 py-2.5 font-semibold disabled:opacity-50">
              {loading ? '확인 중...' : '확인 후 변경'}
            </button>
            <button type="button" onClick={() => { setMfaStep(false); setMfaCode(''); setError(null) }}
              className="text-sm border border-surface-border text-gray-600 rounded-lg px-4 py-2.5 hover:bg-gray-50">
              취소
            </button>
          </div>
        </form>
      )}

      {!mfaStep && (
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
      )}
    </div>
  )
}
