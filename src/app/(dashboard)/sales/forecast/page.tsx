'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, TrendingUp, Target, Package, BarChart3 } from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from 'recharts'
import { cn } from '@/lib/utils'
import { BRAND_TABS, BRAND_COLORS, brandNameToCode } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData } from '@/hooks/useTargetData'

const fmtW = (v: number) => {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e4).toLocaleString()}만`
  return v.toLocaleString()
}
const fmtM = (v: number) => Math.round(v / 1e6).toLocaleString()

export default function ForecastPage() {
  const { allowedBrands } = useAuth()
  const { targets } = useTargetData()
  const [brand, setBrand] = useState('all')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/forecast?brand=${apiBrand}`)
      const json = await res.json()
      if (json.forecast) setData(json)
    } catch {}
    finally { setLoading(false) }
  }, [apiBrand])

  useEffect(() => { fetchData() }, [fetchData])

  // 목표 금액 (브랜드 필터 반영)
  const monthTarget = useMemo(() => {
    if (!data?.meta) return 0
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const brandCodes = brand === 'all' ? (allowedBrands ?? null) : [brand]
    return targets
      .filter(t => {
        if (t.yyyymm !== yyyymm) return false
        if (brandCodes) {
          const tCode = brandNameToCode(t.brandnm)
          if (!tCode || !brandCodes.includes(tCode)) return false
        }
        return true
      })
      .reduce((s, t) => s + t.target, 0)
  }, [data, targets, brand, allowedBrands])

  const f = data?.forecast
  const m = data?.meta

  // 차트 데이터: 금년 일별 실적 + 전년 일별 + 예측 투영
  const chartData = useMemo(() => {
    if (!f?.dailyCurve) return []
    const cyMap = new Map(f.dailyCurve.cy.map((d: any) => [parseInt(d.date.slice(6)), d.rev]))
    const lyMap = new Map(f.dailyCurve.ly.map((d: any) => [parseInt(d.date.slice(6)), d.rev]))

    const daysTotal = m?.daysTotal ?? 30
    const daysElapsed = m?.daysElapsed ?? 0

    // 잔여일 예측: 일평균 기반 (간이)
    const dailyAvg = f.elapsedRev > 0 && daysElapsed > 0 ? f.elapsedRev / daysElapsed : 0
    const forecastDailyAvg = (f.forecastRev - f.elapsedRev) / Math.max(1, daysTotal - daysElapsed)

    return Array.from({ length: daysTotal }, (_, i) => {
      const day = i + 1
      const cy = cyMap.get(day) ?? null
      const ly = lyMap.get(day) ?? null
      const projected = day > daysElapsed ? forecastDailyAvg : null
      return { day, cy, ly, projected }
    })
  }, [f, m])

  // 누적 차트 데이터
  const cumulativeData = useMemo(() => {
    if (!chartData.length) return []
    let cyCum = 0, lyCum = 0, projCum = 0
    const daysElapsed = m?.daysElapsed ?? 0
    return chartData.map(d => {
      if (d.cy != null) cyCum += d.cy
      if (d.ly != null) lyCum += d.ly
      if (d.day <= daysElapsed) projCum = cyCum
      else projCum += d.projected ?? 0
      return {
        day: d.day,
        cy: d.cy != null ? cyCum : null,
        ly: lyCum > 0 ? lyCum : null,
        projected: d.day >= daysElapsed ? projCum : null,
        target: monthTarget > 0 ? monthTarget : null,
      }
    })
  }, [chartData, m, monthTarget])

  const achPct = monthTarget > 0 && f ? Math.round(f.forecastRev / monthTarget * 100) : null
  const achMinPct = monthTarget > 0 && f ? Math.round(f.forecastMin / monthTarget * 100) : null
  const achMaxPct = monthTarget > 0 && f ? Math.round(f.forecastMax / monthTarget * 100) : null

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">예상달성</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {m ? `${m.asOfDate?.slice(0,4)}년 ${parseInt(m.asOfDate?.slice(4,6))}월 · ${m.asOfDate?.slice(4,6)}/${m.asOfDate?.slice(6)} 기준 · 잔여 ${m.daysRemaining}일` : '로딩 중...'}
          </p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-subtle">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* 브랜드 필터 */}
      <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5 w-fit">
        {visibleBrands.map(b => (
          <button key={b.value} onClick={() => setBrand(b.value)}
            className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
              brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-surface-subtle animate-pulse rounded-xl" />)}
        </div>
      ) : f && (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-5 gap-3">
            {/* 경과 실적 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 size={14} className="text-gray-400" />
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">경과 실적</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtW(f.elapsedRev)}</p>
              <p className="text-[10px] text-gray-500 mt-1">전년동기 {fmtW(f.lyElapsedRev)}</p>
              <span className={cn('text-xs font-semibold', f.growth >= 100 ? 'text-emerald-600' : 'text-red-500')}>
                {f.growth >= 100 ? '+' : ''}{Math.round(f.growth - 100)}% 성장
              </span>
            </div>

            {/* 월말 예상 */}
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={14} className="text-blue-500" />
                <p className="text-[10px] text-blue-500 uppercase tracking-wide font-semibold">월말 예상</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{fmtW(f.forecastRev)}</p>
              <p className="text-[10px] text-gray-400 mt-1">{fmtW(f.forecastMin)} ~ {fmtW(f.forecastMax)}</p>
              <div className="flex gap-2 mt-1 text-[9px] text-gray-400">
                <span>A:{fmtW(f.signals.a)}</span>
                <span>B:{fmtW(f.signals.b)}</span>
                <span>C:{fmtW(f.signals.c)}</span>
              </div>
            </div>

            {/* 예상 달성률 */}
            <div className={cn('rounded-xl border shadow-sm p-4',
              achPct === null ? 'bg-white border-surface-border' :
              achPct >= 100 ? 'bg-emerald-50 border-emerald-200' :
              achPct >= 90 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}>
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={14} className={achPct === null ? 'text-gray-400' : achPct >= 100 ? 'text-emerald-500' : achPct >= 90 ? 'text-amber-500' : 'text-red-500'} />
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">예상 달성률</p>
              </div>
              {achPct !== null ? (
                <>
                  <p className={cn('text-2xl font-bold', achPct >= 100 ? 'text-emerald-600' : achPct >= 90 ? 'text-amber-600' : 'text-red-600')}>
                    {achPct}%
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">목표 {fmtW(monthTarget)}</p>
                  <p className="text-[10px] text-gray-400">{achMinPct}% ~ {achMaxPct}%</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-300">—</p>
                  <p className="text-[10px] text-gray-400 mt-1">목표 미설정</p>
                </>
              )}
            </div>

            {/* 전년 동월 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">전년 동월</p>
              <p className="text-2xl font-bold text-gray-600">{fmtW(f.lyFullRev)}</p>
              <p className="text-[10px] text-gray-500 mt-1">경과분 {fmtW(f.lyElapsedRev)}</p>
              <span className={cn('text-xs font-semibold', f.forecastRev >= f.lyFullRev ? 'text-emerald-600' : 'text-red-500')}>
                예상 vs 전년 {f.forecastRev >= f.lyFullRev ? '+' : ''}{Math.round((f.forecastRev - f.lyFullRev) / (f.lyFullRev || 1) * 100)}%
              </span>
            </div>

            {/* 모델 정보 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">예측 모델</p>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">전년패턴</span>
                  <span className="font-semibold text-gray-700">{Math.round(f.signals.weights.a * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">요일가중</span>
                  <span className="font-semibold text-gray-700">{Math.round(f.signals.weights.b * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">상품모멘텀</span>
                  <span className="font-semibold text-gray-700">{Math.round(f.signals.weights.c * 100)}%</span>
                </div>
                <div className="pt-1 border-t border-gray-100 flex justify-between">
                  <span className="text-gray-400">{m.daysElapsed}일 경과 / {m.daysTotal}일</span>
                </div>
              </div>
            </div>
          </div>

          {/* 누적 매출 차트 */}
          <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">일별 누적 매출 추이</h3>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="flex items-center gap-1"><span className="w-3 h-2 bg-brand-accent rounded-sm opacity-85" />금년 실적</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '2px dashed #6366f1' }} />예상 투영</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '2px dashed #9ca3af' }} />전년</span>
                {monthTarget > 0 && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '2px solid #f59e0b' }} />목표</span>}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cumulativeData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={d => `${d}일`} />
                <YAxis tickFormatter={v => fmtW(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={55} />
                <Tooltip formatter={(v: any) => fmtW(Number(v))} labelFormatter={l => `${l}일`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                {monthTarget > 0 && <ReferenceLine y={monthTarget} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" label={{ value: '목표', position: 'right', fontSize: 10, fill: '#f59e0b' }} />}
                <Line type="monotone" dataKey="ly" name="전년" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
                <Line type="monotone" dataKey="projected" name="예상" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                <Line type="monotone" dataKey="cy" name="금년" stroke="#e91e63" strokeWidth={2.5} dot={{ r: 2, fill: '#e91e63' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 하단: 상품별 기여도 + 일별 상세 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 상품별 예상 기여 TOP 15 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Package size={14} className="text-gray-400" /> 상품별 예상 기여
                </h3>
              </div>
              <div className="overflow-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-[11px]">
                  <thead className="bg-surface-subtle sticky top-0">
                    <tr className="border-b border-surface-border text-gray-400 font-semibold">
                      <th className="text-left px-3 py-2">#</th>
                      <th className="text-left px-2 py-2">품목</th>
                      <th className="text-right px-2 py-2">경과 매출</th>
                      <th className="text-right px-2 py-2">예상 매출</th>
                      <th className="text-right px-2 py-2">비중</th>
                      <th className="text-right px-2 py-2">성장률</th>
                      <th className="text-right px-2 py-2">모멘텀</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.topItems?.map((item: any, i: number) => (
                      <tr key={item.item} className={cn('border-b border-surface-border/50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                        <td className="px-3 py-1.5 text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-2 py-1.5 font-medium text-gray-800">{item.item}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-gray-600">{fmtM(item.cyRev)}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(item.forecast)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-gray-500">{item.share}%</td>
                        <td className={cn('px-2 py-1.5 text-right font-mono font-semibold',
                          item.growth >= 100 ? 'text-emerald-600' : 'text-red-500')}>
                          {item.growth >= 100 ? '+' : ''}{Math.round(item.growth - 100)}%
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                            item.momentum >= 1.1 ? 'bg-emerald-100 text-emerald-700' :
                            item.momentum >= 0.95 ? 'bg-gray-100 text-gray-600' :
                            'bg-red-100 text-red-700')}>
                            {item.momentum >= 1 ? '+' : ''}{Math.round((item.momentum - 1) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 채널별 예상 기여 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm">
              <div className="px-4 py-3 border-b border-surface-border">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-gray-400" /> 채널별 예상 기여
                </h3>
              </div>
              <div className="overflow-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-[11px]">
                  <thead className="bg-surface-subtle sticky top-0">
                    <tr className="border-b border-surface-border text-gray-400 font-semibold">
                      <th className="text-left px-3 py-2">채널</th>
                      <th className="text-right px-2 py-2">경과 매출</th>
                      <th className="text-right px-2 py-2">예상 매출</th>
                      <th className="text-right px-2 py-2">목표</th>
                      <th className="text-right px-2 py-2">달성률</th>
                      <th className="text-right px-2 py-2">비중</th>
                      <th className="text-right px-2 py-2">성장률</th>
                      <th className="text-right px-2 py-2">모멘텀</th>
                      <th className="text-right px-2 py-2">전년비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.channelForecasts?.map((ch: any, i: number) => {
                      const vsLy = ch.lyFull > 0 ? Math.round((ch.forecast - ch.lyFull) / ch.lyFull * 100) : null
                      // 채널 목표 매칭
                      const now = new Date()
                      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
                      const brandCodes = brand === 'all' ? (allowedBrands ?? null) : [brand]
                      const chTarget = targets
                        .filter(t => {
                          if (t.yyyymm !== yyyymm) return false
                          if (t.shoptypenm !== ch.channel) return false
                          if (brandCodes) {
                            const tCode = brandNameToCode(t.brandnm)
                            if (!tCode || !brandCodes.includes(tCode)) return false
                          }
                          return true
                        })
                        .reduce((s, t) => s + t.target, 0)
                      const chAch = chTarget > 0 ? Math.round(ch.forecast / chTarget * 100) : null
                      return (
                        <tr key={ch.channel} className={cn('border-b border-surface-border/50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                          <td className="px-3 py-1.5 font-medium text-gray-800">{ch.channel}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-600">{fmtM(ch.cyRev)}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(ch.forecast)}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-400">{chTarget > 0 ? fmtM(chTarget) : '—'}</td>
                          <td className="px-2 py-1.5 text-right">
                            {chAch !== null ? (
                              <span className={cn('font-mono font-bold',
                                chAch >= 100 ? 'text-emerald-600' : chAch >= 90 ? 'text-amber-500' : 'text-red-500')}>
                                {chAch}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-gray-500">{ch.share}%</td>
                          <td className={cn('px-2 py-1.5 text-right font-mono font-semibold',
                            ch.growth >= 100 ? 'text-emerald-600' : 'text-red-500')}>
                            {ch.growth >= 100 ? '+' : ''}{Math.round(ch.growth - 100)}%
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                              ch.momentum >= 1.1 ? 'bg-emerald-100 text-emerald-700' :
                              ch.momentum >= 0.95 ? 'bg-gray-100 text-gray-600' :
                              'bg-red-100 text-red-700')}>
                              {ch.momentum >= 1 ? '+' : ''}{Math.round((ch.momentum - 1) * 100)}%
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {vsLy !== null ? (
                              <span className={cn('font-mono font-semibold', vsLy >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                                {vsLy >= 0 ? '+' : ''}{vsLy}%
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
