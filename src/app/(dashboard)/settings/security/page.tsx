'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HelpCircle, ShieldCheck, ShieldAlert, QrCode, Copy, Check, X, ChevronRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'

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
  const [copied, setCopied] = useState(false)

  async function copySecret() {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* 클립보드 미지원 시 무시 */ }
  }

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
    // 이전에 완료(verified)되지 않은 factor가 남아 있으면 정리한다.
    // (friendlyName "" 중복으로 인한 'already exists' 오류 방지)
    const { data: existing } = await supabase.auth.mfa.listFactors()
    for (const f of existing?.totp ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    // 고유 friendlyName 부여 (빈 이름 충돌 원천 차단)
    const friendlyName = `otp-${Date.now()}`
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
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
    <div className="p-6 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-brand-accent/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="text-brand-accent" size={22} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">2단계 인증 (OTP)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            비밀번호가 유출되어도 휴대폰 인증번호가 없으면 로그인할 수 없게 보호합니다.
          </p>
        </div>
      </div>

      {/* 알림 */}
      {error && <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3"><ShieldAlert size={16} className="shrink-0" />{error}</div>}
      {msg && <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3"><Check size={16} className="shrink-0" />{msg}</div>}

      {/* 메인 카드 */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-sm overflow-hidden">
        {/* 상태 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className={cn('w-2.5 h-2.5 rounded-full', hasFactor ? 'bg-emerald-500' : 'bg-gray-300')} />
            <div>
              <p className="text-sm font-semibold text-gray-800">보호 상태</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {hasFactor ? '인증 앱이 등록되어 있습니다' : '아직 인증 앱이 등록되지 않았습니다'}
              </p>
            </div>
          </div>
          <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full',
            hasFactor ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
            {hasFactor ? '켜짐' : '꺼짐'}
          </span>
        </div>

        {/* 본문 */}
        <div className="p-5">
          {/* 등록 완료 상태 */}
          {hasFactor && !enrolling && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">2단계 인증이 켜져 있습니다.</p>
                  <p className="text-xs text-emerald-700/80 mt-0.5">로그인할 때마다 인증 앱의 6자리 코드가 필요합니다.</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">휴대폰을 교체했다면 해제 후 다시 등록하세요.</span>
                <button onClick={unenroll}
                  className="inline-flex items-center gap-1.5 text-sm border border-red-200 text-red-600 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors">
                  <X size={14} /> 2단계 인증 해제
                </button>
              </div>
            </div>
          )}

          {/* 미등록 상태 */}
          {!hasFactor && !enrolling && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <QrCode size={26} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-800">인증 앱으로 계정을 보호하세요</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Google Authenticator 같은 인증 앱을 등록하면, 비밀번호가 노출돼도 타인이 로그인할 수 없습니다.
              </p>
              <button onClick={startEnroll}
                className="mt-5 inline-flex items-center gap-1.5 text-sm bg-brand-accent text-white rounded-lg px-5 py-2.5 font-semibold hover:opacity-90 transition-opacity">
                <ShieldCheck size={15} /> 2단계 인증 등록하기
              </button>
            </div>
          )}

          {/* 등록 진행 (QR + 코드) */}
          {enrolling && (
            <div className="grid sm:grid-cols-2 gap-5">
              {/* QR */}
              <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-surface-border p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {qr && <img src={qr} alt="OTP QR" className="w-44 h-44 rounded-lg bg-white p-2 border border-surface-border" />}
                <p className="text-[11px] text-gray-400 mt-3 text-center">
                  ① 인증 앱에서 이 QR을 스캔하세요
                </p>
              </div>

              {/* 수동 키 + 코드 입력 */}
              <div className="space-y-4">
                {secret && (
                  <div>
                    <label className="text-[11px] text-gray-500 font-medium">QR 스캔이 안 되면 수동 입력 키</label>
                    <div className="mt-1 flex items-center gap-1.5">
                      <code className="flex-1 font-mono text-xs text-gray-700 bg-gray-50 border border-surface-border rounded-lg px-2.5 py-2 break-all">{secret}</code>
                      <button onClick={copySecret} title="복사"
                        className="shrink-0 p-2 rounded-lg border border-surface-border text-gray-400 hover:text-brand-accent hover:border-brand-accent/40 transition-colors">
                        {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-gray-500 font-medium">② 앱에 표시된 6자리 숫자</label>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    inputMode="numeric"
                    autoFocus
                    className="w-full mt-1 text-2xl font-mono tracking-[0.5em] border border-surface-border rounded-lg px-3 py-2.5 text-center focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={confirmEnroll} disabled={code.length !== 6}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-brand-accent text-white rounded-lg px-4 py-2.5 font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity">
                    <Check size={15} /> 등록 완료
                  </button>
                  <button onClick={() => { setEnrolling(false); setQr(null) }}
                    className="text-sm border border-surface-border text-gray-600 rounded-lg px-4 py-2.5 hover:bg-gray-50 transition-colors">취소</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 도움말 배너 */}
      <Link href="/settings/security/guide"
        className="group mt-4 flex items-center gap-3 bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-4 py-3 hover:bg-brand-accent/10 hover:border-brand-accent/40 transition-colors">
        <div className="w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center shrink-0">
          <HelpCircle size={18} className="text-brand-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">인증 앱이 처음이신가요?</p>
          <p className="text-xs text-gray-500 mt-0.5">Google Authenticator 설치부터 사용법까지 안내해 드립니다.</p>
        </div>
        <ChevronRight size={18} className="text-brand-accent/60 group-hover:text-brand-accent group-hover:translate-x-0.5 transition-all shrink-0" />
      </Link>
    </div>
  )
}
