'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import { RefreshCw, Package, ArrowUpDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_NAMES, BRAND_TABS, brandNameToCode } from '@/lib/constants'
import { fmtM, fmtPctS } from '@/lib/formatters'
import { useTargetData } from '@/hooks/useTargetData'
import { useAuth } from '@/contexts/AuthContext'
import { PerfCells, PERF_GROUP_HEADER, PerfHeaderCols, getPerfSortValue, type PerfSortKey } from '@/components/sales/PerfCells'
import {
  type ChannelGroup, type WeekPoint, type WeeklyMeta, type Product,
  type PerfData, type PerfMetrics, type MonthProgress,
  CHANNEL_GROUP_ORDER, CHANNEL_GROUP_COLORS,
  getChannelGroup, fmt, pct, sumAgg, calcMetrics, channelParamsFromSet,
} from '@/lib/sales-types'

const YEAR_TABS = [
  { label: '2026년', value: '2026' },
  { label: '2025년', value: '2025' },
]

interface BrandRow { label: string; brandcd: string; m: PerfMetrics; bold?: boolean }
interface ChRow { group: ChannelGroup; channel: string; m: PerfMetrics; isGroupTotal: boolean }

function getLastSunday(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

// ── 툴팁 ─────────────────────────────────────────────────────────
function WeekTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  const weekStart = p?.weekStart
  const dateLabel = weekStart
    ? `${parseInt(weekStart.slice(4, 6))}/${parseInt(weekStart.slice(6))} 주`
    : `W${label}`
  return (
    <div className="bg-white border border-surface-border rounded-lg shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1.5">{dateLabel}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3 mt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium">{p.value != null ? fmt(p.value) : '—'}</span>
        </div>
      ))}
      {p?.dcRate != null && (
        <div className="flex justify-between gap-3 mt-1 pt-1 border-t border-gray-100">
          <span className="text-gray-500">할인율</span>
          <span className="font-medium text-gray-700">{p.dcRate}%</span>
        </div>
      )}
      {p?.lyDcRate != null && (
        <div className="flex justify-between gap-3 mt-0.5">
          <span className="text-gray-400">전년DC</span>
          <span className="font-medium text-gray-400">{p.lyDcRate}%</span>
        </div>
      )}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function SalesDashboard() {
  const { allowedBrands } = useAuth()

  // 브랜드 권한에 따라 초기값 설정
  const defaultBrand = allowedBrands?.length === 1 ? allowedBrands[0] : 'all'
  const [brand,    setBrand]    = useState(defaultBrand)
  const [year,     setYear]     = useState('2026')
  const [selMonth, setSelMonth] = useState('')  // '' = 현재 월 자동, '202601' 등 = 특정 월

  // 권한이 있는 브랜드 탭만 표시
  const visibleBrandTabs = allowedBrands
    ? [
        ...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
        ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value)),
      ]
    : BRAND_TABS
  const [selWeekFrom, setSelWeekFrom] = useState<number | null>(null)  // 구간 시작 주
  const [selWeekTo,   setSelWeekTo]   = useState<number | null>(null)  // 구간 끝 주 (null = 단일 주)
  const selWeekFromRef = useRef<number | null>(null)
  const selWeekToRef = useRef<number | null>(null)
  const lastWeekClickRef = useRef<number>(0)
  // ref 동기화
  selWeekFromRef.current = selWeekFrom
  selWeekToRef.current = selWeekTo
  // 편의 변수: 단일 주 또는 구간의 대표 주
  const selWeek = selWeekFrom
  const [selChannels, setSelChannels] = useState<Set<string>>(new Set())  // 유통채널 다중 선택
  const [selProduct, setSelProduct] = useState<{ code: string; name: string } | null>(null)
  const [selBrands, setSelBrands] = useState<Set<string>>(new Set())  // 브랜드 다중 선택 필터
  const [selItemFilter, setSelItemFilter] = useState<string | null>(null)  // 품목 클릭 필터
  const [itemSortKey, setItemSortKey] = useState<string>('cwRev')
  const [itemSortDir, setItemSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleItemSort = (k: string) => { if (itemSortKey === k) setItemSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setItemSortKey(k); setItemSortDir('desc') } }

  // 브랜드/채널 테이블 정렬
  const [brandSortKey, setBrandSortKey] = useState<PerfSortKey | null>(null)
  const [brandSortDir, setBrandSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleBrandSort = (k: PerfSortKey) => { if (brandSortKey === k) setBrandSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setBrandSortKey(k); setBrandSortDir('desc') } }
  const [chSortKey, setChSortKey] = useState<PerfSortKey | null>(null)
  const [chSortDir, setChSortDir] = useState<'asc' | 'desc'>('desc')
  const toggleChSort = (k: PerfSortKey) => { if (chSortKey === k) setChSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setChSortKey(k); setChSortDir('desc') } }

  const [weeks,     setWeeks]     = useState<WeekPoint[]>([])
  const [weekMeta,  setWeekMeta]  = useState<WeeklyMeta | null>(null)
  const [products,  setProducts]  = useState<Product[]>([])

  const [perfData, setPerfData]     = useState<PerfData | null>(null)
  const [perfLoading, setPerfLoading] = useState(true)
  const [itemData, setItemData]     = useState<any[]>([])

  const [wLoading, setWLoading] = useState(true)
  const [pLoading, setPLoading] = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const { targets } = useTargetData()
  const lastSunday = useMemo(getLastSunday, [])

  // ── 주간 차트 데이터 fetch ─────────────────────────────────────
  const fetchWeekly = useCallback(async (chs: Set<string>, stylecd?: string | null) => {
    setWLoading(true); setError(null)
    const toDt = year === String(new Date().getFullYear()) ? lastSunday : `${year}1231`
    const styleParam = stylecd ? `&stylecd=${encodeURIComponent(stylecd)}` : ''
    try {
      const url = `/api/sales/weekly?brand=${brand}&toDt=${toDt}${channelParamsFromSet(chs)}${styleParam}`
      const res  = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setWeeks(json.weeks)
      setWeekMeta(json.meta)
    } catch (e) { setError(String(e)) }
    finally { setWLoading(false) }
  }, [brand, year, lastSunday])

  // ── 상품 fetch (기본: 전주 실적 기준, API에서 기본값 처리) ────
  const fetchProducts = useCallback(async (sw: number | null, chs: Set<string>) => {
    setPLoading(true)
    const weekParam = sw != null ? `&weekNum=${sw}` : ''
    try {
      const url = `/api/sales/products?brand=${brand}&year=${year}${weekParam}${channelParamsFromSet(chs)}`
      const res  = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setProducts(json.products ?? [])
    } catch { setProducts([]) }
    finally { setPLoading(false) }
  }, [brand, year, lastSunday])

  // ── 영업 현황 데이터 fetch ────────────────────────────────────
  const fetchPerformance = useCallback(async (
    stylecd?: string | null, itemNm?: string | null, silent?: boolean,
    weekNum?: number | null, weekFrom?: number | null, weekTo?: number | null,
  ) => {
    if (!silent) setPerfLoading(true)
    const styleParam = stylecd ? `&stylecd=${encodeURIComponent(stylecd)}` : ''
    const itemParam = itemNm ? `&item=${encodeURIComponent(itemNm)}` : ''
    const weekParam = weekNum ? `&weekNum=${weekNum}` : ''
    const weekRangeParam = (weekFrom && weekTo) ? `&weekFrom=${Math.min(weekFrom, weekTo)}&weekTo=${Math.max(weekFrom, weekTo)}` : ''
    try {
      const monthParam = selMonth ? `&month=${selMonth}` : ''
      const res = await fetch(`/api/sales/performance?brand=${brand}${styleParam}${monthParam}${itemParam}${weekParam}${weekRangeParam}`)
      const perfJson = await res.json()
      if (!res.ok) throw new Error(perfJson.error)
      setPerfData(perfJson)
    } catch { setPerfData(null) }
    finally { if (!silent) setPerfLoading(false) }
  }, [brand, selMonth])

  // ── 품목 데이터 fetch ────────
  const fetchItems = useCallback(async (weekNum?: number | null, chs?: Set<string>) => {
    try {
      const b = getEffectiveBrand(selBrands)
      const weekP = weekNum ? `&weekNum=${weekNum}` : ''
      const chP = chs ? channelParamsFromSet(chs) : ''
      const res = await fetch(`/api/sales/items?brand=${b}${weekP}${chP}`)
      const json = await res.json()
      if (res.ok && json.items) setItemData(json.items)
    } catch {}
  }, [brand, selBrands])

  // 초기 + brand탭/year 변경 시 → 전체 fetch
  useEffect(() => {
    setSelWeekFrom(null); setSelWeekTo(null); setSelChannels(new Set()); setSelProduct(null); setSelBrands(new Set()); setSelItemFilter(null)
    fetchWeekly(new Set())
    fetchProducts(null, new Set())
    fetchPerformance()
    fetchItems(null, new Set())
  }, [brand, year, selMonth])

  // 채널 선택 변경 → 차트 + 베스트 + 품목 re-fetch (perf 테이블은 클라이언트 필터)
  useEffect(() => {
    if (selChannels.size === 0) return // 초기 로드는 위에서 처리
    fetchWeekly(selChannels, selProduct?.code)
    fetchProducts(selWeek, selChannels)
    fetchItems(selWeek, selChannels)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selChannels])

  // 주간 클릭 → 베스트 + 품목 + 주간 실적(브랜드/채널) re-fetch
  const refetchForWeek = (wFrom: number | null, wTo: number | null) => {
    const toDtDefault = year === String(new Date().getFullYear()) ? lastSunday : `${year}1231`
    const b = getEffectiveBrand(selBrands)
    const chP = channelParamsFromSet(selChannels)

    // 주차 → 날짜 변환 헬퍼
    const weekToDateRange = (yr: number, w1: number, w2?: number) => {
      const jan4 = new Date(yr, 0, 4)
      const jan4Dow = jan4.getDay() || 7
      const week1Mon = new Date(jan4); week1Mon.setDate(jan4.getDate() - jan4Dow + 1)
      const startMon = new Date(week1Mon); startMon.setDate(week1Mon.getDate() + (Math.min(w1, w2 ?? w1) - 1) * 7)
      const endSun = new Date(week1Mon); endSun.setDate(week1Mon.getDate() + (Math.max(w1, w2 ?? w1) - 1) * 7 + 6)
      const f = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
      return { fromDt: f(startMon), toDt: f(endSun) }
    }

    let itemsP = ''
    let productsP = '' // 기본: API가 전주 기준 처리
    if (wFrom && wTo) {
      // 구간 선택: 날짜 범위로 변환
      const range = weekToDateRange(parseInt(year), wFrom, wTo)
      itemsP = `&fromDt=${range.fromDt}&toDt=${range.toDt}`
      productsP = `&fromDt=${range.fromDt}&toDt=${range.toDt}`
    } else if (wFrom) {
      // 단일 주 선택
      const range = weekToDateRange(parseInt(year), wFrom)
      itemsP = `&fromDt=${range.fromDt}&toDt=${range.toDt}`
      productsP = `&fromDt=${range.fromDt}&toDt=${range.toDt}`
    }

    // 품목별
    fetch(`/api/sales/items?brand=${b}${itemsP}${chP}`).then(r => r.json()).then(j => { if (j.items) setItemData(j.items) }).catch(() => {})
    // 베스트 상품
    fetch(`/api/sales/products?brand=${brand}&year=${year}${productsP}${chP}`).then(r => r.json()).then(j => { setProducts(j.products ?? []) }).catch(() => {})
    // 주간 실적 (브랜드/채널)
    const weekRangeP = (wFrom && wTo) ? `&weekFrom=${Math.min(wFrom, wTo)}&weekTo=${Math.max(wFrom, wTo)}` : ''
    const singleWeekP = (wFrom && !wTo) ? `&weekNum=${wFrom}` : ''
    const monthParam = selMonth ? `&month=${selMonth}` : ''
    const itemParam = selItemFilter ? `&item=${encodeURIComponent(selItemFilter)}` : ''
    fetch(`/api/sales/performance?brand=${brand}${monthParam}${itemParam}${singleWeekP}${weekRangeP}`).then(r => r.json()).then(j => { setPerfData(j) }).catch(() => {})
  }

  // 상품 클릭 → 차트만 re-fetch (다른 테이블 유지)
  useEffect(() => {
    fetchWeekly(selChannels, selProduct?.code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selProduct])

  // ── 영업 현황 테이블 데이터 빌드 ──────────────────────────────
  const perfTableData = useMemo(() => {
    if (!perfData) return null
    // selBrands 필터 적용: 채널 테이블은 선택된 브랜드만
    const cy = selBrands.size > 0 ? perfData.cy.filter(r => selBrands.has(r.brandcd)) : perfData.cy
    const ly = selBrands.size > 0 ? perfData.ly.filter(r => selBrands.has(r.brandcd)) : perfData.ly

    // 현재 월 자동 감지 (API에서 계산된 monthStart 기반)
    const curMonth = perfData.meta.monthStart.slice(0, 6) // YYYYMM
    const curYear = curMonth.slice(0, 4)

    // 목표 데이터 필터: 정확한 월 매칭 우선, 없으면 해당 연도 전체 사용
    const exactMonthTargets = targets.filter(t => t.yyyymm === curMonth)
    const monthTargets = exactMonthTargets.length > 0
      ? exactMonthTargets
      : targets.filter(t => t.yyyymm.startsWith(curYear))
    // 연도 전체 합산 시 월수로 나눠서 월평균 산출
    const monthCount = exactMonthTargets.length > 0
      ? 1
      : new Set(targets.filter(t => t.yyyymm.startsWith(curYear)).map(t => t.yyyymm)).size || 1

    // 브랜드별 목표 lookup
    const brandTargetMap: Record<string, number> = {}
    // 채널별 목표 lookup: key = "brandcd|shoptypenm" or "all|shoptypenm"
    const channelTargetMap: Record<string, number> = {}

    for (const t of monthTargets) {
      const cd = brandNameToCode(t.brandnm)
      if (!cd) continue

      // 연도 합산 모드일 때는 월평균으로 변환
      const tgt = exactMonthTargets.length > 0 ? t.target : t.target / monthCount

      if (t.shoptypenm) {
        const key = `${cd}|${t.shoptypenm}`
        channelTargetMap[key] = (channelTargetMap[key] ?? 0) + tgt
        const allKey = `all|${t.shoptypenm}`
        channelTargetMap[allKey] = (channelTargetMap[allKey] ?? 0) + tgt
        // 채널 목표도 브랜드 합산에 포함
        brandTargetMap[cd] = (brandTargetMap[cd] ?? 0) + tgt
      } else {
        brandTargetMap[cd] = (brandTargetMap[cd] ?? 0) + tgt
      }
    }

    // 채널 목표 매칭 헬퍼 (shoptypenm의 부분 매칭 지원)
    function findChannelTarget(shoptypenm: string): number | null {
      // selBrands가 선택되어 있으면 해당 브랜드들의 목표만 합산
      if (selBrands.size > 0) {
        let sum: number | null = null
        for (const bc of Array.from(selBrands)) {
          const exact = channelTargetMap[`${bc}|${shoptypenm}`]
          if (exact != null) sum = (sum ?? 0) + exact
          else {
            const norm = (shoptypenm ?? '').trim().toLowerCase()
            for (const [k, v] of Object.entries(channelTargetMap)) {
              if (!k.startsWith(`${bc}|`)) continue
              if (k.split('|')[1].trim().toLowerCase().includes(norm) || norm.includes(k.split('|')[1].trim().toLowerCase())) { sum = (sum ?? 0) + v; break }
            }
          }
        }
        return sum
      }
      // brand 탭 필터 적용
      const prefix = brand === 'all' ? 'all' : brand
      const exact = channelTargetMap[`${prefix}|${shoptypenm}`]
      if (exact != null) return exact
      const norm = (shoptypenm ?? '').trim().toLowerCase()
      for (const [k, v] of Object.entries(channelTargetMap)) {
        if (!k.startsWith(`${prefix}|`)) continue
        if (k.split('|')[1].trim().toLowerCase().includes(norm) || norm.includes(k.split('|')[1].trim().toLowerCase())) return v
      }
      return null
    }

    // 월 진행도 계산
    const cwEndDate = new Date(
      parseInt(perfData.meta.cwEnd.slice(0, 4)),
      parseInt(perfData.meta.cwEnd.slice(4, 6)) - 1,
      parseInt(perfData.meta.cwEnd.slice(6, 8))
    )
    const monthYear = cwEndDate.getFullYear()
    const monthIdx = cwEndDate.getMonth()
    const daysElapsed = cwEndDate.getDate()
    const daysTotal = new Date(monthYear, monthIdx + 1, 0).getDate()
    const _monthProgress: MonthProgress = { daysElapsed, daysTotal }

    // 브랜드별 행 (항상 전체 데이터 사용)
    const allCy = perfData.cy; const allLy = perfData.ly
    const brandCodes = Array.from(new Set(allCy.map(r => r.brandcd)))
    const brandSorted = brandCodes
      .map(bc => ({ bc, rev: allCy.filter(r => r.brandcd === bc).reduce((s, r) => s + r.mtdRev, 0) }))
      .sort((a, b) => b.rev - a.rev)
      .map(x => x.bc)

    const brandRows: BrandRow[] = []
    const cyAll = sumAgg(allCy); const lyAll = sumAgg(allLy)
    // 브랜드 필터 적용: selBrands 또는 brand 탭 기준
    let totalTgt: number | null = null
    if (selBrands.size > 0) {
      let sum = 0; let found = false
      for (const bc of Array.from(selBrands)) { if (brandTargetMap[bc] != null) { sum += brandTargetMap[bc]; found = true } }
      totalTgt = found ? sum : null
    } else if (brand !== 'all') {
      totalTgt = brandTargetMap[brand] ?? null
    } else {
      const sum = Object.values(brandTargetMap).reduce((s, v) => s + v, 0)
      totalTgt = sum > 0 ? sum : null
    }
    brandRows.push({ label: '합계', brandcd: 'all', m: calcMetrics(cyAll, lyAll, totalTgt), bold: true })
    for (const bc of brandSorted) {
      const c = sumAgg(allCy.filter(r => r.brandcd === bc))
      const l = sumAgg(allLy.filter(r => r.brandcd === bc))
      brandRows.push({ label: BRAND_NAMES[bc] ?? bc, brandcd: bc, m: calcMetrics(c, l, brandTargetMap[bc] ?? null) })
    }

    // 채널별 행
    const chRows: ChRow[] = []
    for (const grp of CHANNEL_GROUP_ORDER) {
      const gc = cy.filter(r => getChannelGroup(r.shoptypenm) === grp)
      const gl = ly.filter(r => getChannelGroup(r.shoptypenm) === grp)
      if (!gc.length) continue

      // 그룹 합계 - 그룹 내 채널 목표 합산
      const grpChannels = Array.from(new Set(gc.map(r => r.shoptypenm)))
      let grpTarget: number | null = null
      for (const ch of grpChannels) {
        const ct = findChannelTarget(ch)
        if (ct != null) grpTarget = (grpTarget ?? 0) + ct
      }
      chRows.push({ group: grp, channel: '합계', m: calcMetrics(sumAgg(gc), sumAgg(gl), grpTarget), isGroupTotal: true })

      const channels = grpChannels
        .filter(ch => (ch ?? '').trim() !== '')  // 빈 채널명 제외
        .sort((a, b) => gc.filter(r => r.shoptypenm === b).reduce((s, r) => s + r.mtdRev, 0)
                      - gc.filter(r => r.shoptypenm === a).reduce((s, r) => s + r.mtdRev, 0))
      for (const ch of channels) {
        const cc = sumAgg(gc.filter(r => r.shoptypenm === ch))
        const cl = sumAgg(gl.filter(r => r.shoptypenm === ch))
        chRows.push({ group: grp, channel: ch, m: calcMetrics(cc, cl, findChannelTarget(ch)), isGroupTotal: false })
      }
    }

    return { brandRows, chRows }
  }, [perfData, targets, brand, selBrands])

  // ── 퍼포먼스 테이블 클릭 핸들러 ────────────────────────────────
  // 브랜드 다중 선택에서 API용 브랜드 파라미터 결정
  const getEffectiveBrand = (brands: Set<string>) => {
    if (brands.size === 0) return brand  // 선택 없으면 탭 브랜드
    if (brands.size === 1) return Array.from(brands)[0]
    return brand  // 다중 선택이면 탭 기준 (클라이언트 필터)
  }

  const handleBrandClick = (brandcd: string) => {
    if (brandcd === 'all') {
      // 합계 행 클릭 → 선택 초기화
      setSelBrands(new Set())
      return
    }
    setSelBrands(prev => {
      const next = new Set(prev)
      if (next.has(brandcd)) next.delete(brandcd)
      else next.add(brandcd)
      return next
    })
  }

  // selBrands 변경 시 차트/품목/베스트 re-fetch
  useEffect(() => {
    const b = getEffectiveBrand(selBrands)
    const chParams = channelParamsFromSet(selChannels)
    const toDt = year === String(new Date().getFullYear()) ? lastSunday : `${year}1231`
    const weekP = selWeek ? `&weekNum=${selWeek}` : ''
    fetch(`/api/sales/weekly?brand=${b}&toDt=${toDt}${chParams}`).then(r => r.json()).then(j => { setWeeks(j.weeks ?? []); setWeekMeta(j.meta ?? null) }).catch(() => {})
    fetch(`/api/sales/items?brand=${b}${weekP}${chParams}`).then(r => r.json()).then(j => { if (j.items) setItemData(j.items) }).catch(() => {})
    fetch(`/api/sales/products?brand=${b}&year=${year}${weekP}${chParams}`).then(r => r.json()).then(j => { setProducts(j.products ?? []) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selBrands])
  const salesRouter = useRouter()
  const handleChannelClick = (group: ChannelGroup, channel: string, isGroupTotal: boolean, allChannelsInGroup?: string[]) => {
    if (isGroupTotal && allChannelsInGroup) {
      // 그룹 합계 클릭 → 해당 그룹 내 모든 채널 토글
      setSelChannels(prev => {
        const next = new Set(prev)
        const allSelected = allChannelsInGroup.every(ch => next.has(ch))
        if (allSelected) {
          // 전부 선택됨 → 전부 해제
          allChannelsInGroup.forEach(ch => next.delete(ch))
        } else {
          // 일부 또는 미선택 → 전부 선택
          allChannelsInGroup.forEach(ch => next.add(ch))
        }
        return next
      })
    } else {
      // 개별 채널 클릭 → 토글
      setSelChannels(prev => {
        const next = new Set(prev)
        if (next.has(channel)) next.delete(channel)
        else next.add(channel)
        return next
      })
    }
  }
  const handleChannelNavigate = (channel: string, e: React.MouseEvent) => {
    e.stopPropagation()
    salesRouter.push(`/sales/channel/${encodeURIComponent(channel)}`)
  }

  // ── 차트 x축 레이블 ────────────────────────────────────────────
  const MONTH_WEEK_TICKS = [1, 5, 9, 13, 18, 22, 26, 31, 35, 40, 44, 48]
  const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

  const cyTotal  = weekMeta?.cyTotal ?? 0
  const lyTotal  = weekMeta?.lyTotal ?? 0
  const _yoyDelta = lyTotal > 0 ? pct(cyTotal - lyTotal, lyTotal) : null

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">매출 실적 대시보드</h1>
          <p className="text-xs text-gray-400 mt-0.5">부가세 제외 · 단위: 백만원</p>
        </div>
        <button onClick={() => { fetchWeekly(selChannels); fetchProducts(selWeek, selChannels); fetchPerformance() }}
          disabled={wLoading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle transition-colors">
          <RefreshCw size={12} className={wLoading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* ── 필터 ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">브랜드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleBrandTabs.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {b.value !== 'all' && (
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px"
                  style={{ background: BRAND_COLORS[b.value] }} />
              )}
              {b.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">연도</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {YEAR_TABS.map(y => (
            <button key={y.value} onClick={() => setYear(y.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                year === y.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {y.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">월</span>
        <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-brand-accent">
          <option value="">현재 월</option>
          {Array.from({ length: 12 }, (_, i) => {
            const m = `${year}${String(i + 1).padStart(2, '0')}`
            return <option key={m} value={m}>{i + 1}월</option>
          })}
        </select>
        {Array.from(selBrands).map(bc => (
          <button key={bc} onClick={() => handleBrandClick(bc)}
            className="flex items-center gap-1 text-[10px] text-brand-accent border border-brand-accent/30 rounded-full px-2 py-0.5 hover:bg-brand-accent-light">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: BRAND_COLORS[bc] }} />
            {BRAND_NAMES[bc] ?? bc} <span className="text-[8px]">✕</span>
          </button>
        ))}
        {Array.from(selChannels).map(ch => (
          <button key={ch} onClick={() => setSelChannels(prev => { const n = new Set(prev); n.delete(ch); return n })}
            className="flex items-center gap-1 text-[10px] text-blue-600 border border-blue-200 rounded-full px-2 py-0.5 hover:bg-blue-50">
            {ch} <span className="text-[8px]">✕</span>
          </button>
        ))}
        {selChannels.size > 1 && (
          <button onClick={() => setSelChannels(new Set())}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline">채널 전체 해제</button>
        )}
        {selItemFilter && (
          <button onClick={() => setSelItemFilter(null)}
            className="flex items-center gap-1 text-[10px] text-emerald-600 border border-emerald-200 rounded-full px-2 py-0.5 hover:bg-emerald-50">
            {selItemFilter} <span className="text-[8px]">✕</span>
          </button>
        )}
        {selProduct && (
          <button onClick={() => setSelProduct(null)}
            className="flex items-center gap-1 text-[10px] text-purple-600 border border-purple-200 rounded-full px-2 py-0.5 hover:bg-purple-50">
            {selProduct.name}
            <span className="text-[8px]">✕</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>
      )}

      {/* ── 주간 선 그래프 ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-gray-700">
            주간 매출 추이 ({year}년)
            {selChannels.size > 0 && (
              <span className="ml-2 font-normal text-brand-accent">
                · {Array.from(selChannels).join(', ')}
              </span>
            )}
            {selProduct && (
              <span className="ml-2 font-normal text-purple-600">· {selProduct.name}</span>
            )}
          </h3>
          <div className="flex items-center gap-4 text-xs">
            {(() => {
              if (selWeekFrom != null) {
                // 주간 또는 구간 선택
                const wFrom = selWeekTo != null ? Math.min(selWeekFrom, selWeekTo) : selWeekFrom
                const wTo = selWeekTo != null ? Math.max(selWeekFrom, selWeekTo) : selWeekFrom
                const rangeWeeks = weeks.filter(wk => wk.weekNum >= wFrom && wk.weekNum <= wTo)
                const cwRev = rangeWeeks.reduce((s, w) => s + (w.cy ?? 0), 0)
                const lyRev = rangeWeeks.reduce((s, w) => s + (w.ly ?? 0), 0)
                const delta = lyRev > 0 ? pct(cwRev - lyRev, lyRev) : null
                const label = wFrom === wTo ? `W${wFrom}` : `W${wFrom}~W${wTo}`
                // 구간 할인율: 마지막 주의 할인율 표시
                const lastWeek = rangeWeeks[rangeWeeks.length - 1]
                const rangeDc = lastWeek?.dcRate
                return (<>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-accent" />{label} 금년 {fmt(cwRev)}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-300" />{label} 전년 {fmt(lyRev)}</span>
                  {delta != null && <span className={cn('font-semibold', delta >= 0 ? 'text-red-500' : 'text-blue-500')}>YoY {fmtPctS(delta)}</span>}
                  {rangeDc != null && <span className="text-gray-500">DC {rangeDc}%</span>}
                </>)
              }
              // 기본: 금년 누적 기준 동기간 비교
              const maxW = Math.max(...weeks.filter(w => w.cy != null).map(w => w.weekNum), 0)
              const lyMatch = weeks.filter(w => w.weekNum <= maxW).reduce((s, w) => s + (w.ly ?? 0), 0)
              const delta = lyMatch > 0 ? pct(cyTotal - lyMatch, lyMatch) : null
              return (<>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-brand-accent" />금년 누적 {fmt(cyTotal)}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-300" />전년 동기 {fmt(lyMatch)}</span>
                {delta != null && <span className={cn('font-semibold', delta >= 0 ? 'text-red-500' : 'text-blue-500')}>YoY {fmtPctS(delta)}</span>}
              </>)
            })()}
            {selWeekFrom != null && (
              <button onClick={() => { setSelWeekFrom(null); setSelWeekTo(null) }}
                className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
                {selWeekTo != null ? `W${Math.min(selWeekFrom, selWeekTo)}~W${Math.max(selWeekFrom, selWeekTo)}` : `W${selWeekFrom}`} 선택 해제
              </button>
            )}
          </div>
        </div>
        {wLoading ? (
          <div className="h-40 bg-surface-subtle animate-pulse rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={220} style={{ outline: 'none' }}>
            <LineChart
              data={weeks}
              margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
              onClick={(state: any) => {
                const now = Date.now()
                if (now - (lastWeekClickRef.current || 0) < 300) return
                lastWeekClickRef.current = now
                const w = state?.activeLabel as number | undefined
                if (w == null || w < 1 || w > 52) return
                const curFrom = selWeekFromRef.current
                const curTo = selWeekToRef.current
                const maxW = Math.max(...weeks.filter(wk => wk.cy != null).map(wk => wk.weekNum), 0)
                if (curFrom === null) {
                  setSelWeekFrom(w); setSelWeekTo(null)
                  if (w !== maxW) refetchForWeek(w, null)
                } else if (curTo === null && w !== curFrom) {
                  setSelWeekTo(w)
                  refetchForWeek(curFrom, w)
                } else {
                  setSelWeekFrom(null); setSelWeekTo(null)
                  refetchForWeek(null, null)
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
              <XAxis
                dataKey="weekNum" type="number" domain={[1, 52]}
                ticks={MONTH_WEEK_TICKS}
                tickFormatter={(w) => MONTH_LABELS[MONTH_WEEK_TICKS.indexOf(w)] ?? ''}
                tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={52} />
              <Tooltip content={<WeekTooltip />} />
              {selWeekFrom != null && selWeekTo != null && (
                <ReferenceArea x1={Math.min(selWeekFrom, selWeekTo)} x2={Math.max(selWeekFrom, selWeekTo)} fill="#e91e63" fillOpacity={0.1} stroke="#e91e63" strokeOpacity={0.3} />
              )}
              {selWeekFrom != null && (
                <ReferenceLine x={selWeekFrom} stroke="#e91e63" strokeDasharray="3 3" strokeWidth={1.5} />
              )}
              {selWeekTo != null && (
                <ReferenceLine x={selWeekTo} stroke="#e91e63" strokeDasharray="3 3" strokeWidth={1.5} />
              )}
              <Line type="monotone" dataKey="ly" name="전년" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="cy" name="금년" stroke="#e91e63" strokeWidth={2.5} connectNulls={false}
                dot={(props: any) => {
                  const { cx, cy: cyY, payload } = props
                  if (payload.cy == null) return <g key={props.key} />
                  const wFrom = selWeekTo != null ? Math.min(selWeekFrom!, selWeekTo) : selWeekFrom
                  const wTo = selWeekTo != null ? Math.max(selWeekFrom!, selWeekTo) : selWeekFrom
                  if (wFrom != null && payload.weekNum >= wFrom && payload.weekNum <= (wTo ?? wFrom)) {
                    return <circle key={props.key} cx={cx} cy={cyY} r={5} fill="#e91e63" stroke="white" strokeWidth={2} />
                  }
                  return <circle key={props.key} cx={cx} cy={cyY} r={2.5} fill="#e91e63" />
                }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 브랜드 매출 현황 + 베스트 상품 ── */}
      <div className="flex gap-3" style={{ minHeight: 420 }}>

        {/* 브랜드 매출 현황 테이블 */}
        <div className="flex-1 bg-white rounded-xl border border-surface-border shadow-sm flex flex-col overflow-hidden min-w-0">
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-subtle flex items-center justify-between shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">
              브랜드 매출 현황
              {perfData?.meta.monthLabel && (
                <span className="ml-2 font-normal text-gray-400">
                  {perfData.meta.monthLabel} (전일마감 ~{perfData.meta.monthEnd.slice(4,6)}/{perfData.meta.monthEnd.slice(6)}) · 주간 {perfData.meta.cwLabel}
                  {selWeekFrom != null && (selWeekTo != null ? ` (W${Math.min(selWeekFrom, selWeekTo)}~W${Math.max(selWeekFrom, selWeekTo)})` : ` (W${selWeekFrom})`)}
                </span>
              )}
            </h3>
          </div>

          {perfLoading ? (
            <div className="p-4 space-y-2 flex-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-7 bg-surface-subtle animate-pulse rounded" />
              ))}
            </div>
          ) : perfTableData ? (
            <div className="overflow-auto flex-1">
              {/* 브랜드별 요약 */}
              <table className="w-full text-[11px] border-collapse min-w-[1150px]">
                <thead className="sticky top-0 z-20">
                  {PERF_GROUP_HEADER}
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="text-left px-3 py-2 sticky left-0 bg-gray-50 z-30 w-[120px]"></th>
                    <PerfHeaderCols sortKey={brandSortKey} sortDir={brandSortDir} onSort={toggleBrandSort} />
                  </tr>
                </thead>
                <tbody>
                  {(brandSortKey
                    ? [perfTableData.brandRows[0], ...perfTableData.brandRows.slice(1).sort((a, b) => {
                        const va = getPerfSortValue(a.m, brandSortKey)
                        const vb = getPerfSortValue(b.m, brandSortKey)
                        return brandSortDir === 'asc' ? va - vb : vb - va
                      })]
                    : perfTableData.brandRows
                  ).map((row) => (
                    <tr key={row.brandcd}
                      onClick={() => handleBrandClick(row.brandcd)}
                      className={cn('border-b border-surface-border cursor-pointer transition-colors',
                        row.bold ? 'bg-blue-50/40 font-semibold hover:bg-blue-100/40' : 'hover:bg-gray-50/50',
                        selBrands.has(row.brandcd) && !row.bold && 'bg-brand-accent-light')}>
                      <td className={cn('px-3 py-2 sticky left-0 z-10',
                        row.bold ? 'bg-blue-50/40 font-bold text-gray-900' :
                        selBrands.has(row.brandcd) ? 'bg-brand-accent-light font-semibold text-gray-900' :
                        'bg-white text-gray-700')}>
                        <span className="flex items-center gap-1.5">
                          {!row.bold && row.brandcd !== 'all' && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: BRAND_COLORS[row.brandcd] }} />
                          )}
                          {row.label}
                        </span>
                      </td>
                      <PerfCells m={row.m} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 유통채널별 매출 현황 */}
              <div className="px-3 py-2 bg-gray-100 border-t-2 border-gray-300">
                <h3 className="text-xs font-semibold text-gray-700">유통채널별 매출 현황</h3>
              </div>
              <table className="w-full text-[11px] border-collapse min-w-[1150px]">
                <thead className="sticky top-0 z-20">
                  {PERF_GROUP_HEADER}
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-400 font-semibold uppercase tracking-wide">
                    <th className="text-left px-3 py-2 sticky left-0 bg-gray-50 z-30 w-[120px] whitespace-nowrap">매장형태</th>
                    <PerfHeaderCols sortKey={chSortKey} sortDir={chSortDir} onSort={toggleChSort} />
                  </tr>
                </thead>
                <tbody>
                  {(chSortKey
                    ? (() => {
                        // 그룹 합계는 유지, 그룹 내 개별 채널만 정렬
                        const groups = CHANNEL_GROUP_ORDER.filter(g => perfTableData.chRows.some(r => r.group === g))
                        const sorted: ChRow[] = []
                        for (const g of groups) {
                          const total = perfTableData.chRows.find(r => r.group === g && r.isGroupTotal)
                          if (total) sorted.push(total)
                          const children = perfTableData.chRows.filter(r => r.group === g && !r.isGroupTotal)
                            .sort((a, b) => {
                              const va = getPerfSortValue(a.m, chSortKey)
                              const vb = getPerfSortValue(b.m, chSortKey)
                              return chSortDir === 'asc' ? va - vb : vb - va
                            })
                          sorted.push(...children)
                        }
                        return sorted
                      })()
                    : perfTableData.chRows
                  ).map((row, i) => {
                    const grpColor = CHANNEL_GROUP_COLORS[row.group]
                    // 개별 채널: selChannels에 포함되면 선택
                    const isSelected = row.isGroupTotal
                      ? perfTableData.chRows
                          .filter(r => r.group === row.group && !r.isGroupTotal)
                          .every(r => selChannels.has(r.channel)) && selChannels.size > 0
                      : selChannels.has(row.channel)
                    // 그룹 합계 클릭 시 해당 그룹 내 모든 채널 목록 전달
                    const grpChannelList = row.isGroupTotal
                      ? perfTableData.chRows.filter(r => r.group === row.group && !r.isGroupTotal).map(r => r.channel)
                      : undefined
                    return (
                      <tr key={i}
                        onClick={() => handleChannelClick(row.group, row.channel, row.isGroupTotal, grpChannelList)}
                        className={cn('border-b border-surface-border cursor-pointer transition-colors group',
                          row.isGroupTotal ? 'bg-gray-50/60 font-semibold hover:bg-gray-100/60' : 'hover:bg-gray-50/50',
                          isSelected && 'bg-brand-accent-light')}>
                        <td className={cn('px-3 py-2 sticky left-0 z-10',
                          isSelected ? 'bg-brand-accent-light' :
                          row.isGroupTotal ? 'bg-gray-50/60' : 'bg-white')}>
                          {row.isGroupTotal ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: grpColor }} />
                              <span className="font-semibold text-gray-800">{row.group} 합계</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-600 pl-4 whitespace-nowrap">
                            {row.channel}
                            <button onClick={(e) => handleChannelNavigate(row.channel, e)}
                              className="opacity-0 group-hover:opacity-100 hover:text-brand-accent transition-opacity ml-auto shrink-0"
                              title="매장 상세 보기">
                              <ExternalLink size={10} />
                            </button>
                          </span>
                          )}
                        </td>
                        <PerfCells m={row.m} />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-400 flex-1">데이터를 불러올 수 없습니다</div>
          )}
        </div>

        {/* 품목별 */}
        <div className="w-[300px] shrink-0 bg-white rounded-xl border border-surface-border shadow-sm flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-surface-border bg-surface-subtle shrink-0">
            <span className="text-xs font-semibold text-gray-700">품목별 실적</span>
          </div>
          <div className="overflow-y-auto flex-1">
            {perfLoading ? (
              <div className="p-2 space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-6 bg-surface-subtle animate-pulse rounded"/>)}</div>
            ) : itemData.length > 0 ? (() => {
              const totalSale = itemData.reduce((s: number, i: any) => s + (i.cwRev || 0), 0)
              const sorted = [...itemData].filter((i: any) => i.cwRev > 0).sort((a: any, b: any) => b.cwRev - a.cwRev).slice(0, 20)
              return sorted.length > 0 ? (
                <table className="w-full text-[11px]">
                  <thead className="bg-surface-subtle sticky top-0">
                    <tr className="border-b border-surface-border text-gray-400 font-semibold">
                      {[{k:'item',l:'품목',a:'left'},{k:'cwRev',l:'매출',a:'right'},{k:'dcRate',l:'할인율',a:'right'},{k:'wow',l:'WoW',a:'right'},{k:'yoy',l:'YoY',a:'right'},{k:'share',l:'비중',a:'right'}].map(c=>(
                        <th key={c.k} className={cn('px-1 py-2 cursor-pointer hover:text-gray-900 whitespace-nowrap', c.a==='left'?'text-left px-2':'text-right', c.k==='share'&&'px-2')}
                          onClick={()=>toggleItemSort(c.k)}>
                          <span className="inline-flex items-center gap-0.5">{c.l}<ArrowUpDown size={7} className={cn('shrink-0', itemSortKey===c.k?'opacity-100 text-brand-accent':'opacity-20')}/></span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...sorted].map(i=>({...i, share: totalSale>0?Math.round(i.cwRev/totalSale*1000)/10:0}))
                      .sort((a:any,b:any)=>{const va=a[itemSortKey]??0,vb=b[itemSortKey]??0;return typeof va==='string'?(itemSortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va)):(itemSortDir==='asc'?va-vb:vb-va)})
                      .map((item: any) => {
                      return (
                        <tr key={item.item}
                          onClick={() => {
                            const next = selItemFilter === item.item ? null : item.item
                            setSelItemFilter(next)
                            // 베스트 상품 + 브랜드/채널 테이블 re-fetch (품목 필터)
                            const b = getEffectiveBrand(selBrands)
                            const itemP = next ? `&item=${encodeURIComponent(next)}` : ''
                            fetch(`/api/sales/products?brand=${b}&year=${year}${channelParamsFromSet(selChannels)}${itemP}`).then(r=>r.json()).then(j=>{setProducts(j.products??[])}).catch(()=>{})
                            fetchPerformance(null, next, true)
                          }}
                          className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                            selItemFilter === item.item ? 'bg-emerald-50' : 'hover:bg-surface-subtle')}>
                          <td className="px-2 py-2 text-gray-800 font-medium truncate max-w-[70px]">{item.item}</td>
                          <td className="px-1 py-2 text-right font-mono text-gray-700">{fmtM(item.cwRev)}</td>
                          <td className="px-1 py-2 text-right text-gray-600">{item.dcRate != null ? `${item.dcRate}%` : '—'}</td>
                          <td className={cn('px-1 py-2 text-right font-mono', item.wow >= 0 ? 'text-red-500' : 'text-blue-500')}>
                            {item.pwRev > 0 ? `${item.wow >= 0 ? '+' : ''}${item.wow}%` : '—'}
                          </td>
                          <td className={cn('px-1 py-2 text-right font-mono', item.yoy >= 0 ? 'text-red-500' : 'text-blue-500')}>
                            {item.lyCwRev > 0 ? `${item.yoy >= 0 ? '+' : ''}${item.yoy}%` : '—'}
                          </td>
                          <td className="px-1 py-2 text-right text-gray-500">{item.share}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : <div className="py-8 text-center text-[10px] text-gray-400">데이터 없음</div>
            })() : null}
          </div>
        </div>

        {/* 베스트 상품 TOP 20 */}
        <div className="w-[340px] shrink-0 bg-white rounded-xl border border-surface-border shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-subtle flex items-center gap-2 shrink-0">
            <Package size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-700">베스트 상품 TOP 20</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-surface-border bg-amber-50/50 flex-wrap shrink-0">
            {brand !== 'all' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold"
                style={{ background: BRAND_COLORS[brand] ?? '#999' }}>
                {BRAND_NAMES[brand] ?? brand}
              </span>
            )}
            {selWeekFrom != null && (
              <span className="text-[10px] bg-brand-accent text-white px-2 py-0.5 rounded-full">
                {selWeekTo != null ? `W${Math.min(selWeekFrom, selWeekTo)}~W${Math.max(selWeekFrom, selWeekTo)}` : `W${selWeekFrom}`}
              </span>
            )}
            {Array.from(selChannels).map(ch => (
              <span key={ch} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{ch}</span>
            ))}
            {selProduct && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {selProduct.name}
              </span>
            )}
            {brand === 'all' && selWeek == null && selChannels.size === 0 && !selProduct && (
              <span className="text-[10px] text-gray-400">테이블/차트 클릭으로 필터</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {pLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-7 bg-surface-subtle animate-pulse rounded" />
                ))}
              </div>
            ) : products.length ? (
              <table className="w-full text-[10px]">
                <thead className="bg-surface-subtle sticky top-0">
                  <tr className="border-b border-surface-border text-gray-400">
                    <th className="text-left px-2 py-1.5 font-medium w-5">#</th>
                    <th className="text-left px-1.5 py-1.5 font-medium">상품명</th>
                    <th className="text-right px-1.5 py-1.5 font-medium">실적</th>
                    <th className="text-right px-1.5 py-1.5 font-medium">수량</th>
                    <th className="text-right px-1.5 py-1.5 font-medium">할인율</th>
                    <th className="text-right px-2 py-1.5 font-medium">WoW%</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const dc = p.dcRate ?? (p.tagTotal > 0 ? (1 - p.saleTotal / p.tagTotal) * 100 : 0)
                    const wow = p.pwRev > 0 ? ((p.cwRev - p.pwRev) / p.pwRev) * 100 : null
                    return (
                      <tr key={p.code}
                        onClick={() => setSelProduct(prev => prev?.code === p.code ? null : { code: p.code, name: p.name || p.code })}
                        className={cn('border-b border-surface-border last:border-0 cursor-pointer transition-colors',
                          selProduct?.code === p.code ? 'bg-purple-50' : 'hover:bg-surface-subtle')}>
                        <td className="px-2 py-1.5 text-gray-400 font-mono">{i + 1}</td>
                        <td className="px-1.5 py-1.5">
                          <div className="font-medium text-gray-800 truncate max-w-[100px]">{p.name || p.code}</div>
                          <span className="px-1 py-px rounded-full text-[8px] font-bold text-white"
                            style={{ background: BRAND_COLORS[p.brand] ?? '#999' }}>
                            {BRAND_NAMES[p.brand] ?? p.brand}
                          </span>
                        </td>
                        <td className="px-1.5 py-1.5 text-right font-semibold text-gray-800">{fmtM(p.revenue)}</td>
                        <td className="px-1.5 py-1.5 text-right font-mono text-gray-600">{p.qty.toLocaleString()}</td>
                        <td className="px-1.5 py-1.5 text-right text-gray-600">{dc.toFixed(1)}%</td>
                        <td className={cn('px-2 py-1.5 text-right font-mono',
                          wow == null ? 'text-gray-300' : wow >= 0 ? 'text-red-500' : 'text-blue-500')}>
                          {wow == null ? '—' : `${wow >= 0 ? '+' : ''}${Math.round(wow)}%`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
