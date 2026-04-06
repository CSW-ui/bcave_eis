'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MonthlyTarget {
  yyyymm: string   // e.g. "202603"
  brandnm: string
  target: number
  shoptypenm?: string  // optional: 매장형태/채널
  shopcd?: string      // optional: 매장코드 (점당 목표)
}

export function useTargetData() {
  const [targets, setTargets] = useState<MonthlyTarget[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 서버에서 목표 데이터 로드
  const fetchTargets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/targets')
      const json = await res.json()
      if (json.data) {
        setTargets(json.data)
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
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: data }),
      })
      if (res.ok) {
        await fetchTargets() // 저장 후 다시 로드
      }
    } catch {}
  }, [fetchTargets])

  // 서버에서 목표 데이터 전체 삭제
  const clearTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/targets', { method: 'DELETE' })
      if (res.ok) {
        setTargets([])
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

  return { targets, lastUpdated, loading, saveTargets, clearTargets, getMonthlyTotal }
}
