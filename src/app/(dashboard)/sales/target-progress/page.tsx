'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData } from '@/hooks/useTargetData'
import { brandNameToCode, BRAND_NAMES } from '@/lib/constants'
import { fmtW } from '@/lib/formatters'
import { getChannelGroup, CHANNEL_GROUP_ORDER, CHANNEL_GROUP_COLORS, ChannelGroup } from '@/lib/sales-types'

type ApiRow = { dd: number; brandcd: string; shoptypenm: string; rev: number }
type LyRow = { dd: number; brandcd: string; shoptypenm: string; rev: number }
type Meta = { yyyymm: string; daysInMonth: number; daysElapsed: number; isCurrentMonth: boolean; future: boolean }
type ApiData = { meta: Meta; rows: ApiRow[]; lyRows: LyRow[] }

interface Metric {
  key: string        // 표시 라벨 (채널명 또는 브랜드명)
  group?: ChannelGroup
  monthTgt: number
  mtdTgt: number
  mtdActual: number
  lyMtd: number      // 전년 동기간(1~경과일) 실적
  lyFull: number     // 전년 월전체 실적
  yoy: number | null // 전년대비율 (MTD실적 vs 전년동기)
  progress: number | null   // = 예상 달성률
  projected: number | null  // 예상 착지 금액
  needPerDay: number | null
}

const BRAND_ORDER = ['CO', 'LE', 'WA', 'CK', 'LK']
const WD = ['', '월', '화', '수', '목', '금', '토', '일'] // ISO 1~7

const progColor = (p: number | null) =>
  p === null ? 'text-gray-300' : p >= 100 ? 'text-emerald-600' : p >= 90 ? 'text-amber-600' : 'text-red-500'
const progBar = (p: number | null) =>
  p === null ? 'bg-gray-200' : p >= 100 ? 'bg-emerald-500' : p >= 90 ? 'bg-amber-500' : 'bg-red-500'

const ymLabel = (ym: string) => `${ym.slice(0, 4)}년 ${Number(ym.slice(4, 6))}월`
const sumV = (v: number[]) => v.reduce((s, x) => s + x, 0)

export default function TargetProgressPage() {
  const { targets } = useTargetData()
  const { allowedBrands, loading: authLoading } = useAuth()
  const allowedParam = allowedBrands ? allowedBrands.join(',') : ''

  const now = new Date()
  const curYm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

  const [selMonth, setSelMonth] = useState<string>(curYm)
  const [selBrand, setSelBrand] = useState<string>('all')
  const [mode, setMode] = useState<'dow' | 'even'>('dow') // 요일가중 / 균등
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selChannel, setSelChannel] = useState<string | null>(null)

  // 권한 브랜드 (admin=전체 5개)
  const effectiveBrands = useMemo(() => allowedBrands ?? BRAND_ORDER, [allowedBrands])
  const brandTabs = useMemo(() => BRAND_ORDER.filter(b => effectiveBrands.includes(b)), [effectiveBrands])

  // 단일 브랜드 권한이면 자동 고정
  useEffect(() => {
    if (authLoading) return
    if (brandTabs.length === 1) setSelBrand(brandTabs[0])
    else if (selBrand !== 'all' && !brandTabs.includes(selBrand)) setSelBrand('all')
  }, [authLoading, brandTabs]) // eslint-disable-line react-hooks/exhaustive-deps

  const monthOptions = useMemo(() => {
    const set = new Set<string>(targets.map(t => t.yyyymm)); set.add(curYm)
    return Array.from(set).filter(Boolean).sort((a, b) => b.localeCompare(a))
  }, [targets, curYm])

  const fetchData = useCallback(async (ym: string, allowed: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/target-progress?yyyymm=${ym}&allowed=${allowed}`)
      setData(await res.json())
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchData(selMonth, allowedParam)
  }, [selMonth, allowedParam, authLoading, fetchData])

  const meta = data?.meta
  const yNum = Number(selMonth.slice(0, 4))
  const mNum = Number(selMonth.slice(4, 6))
  const daysInMonth = meta?.daysInMonth ?? new Date(yNum, mNum, 0).getDate()
  const daysElapsed = meta?.daysElapsed ?? 0
  const remainDays = Math.max(0, daysInMonth - daysElapsed)

  // 각 일자의 ISO 요일 (1=월~7=일)
  const dowOfDay = useMemo(() => {
    const arr: number[] = [0]
    for (let d = 1; d <= daysInMonth; d++) {
      const js = new Date(yNum, mNum - 1, d).getDay() // 0=일
      arr[d] = ((js + 6) % 7) + 1
    }
    return arr
  }, [yNum, mNum, daysInMonth])

  // 전년 동요일 매핑: 당월 d일 → 전년 동월의 "같은 요일·같은 N번째" 일자 (없으면 0)
  // 예: 당월 첫째 토요일 ↔ 전년 동월 첫째 토요일
  const lyDayOf = useMemo(() => {
    const lyYear = yNum - 1
    const lyDays = new Date(lyYear, mNum, 0).getDate()
    const lyOccur: Record<number, number[]> = {} // 요일 → [전년일자...] (발생순)
    for (let ld = 1; ld <= lyDays; ld++) {
      const w = ((new Date(lyYear, mNum - 1, ld).getDay() + 6) % 7) + 1
      ;(lyOccur[w] ||= []).push(ld)
    }
    const cnt: Record<number, number> = {}
    const map = Array(daysInMonth + 1).fill(0)
    for (let d = 1; d <= daysInMonth; d++) {
      const w = dowOfDay[d]
      cnt[w] = (cnt[w] || 0) + 1            // 당월에서 이 요일의 N번째
      const ld = lyOccur[w]?.[cnt[w] - 1]    // 전년 동월의 N번째 같은 요일
      map[d] = ld ?? 0
    }
    return map
  }, [yNum, mNum, daysInMonth, dowOfDay])

  // 전년 요일가중 벡터 (브랜드×채널 / 채널 / 전체) — index 1~7, 전년 일자→요일로 환산
  const weights = useMemo(() => {
    const bc = new Map<string, number[]>()
    const ch = new Map<string, number[]>()
    const all = Array(8).fill(0)
    const lyYear = yNum - 1
    for (const r of data?.lyRows ?? []) {
      const js = new Date(lyYear, mNum - 1, r.dd).getDay()
      const dow = ((js + 6) % 7) + 1
      const k = `${r.brandcd}|${r.shoptypenm}`
      if (!bc.has(k)) bc.set(k, Array(8).fill(0))
      bc.get(k)![dow] += r.rev
      if (!ch.has(r.shoptypenm)) ch.set(r.shoptypenm, Array(8).fill(0))
      ch.get(r.shoptypenm)![dow] += r.rev
      all[dow] += r.rev
    }
    return { bc, ch, all }
  }, [data, yNum, mNum])

  const EVEN = useMemo(() => [0, 1, 1, 1, 1, 1, 1, 1], [])
  // (브랜드,채널) → 요일가중 벡터 선택 (LY 브랜드×채널 → LY 채널 → LY 전체 → 균등)
  const getW = useCallback((brandcd: string, channel: string): number[] => {
    if (mode === 'even') return EVEN
    const k = `${brandcd}|${channel}`
    const a = weights.bc.get(k); if (a && sumV(a) > 0) return a
    const b = weights.ch.get(channel); if (b && sumV(b) > 0) return b
    if (sumV(weights.all) > 0) return weights.all
    return EVEN
  }, [mode, weights, EVEN])

  // 목표: (브랜드,채널) 월목표 + 미지정(브랜드 단위)
  const { pairTgt, unassignedTgt } = useMemo(() => {
    const map = new Map<string, number>()
    let unassigned = 0
    for (const t of targets) {
      if (t.yyyymm !== selMonth) continue
      const cd = brandNameToCode(t.brandnm)
      if (!cd || !effectiveBrands.includes(cd)) continue
      if (selBrand !== 'all' && cd !== selBrand) continue
      const channel = (t.shoptypenm ?? '').trim()
      if (!channel) { unassigned += t.target; continue }
      const k = `${cd}|${channel}`
      map.set(k, (map.get(k) ?? 0) + t.target)
    }
    return { pairTgt: map, unassignedTgt: unassigned }
  }, [targets, selMonth, effectiveBrands, selBrand])

  // 실적: (브랜드,채널) → 일자배열
  const actualByPair = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const r of data?.rows ?? []) {
      if (!effectiveBrands.includes(r.brandcd)) continue
      if (selBrand !== 'all' && r.brandcd !== selBrand) continue
      const k = `${r.brandcd}|${r.shoptypenm}`
      if (!m.has(k)) m.set(k, Array(daysInMonth + 1).fill(0))
      m.get(k)![r.dd] += r.rev
    }
    return m
  }, [data, effectiveBrands, selBrand, daysInMonth])

  // 전년 실적: (브랜드,채널) → 일자배열 (전년 완전월)
  const lyByPair = useMemo(() => {
    const m = new Map<string, number[]>()
    for (const r of data?.lyRows ?? []) {
      if (!effectiveBrands.includes(r.brandcd)) continue
      if (selBrand !== 'all' && r.brandcd !== selBrand) continue
      const k = `${r.brandcd}|${r.shoptypenm}`
      if (!m.has(k)) m.set(k, Array(32).fill(0))
      m.get(k)![r.dd] += r.rev
    }
    return m
  }, [data, effectiveBrands, selBrand])

  // pair 단위 계산 (월목표·누적목표·MTD실적·일목표배열·전년)
  const pairCalc = useMemo(() => {
    const keys = new Set<string>([...pairTgt.keys(), ...actualByPair.keys(), ...lyByPair.keys()])
    const out = new Map<string, {
      brandcd: string; channel: string; monthTgt: number; mtdTgt: number; mtdActual: number; dayTgt: number[]
      lyMtd: number; lyFull: number
    }>()
    for (const k of keys) {
      const [brandcd, channel] = k.split('|')
      const monthTgt = pairTgt.get(k) ?? 0
      const w = getW(brandcd, channel)
      let mw = 0, ew = 0
      for (let d = 1; d <= daysInMonth; d++) { mw += w[dowOfDay[d]]; if (d <= daysElapsed) ew += w[dowOfDay[d]] }
      const dayTgt = Array(daysInMonth + 1).fill(0)
      if (mw > 0) for (let d = 1; d <= daysInMonth; d++) dayTgt[d] = monthTgt * w[dowOfDay[d]] / mw
      const mtdTgt = mw > 0 ? monthTgt * ew / mw : 0
      const arr = actualByPair.get(k) ?? []
      let mtdActual = 0
      for (let d = 1; d <= daysElapsed; d++) mtdActual += arr[d] ?? 0
      // 전년: 동요일 정렬(1~경과일) + 월전체
      const lyArr = lyByPair.get(k) ?? []
      let lyMtd = 0, lyFull = 0
      for (let d = 1; d <= daysInMonth; d++) {
        const ld = lyDayOf[d]; const v = ld ? (lyArr[ld] ?? 0) : 0
        lyFull += v; if (d <= daysElapsed) lyMtd += v
      }
      out.set(k, { brandcd, channel, monthTgt, mtdTgt, mtdActual, dayTgt, lyMtd, lyFull })
    }
    return out
  }, [pairTgt, actualByPair, lyByPair, getW, daysInMonth, daysElapsed, dowOfDay, lyDayOf])

  const mkMetric = (key: string, group: ChannelGroup | undefined, rows: { monthTgt: number; mtdTgt: number; mtdActual: number; lyMtd: number; lyFull: number }[]): Metric => {
    const monthTgt = rows.reduce((s, r) => s + r.monthTgt, 0)
    const mtdTgt = rows.reduce((s, r) => s + r.mtdTgt, 0)
    const mtdActual = rows.reduce((s, r) => s + r.mtdActual, 0)
    const lyMtd = rows.reduce((s, r) => s + r.lyMtd, 0)
    const lyFull = rows.reduce((s, r) => s + r.lyFull, 0)
    const yoy = lyMtd > 0 ? (mtdActual / lyMtd - 1) * 100 : null
    const progress = mtdTgt > 0 ? (mtdActual / mtdTgt) * 100 : null
    const projected = monthTgt > 0 && mtdTgt > 0 ? mtdActual * monthTgt / mtdTgt : null
    const needPerDay = remainDays > 0 && monthTgt > 0 ? Math.max(0, monthTgt - mtdActual) / remainDays : null
    return { key, group, monthTgt, mtdTgt, mtdActual, lyMtd, lyFull, yoy, progress, projected, needPerDay }
  }

  // 채널별 (그룹 묶음)
  const grouped = useMemo(() => {
    const byCh = new Map<string, any[]>()
    for (const p of pairCalc.values()) {
      if (!byCh.has(p.channel)) byCh.set(p.channel, [])
      byCh.get(p.channel)!.push(p)
    }
    const chMetrics: Metric[] = Array.from(byCh.entries())
      .map(([ch, rows]) => mkMetric(ch, getChannelGroup(ch), rows))
      .sort((a, b) => (b.monthTgt - a.monthTgt) || (b.mtdActual - a.mtdActual))
    return CHANNEL_GROUP_ORDER.map(grp => {
      const rows = chMetrics.filter(m => m.group === grp)
      const sub = mkMetric(grp, grp, rows)
      return { grp, rows, sub }
    }).filter(g => g.rows.length > 0)
  }, [pairCalc, remainDays]) // eslint-disable-line react-hooks/exhaustive-deps

  // 브랜드별 (전체 탭일 때만)
  const brandMetrics = useMemo(() => {
    const byBrand = new Map<string, any[]>()
    for (const p of pairCalc.values()) {
      if (!byBrand.has(p.brandcd)) byBrand.set(p.brandcd, [])
      byBrand.get(p.brandcd)!.push(p)
    }
    return BRAND_ORDER.filter(b => byBrand.has(b))
      .map(b => mkMetric(BRAND_NAMES[b] ?? b, undefined, byBrand.get(b)!))
  }, [pairCalc, remainDays]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => mkMetric('전체 합계', undefined, Array.from(pairCalc.values())), [pairCalc, remainDays]) // eslint-disable-line react-hooks/exhaustive-deps

  // 드릴: 선택 채널(또는 전체)의 일자별 시계열
  const daily = useMemo(() => {
    const pairs = Array.from(pairCalc.values()).filter(p => !selChannel || p.channel === selChannel)
    const dayActualArr = Array(daysInMonth + 1).fill(0)
    const dayTgtArr = Array(daysInMonth + 1).fill(0)
    const lyDayArr = Array(daysInMonth + 1).fill(0)
    for (const p of pairs) {
      const k = `${p.brandcd}|${p.channel}`
      const arr = actualByPair.get(k) ?? []
      const lyArr = lyByPair.get(k) ?? []
      for (let d = 1; d <= daysInMonth; d++) {
        dayActualArr[d] += arr[d] ?? 0
        dayTgtArr[d] += p.dayTgt[d] ?? 0
        const ld = lyDayOf[d]; lyDayArr[d] += ld ? (lyArr[ld] ?? 0) : 0 // 전년 동요일
      }
    }
    let cumActual = 0, cumTgt = 0, cumLy = 0
    const series = []
    for (let d = 1; d <= daysInMonth; d++) {
      const within = d <= daysElapsed
      cumTgt += dayTgtArr[d]
      cumLy += lyDayArr[d]
      if (within) cumActual += dayActualArr[d]
      series.push({
        day: `${d}`, dow: WD[dowOfDay[d]], weekend: dowOfDay[d] >= 6,
        dayActual: within ? dayActualArr[d] : null,
        dayTgt: dayTgtArr[d],
        lyDay: lyDayArr[d],
        cumActual: within ? cumActual : null,
        cumTgt,
        cumLy,
        cumProg: within && cumTgt > 0 ? (cumActual / cumTgt) * 100 : null,
      })
    }
    return series
  }, [pairCalc, actualByPair, lyByPair, selChannel, daysInMonth, daysElapsed, dowOfDay, lyDayOf])

  const progressPct = daysInMonth > 0 ? Math.round((daysElapsed / daysInMonth) * 100) : 0
  const scopeLabel = selBrand === 'all' ? '전체 브랜드' : (BRAND_NAMES[selBrand] ?? selBrand)

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">목표 진도율</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mode === 'dow' ? '전년 요일패턴 가중배분' : '균등배분'} 기준 · 채널별 일자별 진도율 (전일마감)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 배분 토글 */}
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs">
            {([['dow', '요일가중'], ['even', '균등']] as [typeof mode, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)}
                className={cn('px-2.5 py-1 rounded-md font-medium transition-all',
                  mode === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {label}
              </button>
            ))}
          </div>
          <select value={selMonth} onChange={e => { setSelMonth(e.target.value); setSelChannel(null) }}
            className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent">
            {monthOptions.map(ym => <option key={ym} value={ym}>{ymLabel(ym)}</option>)}
          </select>
        </div>
      </div>

      {/* 브랜드 탭 */}
      {brandTabs.length > 1 && (
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit text-xs">
          {[{ v: 'all', l: '전체' }, ...brandTabs.map(b => ({ v: b, l: BRAND_NAMES[b] ?? b }))].map(t => (
            <button key={t.v} onClick={() => { setSelBrand(t.v); setSelChannel(null) }}
              className={cn('px-3 py-1.5 rounded-md font-medium transition-all',
                selBrand === t.v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t.l}
            </button>
          ))}
        </div>
      )}

      {unassignedTgt > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
          채널 미지정(브랜드 단위) 목표 {fmtW(unassignedTgt)}은 채널 진도율 집계에서 제외되었습니다.
        </div>
      )}

      {meta?.future ? (
        <div className="text-center py-16 text-sm text-gray-400">아직 시작되지 않은 월입니다.</div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: '월 목표', value: fmtW(total.monthTgt), sub: `${daysInMonth}일 · ${scopeLabel}` },
              { label: `누적 목표 (${daysElapsed}일)`, value: fmtW(total.mtdTgt), sub: `시간경과 ${progressPct}%` },
              { label: 'MTD 실적', value: fmtW(total.mtdActual), sub: total.yoy != null ? `전년 ${fmtW(total.lyMtd)} · ${total.yoy >= 0 ? '+' : ''}${Math.round(total.yoy)}%` : `일평균 ${fmtW(daysElapsed > 0 ? total.mtdActual / daysElapsed : 0)}`, color: undefined },
              { label: '진도율', value: total.progress != null ? `${Math.round(total.progress)}%` : '—', sub: '실적/누적목표', color: progColor(total.progress) },
              { label: '예상 착지', value: total.projected != null ? fmtW(total.projected) : '—', sub: total.monthTgt > 0 && total.projected != null ? `목표대비 ${Math.round(total.projected / total.monthTgt * 100)}%` : '—', color: progColor(total.progress) },
              { label: '일 필요액', value: total.needPerDay != null ? fmtW(total.needPerDay) : '—', sub: `잔여 ${remainDays}일` },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{c.label}</p>
                <p className={cn('text-lg font-bold mt-1', c.color ?? 'text-gray-900')}>{c.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* 브랜드 요약표 (전체 탭) */}
          {selBrand === 'all' && brandMetrics.length > 1 && (
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">브랜드별 진도율 <span className="text-xs font-normal text-gray-400">· 단위 백만원 · 클릭 시 해당 브랜드로 전환</span></h3>
              {loading ? <div className="h-24 bg-surface-subtle animate-pulse rounded-lg" /> : (
                <table className="w-full text-[11px]">
                  <thead><MetricHead first="브랜드" /></thead>
                  <tbody>
                    {brandMetrics.map(m => {
                      const code = BRAND_ORDER.find(b => (BRAND_NAMES[b] ?? b) === m.key)
                      return (
                        <tr key={m.key} onClick={() => code && (setSelBrand(code), setSelChannel(null))}
                          className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                          <td className="py-2 px-2 text-left font-semibold text-gray-800">{m.key}</td>
                          <MetricCells t={m} />
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 채널 요약표 */}
          <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">채널별 진도율 <span className="text-xs font-normal text-gray-400">· {scopeLabel} · 행 클릭 시 일자별 상세</span></h3>
            {loading ? <div className="h-40 bg-surface-subtle animate-pulse rounded-lg" /> : grouped.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-400">목표 또는 실적 데이터가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><MetricHead first="채널" /></thead>
                  <tbody>
                    <tr onClick={() => setSelChannel(null)}
                      className={cn('border-b-2 border-gray-300 cursor-pointer font-bold', selChannel === null ? 'bg-brand-accent/5' : 'bg-gray-50 hover:bg-gray-100')}>
                      <td className="py-2 px-2 text-left text-gray-900">전체 합계</td>
                      <MetricCells t={total} />
                    </tr>
                    {grouped.map(g => (
                      <GroupBlock key={g.grp} grp={g.grp} rows={g.rows} sub={g.sub} selChannel={selChannel} onSelect={setSelChannel} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 일자별 드릴 */}
          <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {scopeLabel} · {selChannel ?? '전체 채널'} <span className="text-xs font-normal text-gray-400">· 일자별 누적 목표 vs 실적</span>
            </h3>
            {loading ? <div className="h-56 bg-surface-subtle animate-pulse rounded-lg" /> : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={daily} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tickFormatter={v => fmtW(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={55} />
                    <Tooltip formatter={(v, name) => [fmtW(Number(v)), String(name)]} labelFormatter={l => {
                      const s = daily.find(x => x.day === l); return `${l}일 (${s?.dow ?? ''})`
                    }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="dayActual" name="일 실적" fill="#e91e63" radius={[3, 3, 0, 0]} barSize={10} fillOpacity={0.7} />
                    <Line type="monotone" dataKey="cumLy" name="전년 누적" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" dot={false} connectNulls />
                    <Line type="monotone" dataKey="cumTgt" name="누적 목표" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="cumActual" name="누적 실적" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>

                <div className="mt-3 overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-[10px]">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-gray-200 text-gray-500 font-semibold text-right">
                        <th className="py-1 px-2 text-left">일자</th>
                        <th className="py-1 px-2">일 목표</th>
                        <th className="py-1 px-2">일 실적</th>
                        <th className="py-1 px-2">전년(동요일)</th>
                        <th className="py-1 px-2">일 전년비</th>
                        <th className="py-1 px-2">일 달성</th>
                        <th className="py-1 px-2">누적 목표</th>
                        <th className="py-1 px-2">누적 실적</th>
                        <th className="py-1 px-2">누적 전년</th>
                        <th className="py-1 px-2">누적 진도율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.filter(s => s.cumActual != null).reverse().map(s => {
                        const dayPct = s.dayTgt > 0 && s.dayActual != null ? Math.round((s.dayActual / s.dayTgt) * 100) : null
                        const dayYoy = s.lyDay > 0 && s.dayActual != null ? Math.round((s.dayActual / s.lyDay - 1) * 100) : null
                        return (
                          <tr key={s.day} className={cn('border-b border-gray-50 text-right', s.weekend && 'bg-blue-50/40')}>
                            <td className="py-1 px-2 text-left font-medium text-gray-700">{s.day}일 <span className={cn('text-[9px]', s.weekend ? 'text-blue-500' : 'text-gray-400')}>{s.dow}</span></td>
                            <td className="py-1 px-2 text-gray-400">{fmtW(s.dayTgt)}</td>
                            <td className="py-1 px-2 text-gray-800 font-semibold">{s.dayActual != null ? fmtW(s.dayActual) : '—'}</td>
                            <td className="py-1 px-2 text-gray-500">{s.lyDay > 0 ? fmtW(s.lyDay) : '—'}</td>
                            <td className={cn('py-1 px-2 font-medium', dayYoy == null ? 'text-gray-300' : dayYoy >= 0 ? 'text-red-500' : 'text-blue-500')}>{dayYoy != null ? `${dayYoy >= 0 ? '+' : ''}${dayYoy}%` : '—'}</td>
                            <td className={cn('py-1 px-2 font-medium', progColor(dayPct))}>{dayPct != null ? `${dayPct}%` : '—'}</td>
                            <td className="py-1 px-2 text-gray-400">{fmtW(s.cumTgt)}</td>
                            <td className="py-1 px-2 text-gray-700">{s.cumActual != null ? fmtW(s.cumActual) : '—'}</td>
                            <td className="py-1 px-2 text-gray-500">{s.cumLy > 0 ? fmtW(s.cumLy) : '—'}</td>
                            <td className={cn('py-1 px-2 font-bold', progColor(s.cumProg))}>{s.cumProg != null ? `${Math.round(s.cumProg)}%` : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MetricHead({ first }: { first: string }) {
  return (
    <tr className="border-b border-gray-200 text-gray-500 font-semibold text-right">
      <th className="py-1.5 px-2 text-left">{first}</th>
      <th className="py-1.5 px-2">월 목표</th>
      <th className="py-1.5 px-2">누적 목표</th>
      <th className="py-1.5 px-2">MTD 실적</th>
      <th className="py-1.5 px-2">전년 실적</th>
      <th className="py-1.5 px-2">전년비</th>
      <th className="py-1.5 px-2 w-[130px]">진도율</th>
      <th className="py-1.5 px-2">예상 착지</th>
      <th className="py-1.5 px-2">일 필요액</th>
    </tr>
  )
}

function MetricCells({ t }: { t: Metric }) {
  return (
    <>
      <td className="py-2 px-2 text-right text-gray-700">{t.monthTgt > 0 ? fmtW(t.monthTgt) : '—'}</td>
      <td className="py-2 px-2 text-right text-gray-400">{t.mtdTgt > 0 ? fmtW(t.mtdTgt) : '—'}</td>
      <td className="py-2 px-2 text-right text-gray-900 font-semibold">{fmtW(t.mtdActual)}</td>
      <td className="py-2 px-2 text-right text-gray-500">{t.lyMtd > 0 ? fmtW(t.lyMtd) : '—'}</td>
      <td className={cn('py-2 px-2 text-right font-medium', t.yoy == null ? 'text-gray-300' : t.yoy >= 0 ? 'text-red-500' : 'text-blue-500')}>
        {t.yoy != null ? `${t.yoy >= 0 ? '+' : ''}${Math.round(t.yoy)}%` : '—'}
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-1.5 justify-end">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
            <div className={cn('h-full rounded-full', progBar(t.progress))} style={{ width: `${Math.min(t.progress ?? 0, 100)}%` }} />
          </div>
          <span className={cn('font-bold w-9 text-right', progColor(t.progress))}>{t.progress != null ? `${Math.round(t.progress)}%` : '—'}</span>
        </div>
      </td>
      <td className="py-2 px-2 text-right text-gray-700">{t.projected != null ? fmtW(t.projected) : '—'}</td>
      <td className="py-2 px-2 text-right text-gray-600">{t.needPerDay != null ? fmtW(t.needPerDay) : '—'}</td>
    </>
  )
}

function GroupBlock({ grp, rows, sub, selChannel, onSelect }: {
  grp: ChannelGroup; rows: Metric[]; sub: Metric; selChannel: string | null; onSelect: (c: string | null) => void
}) {
  return (
    <>
      <tr className="border-b border-gray-100 bg-gray-50/60">
        <td className="py-1.5 px-2 text-left font-semibold" style={{ color: CHANNEL_GROUP_COLORS[grp] }}>{grp}</td>
        <MetricCells t={sub} />
      </tr>
      {rows.map(r => {
        const active = selChannel === r.key
        return (
          <tr key={r.key} onClick={() => onSelect(active ? null : r.key)}
            className={cn('border-b border-gray-50 cursor-pointer', active ? 'bg-brand-accent/5 ring-1 ring-brand-accent/30' : 'hover:bg-gray-50')}>
            <td className="py-2 px-2 text-left text-gray-600 pl-5">{r.key}</td>
            <MetricCells t={r} />
          </tr>
        )
      })}
    </>
  )
}
