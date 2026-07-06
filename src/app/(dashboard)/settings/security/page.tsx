'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// 2단계 인증(OTP) 등록/해제 페이지
// Google Authenticator, Microsoft Authenticator 등 TOTP 앱 사용
export default function SecuritySettingsPage() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [hasFactor, setHasFactor] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = (data?.totp ?? []).filter(f => f.status === 'verified')
    setHasFactor(verified.length > 0)
    setLoading(false)
  }

  useEffect(() => { refresh() /* eslint-disable-next-line */ }, [])

  async function startEnroll() {
    setError(null); setMsg(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) { setError(error.message); return }
    setFactorId(data.id)
    setQr(data.totp.qr_code)      // SVG data URI
    setSecret(data.totp.secret)   // 수동 입력용 시크릿
    setEnrolling(true)
  }

  async function confirmEnroll() {
    if (!factorId) return
    setError(null)
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
    if (chErr) { setError(chErr.message); return }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId, challengeId: ch.id, code: code.trim(),
    })
    if (vErr) { setError('인증번호가 올바르지 않습니다. 다시 시도하세요.'); return }
    setEnrolling(false); setQr(null); setSecret(null); setCode('')
    setMsg('2단계 인증이 등록되었습니다. 다음 로그인부터 적용됩니다.')
    refresh()
  }

  async function unenroll() {
    setError(null); setMsg(null)
    const { data } = await supabase.auth.mfa.listFactors()
    for (const f of data?.totp ?? []) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    setMsg('2단계 인증이 해제되었습니다.')
    refresh()
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">불러오는 중…</div>

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-bold text-gray-900 mb-1">2단계 인증 (OTP)</h1>
      <p className="text-sm text-gray-500 mb-6">
        비밀번호가 유출되어도 휴대폰 인증번호가 없으면 로그인할 수 없게 보호합니다.
      </p>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}
      {msg && <div className="mb-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">{msg}</div>}

      {hasFactor && !enrolling && (
        <div className="space-y-4">
          <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
            ✓ 2단계 인증이 켜져 있습니다.
          </div>
          <button onClick={unenroll}
            className="text-sm border border-red-200 text-red-600 rounded-lg px-4 py-2 hover:bg-red-50">
            2단계 인증 해제
          </button>
        </div>
      )}

      {!hasFactor && !enrolling && (
        <button onClick={startEnroll}
          className="text-sm bg-brand-accent text-white rounded-lg px-4 py-2.5 font-semibold">
          2단계 인증 등록하기
        </button>
      )}

      {enrolling && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            1) 휴대폰 인증 앱(Google Authenticator 등)으로 아래 QR을 스캔하세요.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="OTP QR" className="w-44 h-44 border rounded-lg" />}
          {secret && (
            <p className="text-xs text-gray-500">
              QR 스캔이 안 되면 수동 입력 키: <code className="font-mono">{secret}</code>
            </p>
          )}
          <p className="text-sm text-gray-700">2) 앱에 표시된 6자리 숫자를 입력하세요.</p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            inputMode="numeric"
            className="w-40 text-lg tracking-widest border rounded-lg px-3 py-2 text-center"
          />
          <div className="flex gap-2">
            <button onClick={confirmEnroll} disabled={code.length !== 6}
              className="text-sm bg-brand-accent text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-40">
              등록 완료
            </button>
            <button onClick={() => { setEnrolling(false); setQr(null) }}
              className="text-sm border rounded-lg px-4 py-2">취소</button>
          </div>
        </div>
      )}
    </div>
  )
}
