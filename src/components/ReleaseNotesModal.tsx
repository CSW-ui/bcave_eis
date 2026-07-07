'use client'

import { useEffect, useState } from 'react'
import { X, ArrowLeft } from 'lucide-react'

// 릴리즈 버전 — 새 업데이트 공지를 다시 띄우려면 이 값을 올리면 된다.
// (사용자가 '다시 보지 않기'로 저장한 값과 다르면 팝업이 재노출됨)
const RELEASE_VERSION = '2026-07'
const STORAGE_KEY = 'bcave_release_seen'

// Google Authenticator 아이콘 (인라인 SVG) — OTP 관련만 아이콘 유지
function AuthenticatorIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect width="48" height="48" rx="11" fill="#F1F3F4" />
      <g transform="translate(24 24)">
        {[
          { r: 0, c: '#4285F4' }, { r: 60, c: '#34A853' }, { r: 120, c: '#FBBC04' },
          { r: 180, c: '#EA4335' }, { r: 240, c: '#24C1E0' }, { r: 300, c: '#AB47BC' },
        ].map(({ r, c }) => (
          <rect key={r} x="-2.4" y="-13" width="4.8" height="12" rx="2.4" fill={c} transform={`rotate(${r})`} />
        ))}
        <circle r="3.2" fill="#5F6368" />
      </g>
    </svg>
  )
}

const SECTIONS = [
  { title: '신규 기능', items: ['목표 진도율 · 동업계 비교 · 카테고리 주간 추이 분석', '채널 × 품목 주간 실적 페이지'] },
  { title: '보안', items: ['2단계 인증(OTP) 도입', '관리자 MFA 초기화 · 단일 세션 강제 · 로그인 기록'] },
  { title: 'UI/UX', items: ['대시보드 로딩 스켈레톤 UI 적용 · 초기 로딩 속도 개선', '2단계 인증 화면 추가'] },
]

const GUIDE_STEPS = [
  { title: '인증 앱 설치', desc: '아래 스토어에서 Google Authenticator(구글 OTP)를 설치합니다.' },
  { title: 'QR 코드 스캔', desc: "앱에서 '+' → 'QR 코드 스캔'으로 2단계 인증 등록 화면의 QR을 비춥니다." },
  { title: '6자리 코드 입력', desc: '앱에 표시된 6자리 숫자를 입력하면 등록이 완료됩니다.' },
  { title: '로그인 시 사용', desc: '이후 로그인마다 앱의 6자리 코드를 입력합니다. (30초마다 갱신)' },
]

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'notes' | 'guide'>('notes')

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== RELEASE_VERSION) setOpen(true)
    } catch { /* 무시 */ }
  }, [])

  if (!open) return null

  const close = () => setOpen(false)
  const dontShowAgain = () => {
    try { localStorage.setItem(STORAGE_KEY, RELEASE_VERSION) } catch { /* 무시 */ }
    setOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <p className="text-sm font-bold text-gray-900">
              {view === 'notes' ? '업데이트 안내' : '인증 앱(OTP) 설치 안내'}
            </p>
            <p className="text-[11px] text-gray-400">
              {view === 'notes' ? '2026년 7월 업데이트' : '2단계 인증 설정 방법'}
            </p>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">
          {view === 'notes' ? (
            <div className="space-y-4">
              {SECTIONS.map(s => (
                <div key={s.title}>
                  <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                  <ul className="mt-1 space-y-1">
                    {s.items.map((it, i) => (
                      <li key={i} className="text-xs text-gray-500 leading-relaxed flex gap-1.5">
                        <span className="text-gray-300">·</span>{it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* OTP 가이드 링크 */}
              <button onClick={() => setView('guide')}
                className="w-full flex items-center gap-3 bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-4 py-3 hover:bg-brand-accent/10 hover:border-brand-accent/40 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-white border border-surface-border flex items-center justify-center shrink-0">
                  <AuthenticatorIcon size={24} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-800">2단계 인증(OTP)이 처음이신가요?</p>
                  <p className="text-xs text-gray-500 mt-0.5">인증 앱 설치·사용법 안내 보기</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <button onClick={() => setView('notes')}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                <ArrowLeft size={14} /> 업데이트 내용으로 돌아가기
              </button>

              <p className="text-xs text-gray-500 leading-relaxed">
                2단계 인증을 사용하려면 휴대폰에 인증 앱이 필요합니다. 아래 순서대로 설치·등록하세요.
              </p>

              {/* 스토어 링크 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a href="https://apps.apple.com/kr/app/google-authenticator/id388497605"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-white rounded-xl border border-surface-border p-3 hover:border-brand-accent/50 transition-colors">
                  <AuthenticatorIcon size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">iPhone · iPad</p>
                    <p className="text-xs font-semibold text-gray-900">App Store 설치</p>
                  </div>
                </a>
                <a href="https://play.google.com/store/search?q=google%20authenticator&c=apps&hl=ko"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 bg-white rounded-xl border border-surface-border p-3 hover:border-brand-accent/50 transition-colors">
                  <AuthenticatorIcon size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 font-medium uppercase">Android</p>
                    <p className="text-xs font-semibold text-gray-900">Play 스토어 설치</p>
                  </div>
                </a>
              </div>

              {/* 사용법 */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">간단 사용법</p>
                <div className="bg-white rounded-xl border border-surface-border divide-y divide-surface-border">
                  {GUIDE_STEPS.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent text-[11px] font-bold shrink-0">{i + 1}</div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-800">{s.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 분실 안내 */}
              <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed">
                <span className="font-medium text-gray-700">휴대폰을 바꾸거나 앱을 지웠나요?</span> 인증 앱을 잃어버리면
                로그인할 수 없습니다. 이 경우 관리자에게 <span className="font-medium text-gray-700">2단계 인증 초기화</span>를
                요청하면 새로 등록할 수 있습니다.
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-surface-border bg-gray-50/50">
          <button onClick={dontShowAgain} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            다시 보지 않기
          </button>
          <button onClick={close}
            className="text-sm font-semibold text-white bg-brand-accent hover:bg-brand-accent-hover px-5 py-2 rounded-lg transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
