'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function LayoutSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="h-7 w-40 bg-gray-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-white border border-surface-border rounded-xl shadow-sm p-4">
            <div className="h-2.5 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mt-2" />
            <div className="h-2 w-24 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 h-64 bg-white border border-surface-border rounded-xl shadow-sm p-4">
          <div className="h-full flex items-end gap-2 pb-4">
            {[46, 62, 54, 70, 50, 66, 56, 72, 52, 68, 58, 64].map((h, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-t animate-pulse" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="h-64 bg-white border border-surface-border rounded-xl shadow-sm p-4 space-y-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-gray-200 rounded" />
                <div className="h-3.5 w-10 bg-gray-200 rounded" />
              </div>
              <div className="h-2.5 w-full bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile?.role === 'vendor') {
      router.replace('/vendor')
    }
  }, [loading, profile, router])

  // vendor는 전용 화면으로 리다이렉트되므로 렌더하지 않음
  if (profile?.role === 'vendor') return null

  // 인증 로딩 중에도 프레임(TopNav)과 스켈레톤을 즉시 보여준다 (백지 방지)
  return (
    <div className="min-h-screen bg-surface-subtle">
      <TopNav />
      <main className="px-4 py-3">{loading ? <LayoutSkeleton /> : children}</main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardGuard>{children}</DashboardGuard>
    </AuthProvider>
  )
}
