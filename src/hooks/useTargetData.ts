'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MonthlyTarget {
  yyyymm: string   // e.g. "202603"
  brandnm: string
  target: number
  shoptypenm?: string  // optional: 매장형태/채널
  shopcd?: string      // optional: 매장코드 (점당 목표)
}

const STORAGE_KEY = 'bcave_monthly_targets'

export function useTargetData() {
  const [targets, setTargets] = useState<MonthlyTarget[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setTargets(parsed.data ?? [])
        setLastUpdated(parsed.updatedAt ?? null)
      }
    } catch {}
  }, [])

  const saveTargets = useCallback((data: MonthlyTarget[], filename: string) => {
    const payload = { data, updatedAt: new Date().toISOString(), filename }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setTargets(data)
    setLastUpdated(payload.updatedAt)
  }, [])

  const clearTargets = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setTargets([])
    setLastUpdated(null)
  }, [])

  // 월별 전체 목표 합계 (브랜드 합산)
  const getMonthlyTotal = useCallback((yyyymm: string): number => {
    return targets
      .filter((t) => t.yyyymm === yyyymm)
      .reduce((sum, t) => sum + t.target, 0)
  }, [targets])

  return { targets, lastUpdated, saveTargets, clearTargets, getMonthlyTotal }
}
