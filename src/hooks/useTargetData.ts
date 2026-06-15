'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'

export interface MonthlyTarget {
  yyyymm: string   // e.g. "202603"
  brandnm: string
  target: number
  shoptypenm?: string  // optional: 매장형태/채널
  shopcd?: string      // optional: 매장코드 (점당 목표)
}

// 점별 + 채널 단위 row 중복 방지:
// 같은 (brandnm, shoptypenm, yyyymm) 키에 점별 row가 있으면 채널 row는 제외 (점별의 합 = 채널 합이라 중복)
function dedupeTargets(raw: MonthlyTarget[]): MonthlyTarget[] {
  const shopRows = raw.filter(t => t.shopcd)
  const covered = new Set(shopRows.map(t => `${t.brandnm}|${t.shoptypenm ?? ''}|${t.yyyymm}`))
  const channelRows = raw.filter(t =>
    !t.shopcd && !covered.has(`${t.brandnm}|${t.shoptypenm ?? ''}|${t.yyyymm}`)
  )
  return [...shopRows, ...channelRows]
}

export function useTargetData() {
  const [rawTargets, setRawTargets] = useState<MonthlyTarget[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 사용처에서 합산해도 중복 안 되도록 가공된 배열
  const targets = useMemo(() => dedupeTargets(rawTargets), [rawTargets])

  // 서버에서 목표 데이터 로드
  const fetchTargets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/targets', { cache: 'no-store' })
      const json = await res.json()
      if (json.data) {
        setRawTargets(json.data)
        // 가장 최근 updated_at 을 lastUpdated 로 사용
        const latest = json.data.reduce(
          (max: string | null, t: any) => (!max || t.updated_at > max ? t.updated_at : max),
          null as string | null,
        )
        setLastUpdated(latest)
      }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTargets() }, [fetchTargets])

  // 서버에 목표 데이터 저장 (upsert)
  const saveTargets = useCallback(async (data: MonthlyTarget[], _filename?: string) => {
    const res = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets: data }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(j.error || `저장 실패 (${res.status})`)
    }
    await fetchTargets()
  }, [fetchTargets])

  // 서버에서 목표 데이터 전체 삭제
  const clearTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/targets', { method: 'DELETE' })
      if (res.ok) {
        setRawTargets([])
        setLastUpdated(null)
      }
    } catch {}
  }, [])

  // 월별 전체 목표 합계 (브랜드 합산)
  const getMonthlyTotal = useCallback((yyyymm: string): number => {
    return targets
      .filter((t) => t.yyyymm === yyyymm)
      .reduce((sum, t) => sum + t.target, 0)
  }, [targets])

  return { targets, rawTargets, lastUpdated, loading, saveTargets, clearTargets, getMonthlyTotal }
}
