'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TopNav } from '@/components/layout/TopNav'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile?.role === 'vendor') {
      router.replace('/vendor')
    }
  }, [loading, profile, router])

  if (loading || profile?.role === 'vendor') return null

  return (
    <div className="min-h-screen bg-surface-subtle">
      <TopNav />
      <main className="px-4 py-3">{children}</main>
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
