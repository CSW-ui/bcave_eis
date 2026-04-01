'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Bell, LogOut, User, Settings } from 'lucide-react'
import { NAV_CONFIG } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// 부서 메뉴만 추출
const DEPT_ITEMS = NAV_CONFIG.find(s => s.id === 'departments')?.items ?? []
const _ADMIN_ITEMS = NAV_CONFIG.find(s => s.id === 'admin')?.items ?? []

export function TopNav() {
  const pathname = usePathname()
  const { profile, signOut, allowedBrands: _allowedBrands, isAdmin } = useAuth()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [userOpen, setUserOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => { setOpenMenu(null) }, [pathname])

  const initials = profile?.name
    ? profile.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'BC'

  return (
    <header className="h-12 flex items-center bg-white border-b border-surface-border sticky top-0 z-40 px-4">
      {/* 로고 */}
      <Link href="/dashboard" className="flex items-center gap-2 mr-6 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-accent flex items-center justify-center">
          <span className="text-white text-xs font-black">B</span>
        </div>
        <span className="text-sm font-bold text-gray-900 hidden sm:block">B.cave</span>
      </Link>

      {/* 메인 네비 */}
      <nav ref={navRef} className="flex items-center gap-1 flex-1">
        {/* 대시보드 (직접 링크) */}
        <Link href="/dashboard"
          className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            pathname === '/dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')}>
          대시보드
        </Link>

        {/* 부서 드롭다운 메뉴 */}
        {DEPT_ITEMS.map(dept => {
          const isActive = pathname.startsWith(dept.href) || dept.children?.some(c => pathname.startsWith(c.href))
          const isOpen = openMenu === dept.label
          return (
            <div key={dept.label} className="relative">
              <button
                onClick={() => setOpenMenu(isOpen ? null : dept.label)}
                className={cn('flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')}>
                {dept.icon && <dept.icon size={14} />}
                {dept.label}
                <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
              </button>

              {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-surface-border py-1 z-50">
                  {dept.children?.map(child => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <div key={child.href}>
                        <Link href={child.href}
                          className={cn('flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                            childActive ? 'bg-brand-accent-light text-brand-accent font-medium' : 'text-gray-600 hover:bg-surface-subtle')}>
                          {child.icon && <child.icon size={13} className="shrink-0" />}
                          {child.label}
                        </Link>
                        {/* 3단계 메뉴 (디지털 마케팅 등) */}
                        {child.children && (
                          <div className="pl-6 border-l border-surface-border ml-3">
                            {child.children.map(sub => (
                              <Link key={sub.href} href={sub.href}
                                className={cn('flex items-center gap-2 px-2 py-1.5 text-[11px] transition-colors',
                                  pathname === sub.href ? 'text-brand-accent font-medium' : 'text-gray-400 hover:text-gray-700')}>
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* 관리자 */}
        <Link href="/admin"
          className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            pathname === '/admin' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50')}>
          <Settings size={14} />
        </Link>
      </nav>

      {/* 우측 액션 */}
      <div className="flex items-center gap-1 shrink-0">
        <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-surface-subtle rounded-lg transition-all relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-accent rounded-full" />
        </button>

        {/* 유저 */}
        <div ref={userRef} className="relative">
          <button onClick={() => setUserOpen(v => !v)}
            className="flex items-center gap-2 hover:bg-surface-subtle rounded-lg px-2 py-1 transition-all">
            <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            {profile && (
              <span className="hidden sm:block text-xs font-medium text-gray-700">{profile.name}</span>
            )}
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-surface-border py-1 z-50">
              {profile && (
                <div className="px-3 py-2 border-b border-surface-border">
                  <p className="text-xs font-semibold text-gray-800">{profile.name}</p>
                  <p className="text-[10px] text-gray-400">{profile.email}</p>
                  <span className={cn('inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded font-medium',
                    isAdmin ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600')}>
                    {profile.role === 'admin' ? '어드민' : profile.role === 'manager' ? '매니저' : '스태프'}
                  </span>
                </div>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-surface-subtle" onClick={() => setUserOpen(false)}>
                <User size={12} /> 프로필 설정
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50" onClick={signOut}>
                <LogOut size={12} /> 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
