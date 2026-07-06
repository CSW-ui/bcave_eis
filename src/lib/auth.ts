/**
 * 서버 전용 인증/인가 헬퍼 (API Route 에서 사용)
 *
 * 미들웨어(src/middleware.ts)가 모든 /api 요청에 대해 "로그인 여부"를 1차로 막지만,
 * 관리자 전용 작업이나 크론 호출처럼 추가 검증이 필요한 라우트는 아래 헬퍼로 2차 검증한다.
 */
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'

export interface AuthedProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'staff' | 'vendor'
  brands: string[]
}

/** 현재 로그인 사용자 + 프로필을 반환. 미로그인이면 null. */
export async function getServerProfile(): Promise<AuthedProfile | null> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // RLS 영향 없이 신뢰 가능한 프로필을 읽기 위해 service-role 클라이언트 사용
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, email, name, role, brands')
    .eq('id', user.id)
    .single()
  if (!data) return null
  return data as AuthedProfile
}

/**
 * 관리자만 통과. 관리자가 아니면 NextResponse(401/403)를 반환한다.
 * 사용법:  const gate = await requireAdmin(); if (gate instanceof NextResponse) return gate
 */
export async function requireAdmin(): Promise<AuthedProfile | NextResponse> {
  const profile = await getServerProfile()
  if (!profile) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }
  if (profile.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }
  return profile
}

/**
 * 서버-서버(크론) 호출용 공유 시크릿 검증.
 * CRON_SECRET 환경변수가 없으면 항상 거부(안전한 기본값).
 */
export function verifyCronSecret(provided: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 시크릿 미설정 시 차단
  return provided === secret
}
