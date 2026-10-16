'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// 릴리즈 버전 — 새 업데이트 공지를 다시 띄우려면 이 값을 올리면 된다.
// (사용자가 '다시 보지 않기'로 저장한 값과 다르면 팝업이 재노출됨)
const RELEASE_VERSION = '2026-10-sso'
const STORAGE_KEY = 'bcave_release_seen'

const SECTIONS = [
  { title: 'Microsoft SSO 로그인으로 전환', items: ['기존 EIS 계정 로그인에서 회사 Microsoft 계정을 사용하는 MS SSO 로그인으로 전환할 예정입니다.'] },
  { title: '로그인 전환 일정 (한국시간 기준)', items: ['2026년 10월 19일까지: 기존 EIS 로그인과 MS SSO 로그인을 병행합니다.', '2026년 10월 20일부터: MS SSO 계정으로만 로그인할 수 있습니다.'] },
  { title: '미리 확인해주세요', items: ['병행 기간 내 로그인 화면의 ‘회사 Microsoft 계정으로 로그인’으로 접속을 확인해주세요.', 'MS SSO 계정의 관리자 승인이나 접근 브랜드 권한이 필요한 경우 관리자에게 문의해주세요.'] },
]

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false)

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
              업데이트 안내
            </p>
            <p className="text-[11px] text-gray-400">
              2026년 10월 업데이트
            </p>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-5">
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
          </div>
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
