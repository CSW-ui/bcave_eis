'use client'

import Link from 'next/link'
import { ArrowLeft, Smartphone, QrCode, KeyRound, ShieldCheck, ExternalLink } from 'lucide-react'

// Google Authenticator 아이콘 (인라인 SVG — 외부 이미지 의존 없음)
function AuthenticatorIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="11" fill="#F1F3F4" />
      <g transform="translate(24 24)">
        {[
          { r: 0, c: '#4285F4' },
          { r: 60, c: '#34A853' },
          { r: 120, c: '#FBBC04' },
          { r: 180, c: '#EA4335' },
          { r: 240, c: '#24C1E0' },
          { r: 300, c: '#AB47BC' },
        ].map(({ r, c }) => (
          <rect key={r} x="-2.4" y="-13" width="4.8" height="12" rx="2.4" fill={c} transform={`rotate(${r})`} />
        ))}
        <circle r="3.2" fill="#5F6368" />
      </g>
    </svg>
  )
}

const STEPS = [
  { icon: Smartphone, title: '인증 앱 설치', desc: '아래 스토어에서 Google Authenticator(구글 OTP)를 설치합니다.' },
  { icon: QrCode, title: 'QR 코드 스캔', desc: "앱에서 '+' → 'QR 코드 스캔'을 눌러 2단계 인증 등록 화면의 QR을 비춥니다." },
  { icon: KeyRound, title: '6자리 코드 입력', desc: '앱에 표시된 6자리 숫자를 등록 화면에 입력하면 등록이 완료됩니다.' },
  { icon: ShieldCheck, title: '로그인 시 사용', desc: '이후 로그인할 때마다 앱에 표시되는 6자리 코드를 입력합니다. (코드는 30초마다 갱신)' },
]

export default function SecurityGuidePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* 뒤로 */}
      <Link href="/settings/security"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-4 transition-colors">
        <ArrowLeft size={14} /> 2단계 인증 등록으로 돌아가기
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-1">인증 앱(OTP) 설치 안내</h1>
      <p className="text-sm text-gray-500 mb-6">
        2단계 인증을 사용하려면 휴대폰에 인증 앱이 필요합니다. 아래 순서대로 설치·등록하세요.
      </p>

      {/* 앱 설치 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {/* iOS */}
        <a href="https://apps.apple.com/kr/app/google-authenticator/id388497605"
          target="_blank" rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-white rounded-xl border border-surface-border shadow-sm p-4 hover:border-brand-accent/50 hover:shadow-md transition-all">
          <AuthenticatorIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">iPhone · iPad</p>
            <p className="text-sm font-semibold text-gray-900">App Store에서 설치</p>
            <p className="text-[11px] text-gray-400">Google Authenticator</p>
          </div>
          <ExternalLink size={15} className="text-gray-300 group-hover:text-brand-accent transition-colors shrink-0" />
        </a>

        {/* Android */}
        <a href="https://play.google.com/store/search?q=google%20authenticator&c=apps&hl=ko"
          target="_blank" rel="noopener noreferrer"
          className="group flex items-center gap-3 bg-white rounded-xl border border-surface-border shadow-sm p-4 hover:border-brand-accent/50 hover:shadow-md transition-all">
          <AuthenticatorIcon />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Android</p>
            <p className="text-sm font-semibold text-gray-900">Play 스토어에서 설치</p>
            <p className="text-[11px] text-gray-400">Google OTP</p>
          </div>
          <ExternalLink size={15} className="text-gray-300 group-hover:text-brand-accent transition-colors shrink-0" />
        </a>
      </div>

      {/* 사용법 */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">간단 사용법</h2>
      <div className="bg-white rounded-xl border border-surface-border shadow-sm divide-y divide-surface-border mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-start gap-3 p-4">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold shrink-0">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <s.icon size={14} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-6 leading-relaxed">
        <span className="font-medium text-gray-700">휴대폰을 바꾸거나 앱을 지웠나요?</span> 인증 앱을 잃어버리면
        로그인할 수 없습니다. 이 경우 관리자에게 <span className="font-medium text-gray-700">2단계 인증 초기화</span>를
        요청하면 새로 등록할 수 있습니다.
      </div>

      <Link href="/settings/security"
        className="inline-flex items-center gap-1.5 text-sm bg-brand-accent text-white rounded-lg px-4 py-2.5 font-semibold hover:opacity-90 transition-opacity">
        <ShieldCheck size={15} /> 2단계 인증 등록하러 가기
      </Link>
    </div>
  )
}
