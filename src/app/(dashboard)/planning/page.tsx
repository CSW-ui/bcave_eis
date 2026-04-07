'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { PlanningItemTable } from '@/components/planning/PlanningItemTable'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_TABS, ITEM_CATEGORIES, CATEGORY_COLORS, ITEM_GROUPS, ITEM_GROUP_MAP, GENDER_FILTERS } from '@/lib/constants'
import { fmtW, fmtDelta, fmtDeltaPt } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'

const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄', year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '26 상반기', year: '26', season: '상반기' },
  { label: '26 스탠다드', year: '26', season: '스탠다드' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 가을', year: '25', season: '가을' },
  { label: '25 겨울', year: '25', season: '겨울' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
  { label: '25 봄', year: '25', season: '봄' },
  { label: '25 여름', year: '25', season: '여름' },
]

// ── 타입 ──────────────────────────────────────────────────────
interface PlanItem {
  item: string; category: string; styleCnt: number; skuCnt: number
  avgTag: number; avgCost: number
  ordQty: number; ordTagAmt: number; ordCostAmt: number
  inQty: number; inAmt: number; inboundRate: number
  saleQty: number; saleAmt: number; tagAmt: number; salePriceAmt: number; costAmt: number
  dcRate: number; cogsRate: number; salesRate: number
  cwAmt: number; pwAmt: number; pw2Amt: number; cwQty: number; cwCost: number; cwCogsRate: number; wow: number
  recentWowAvg: number
  monthAmt: number; monthQty: number
  shopInv: number; shopAvail?: number; whAvail: number
  totalInv: number; invTagAmt: number; invCostAmt: number
  sellThrough: number
}
interface PlanKpi {
  totalStyles: number; totalSkus: number
  totalOrdQty: number; totalOrdTagAmt: number
  totalInQty: number; totalInAmt: number
  totalSaleAmt: number; totalSaleQty: number; totalSaleTagAmt: number
  totalInvQty: number; totalCostAmt: number
  totalMonthAmt: number; totalMonthQty: number
  totalInvTagAmt: number; totalInvCostAmt: number
  salesRate: number; sellThrough: number; inboundRate: number; dcRate: number; cogsRate: number
}
interface PlanChannel { channel: string; qty: number; amt: number }
interface TopStyle { styleCd: string; styleNm: string; item: string; tagPrice: number; saleQty: number; saleAmt: number; cwAmt: number; pwAmt: number; m4Amt: number; cwQty: number; m4Qty: number; wow: number }
interface WeatherTemp { date: string; dateLabel: string; day?: string; tmx: number | null; tmn: number | null; avg: number | null; weather?: string }
interface WeatherData { temps: WeatherTemp[]; avgTemp: number | null; laterAvg?: number | null; recommendations: { label: string; items: string[]; period?: string }[]; tempTrend: string | null; alerts?: string[] }
interface WeekTrend { week: number; cy: number; ly: number }
interface GenderSale { gender: string; amt: number; ordTagAmt: number; salesRate: number; invTagAmt: number; dcRate: number }
interface PlanData { kpi: PlanKpi; items: PlanItem[]; channels: PlanChannel[]; topStyles: TopStyle[]; weeklyTrend: WeekTrend[]; genderSales?: GenderSale[] }

// ── 상품 진단 (테이블용 유지) ──────────────────────────────────
type DiagGrade = 'hero' | 'normal' | 'rising' | 'slow' | 'dead'

function diagnosItem(cur: PlanItem, comp?: PlanItem): DiagGrade {
  const curRate = cur.salesRate
  const compRate = comp && comp.inQty > 0
    ? (comp.saleQty / comp.inQty) * 100 : null

  if (compRate === null) {
    if (curRate >= 70) return 'hero'
    if (curRate >= 40) return 'normal'
    if (cur.recentWowAvg >= 15) return 'rising'
    if (curRate >= 20) return 'slow'
    return 'dead'
  }

  const gap = curRate - compRate
  if (gap < -20 && cur.recentWowAvg >= 15) return 'rising'
  if (gap >= 20) return 'hero'
  if (gap >= -20) return 'normal'
  if (gap >= -40) return 'slow'
  if (cur.cwAmt === 0 && cur.pwAmt === 0) return 'dead'
  return 'slow'
}

// ── 메인 ──────────────────────────────────────────────────────
export default function PlanningDashboard() {
  const { allowedBrands, loading: authLoading } = useAuth()
  const [brand, setBrand] = useState<string | null>(null)
  // API 호출용: 'all'이면서 권한 브랜드가 있으면 해당 브랜드만 전달
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  useEffect(() => {
    if (authLoading) return
    if (allowedBrands?.length === 1) setBrand(allowedBrands[0])
    else setBrand('all')
  }, [allowedBrands, authLoading])
  const [selSeason, setSelSeason] = useState(SEASON_OPTIONS[0])
  const [selGroup, setSelGroup] = useState<string>('전체')
  const [selGender, setSelGender] = useState<string>('전체')
  const [selCategory, setSelCategory] = useState('전체')

  const router = useRouter()

  const [data, setData] = useState<PlanData | null>(null)
  const [compData, setCompData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [selStyle, setSelStyle] = useState<string | null>(null)
  const [styleChannels, setStyleChannels] = useState<{ channel: string; amt: number }[]>([])
  const [styleWeekly, setStyleWeekly] = useState<{ week: number; cy: number }[] | null>(null)
  const [styleChLoading, setStyleChLoading] = useState(false)
  const [bestSort, setBestSort] = useState<'season' | 'week' | 'month' | 'rising'>('season')

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  // 전년 동시즌 자동 계산 + 동기간 맞춤
  const compYear = String(Number(selSeason.year) - 1)
  const _compLabel = selSeason.label.replace(selSeason.year, compYear)

  // 전년 동기간: 전주 일요일의 전년 동일 날짜
  const compToDt = useMemo(() => {
    const today = new Date()
    const dow = today.getDay()
    const lastSun = new Date(today)
    lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
    const ly = new Date(lastSun)
    ly.setFullYear(ly.getFullYear() - 1)
    return `${ly.getFullYear()}${String(ly.getMonth()+1).padStart(2,'0')}${String(ly.getDate()).padStart(2,'0')}`
  }, [])

  const fetchData = useCallback(async () => {
    if (brand === null) return
    setLoading(true); setError(null)
    try {
      const genderParam = selGender !== '전체' ? `&gender=${encodeURIComponent(selGender)}` : ''
      const [res, cRes] = await Promise.all([
        fetch(`/api/planning?brand=${apiBrand}&year=${selSeason.year}&season=${selSeason.season}${genderParam}`),
        fetch(`/api/planning?brand=${apiBrand}&year=${compYear}&season=${selSeason.season}&toDt=${compToDt}${genderParam}`),
      ])
      const [json, cJson] = await Promise.all([res.json(), cRes.json()])
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setCompData(cRes.ok ? cJson : null)
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [brand, apiBrand, selSeason, compYear, compToDt, selGender])

  useEffect(() => { fetchData() }, [fetchData])

  // 날씨 데이터 (한번만)
  useEffect(() => {
    fetch('/api/weather').then(r => r.json()).then(j => { if (!j.error) setWeather(j) }).catch(() => {})
  }, [])

  // 베스트 스타일 클릭 → 해당 상품 채널별 매출 조회
  const handleStyleClick = async (styleCd: string) => {
    if (selStyle === styleCd) { setSelStyle(null); setStyleChannels([]); setStyleWeekly(null); return }
    setSelStyle(styleCd)
    setStyleChLoading(true)
    try {
      const res = await fetch(`/api/planning/style-channels?styleCd=${encodeURIComponent(styleCd)}&brand=${brand}&year=${selSeason.year}&season=${encodeURIComponent(selSeason.season)}`)
      const json = await res.json()
      setStyleChannels(json.channels ?? [])
      setStyleWeekly(json.weekly ?? null)
    } catch { setStyleChannels([]); setStyleWeekly(null) }
    finally { setStyleChLoading(false) }
  }

  // 그룹(어패럴/용품) + 카테고리 필터 적용
  const visibleCategories = useMemo(() => {
    if (selGroup === '전체') return ITEM_CATEGORIES
    return ['전체', ...ITEM_CATEGORIES.filter(c => c !== '전체' && ITEM_GROUP_MAP[c] === selGroup)]
  }, [selGroup])

  // 그룹 변경 시 카테고리 리셋
  useEffect(() => { setSelCategory('전체') }, [selGroup])

  const filteredItems = useMemo(() => {
    if (!data) return []
    let items = data.items
    if (selGroup !== '전체') items = items.filter(i => ITEM_GROUP_MAP[i.category] === selGroup)
    if (selCategory !== '전체') items = items.filter(i => i.category === selCategory)
    return items
  }, [data, selGroup, selCategory])

  const filteredCompItems = useMemo(() => {
    if (!compData) return []
    let items = compData.items
    if (selGroup !== '전체') items = items.filter(i => ITEM_GROUP_MAP[i.category] === selGroup)
    if (selCategory !== '전체') items = items.filter(i => i.category === selCategory)
    return items
  }, [compData, selGroup, selCategory])

  const handleItemClick = (itemName: string) => {
    router.push(`/planning/${encodeURIComponent(itemName)}?year=${selSeason.year}&season=${encodeURIComponent(selSeason.season)}`)
  }

  // 진단 결과 계산
  const diagResults = useMemo(() => {
    const compMap = new Map((compData?.items ?? []).map(c => [c.item, c]))
    return filteredItems.map(item => ({
      ...item,
      diagnosis: diagnosItem(item, compMap.get(item.item)),
    }))
  }, [filteredItems, compData])

  // KPI (필터 적용)
  const kpiData = useMemo(() => {
    if (!data) return null
    const items = filteredItems
    const totalStyles = items.reduce((s, i) => s + i.styleCnt, 0)
    const totalSkus = items.reduce((s, i) => s + i.skuCnt, 0)
    const totalInQty = items.reduce((s, i) => s + i.inQty, 0)
    const totalSaleQty = items.reduce((s, i) => s + i.saleQty, 0)
    const totalSaleAmt = items.reduce((s, i) => s + i.saleAmt, 0)
    const totalSaleTagAmt = items.reduce((s, i) => s + i.tagAmt, 0)
    const totalSalePriceAmt = items.reduce((s, i) => s + i.salePriceAmt, 0)
    const totalCostAmt = items.reduce((s, i) => s + i.costAmt, 0)
    const totalInvTagAmt = items.reduce((s, i) => s + i.invTagAmt, 0)
    const totalInvCostAmt = items.reduce((s, i) => s + i.invCostAmt, 0)
    const totalOrdTagAmt = items.reduce((s, i) => s + i.ordTagAmt, 0)
    const totalOrdQty = items.reduce((s, i) => s + i.ordQty, 0)

    const salesRate = totalOrdQty > 0 ? Math.round(totalSaleQty / totalOrdQty * 1000) / 10 : 0
    const dcRate = totalSaleTagAmt > 0 ? Math.round((1 - totalSalePriceAmt / totalSaleTagAmt) * 1000) / 10 : 0
    const cogsRate = totalSaleAmt > 0 ? Math.round(totalCostAmt / totalSaleAmt * 1000) / 10 : 0

    const totalInAmt = items.reduce((s, i) => s + i.inAmt, 0)

    return { totalStyles, totalSkus, totalSaleAmt, totalSaleTagAmt, salesRate, dcRate, cogsRate, totalInvTagAmt, totalInvCostAmt, totalOrdTagAmt, totalInAmt }
  }, [filteredItems, data])

  const compKpi = useMemo(() => {
    if (!compData) return null
    const items = filteredCompItems
    const totalInQty = items.reduce((s, i) => s + i.inQty, 0)
    const totalSaleQty = items.reduce((s, i) => s + i.saleQty, 0)
    const totalSaleAmt = items.reduce((s, i) => s + i.saleAmt, 0)
    const totalSaleTagAmt = items.reduce((s, i) => s + i.tagAmt, 0)
    const totalSalePriceAmt = items.reduce((s, i) => s + i.salePriceAmt, 0)
    const totalCostAmt = items.reduce((s, i) => s + i.costAmt, 0)
    const totalStyles = items.reduce((s, i) => s + i.styleCnt, 0)
    const totalSkus = items.reduce((s, i) => s + i.skuCnt, 0)
    const totalInvTagAmt = items.reduce((s, i) => s + i.invTagAmt, 0)
    const totalInvCostAmt = items.reduce((s, i) => s + i.invCostAmt, 0)
    const totalOrdQty = items.reduce((s, i) => s + i.ordQty, 0)

    const salesRate = totalOrdQty > 0 ? Math.round(totalSaleQty / totalOrdQty * 1000) / 10 : 0
    const dcRate = totalSaleTagAmt > 0 ? Math.round((1 - totalSalePriceAmt / totalSaleTagAmt) * 1000) / 10 : 0
    const cogsRate = totalSaleAmt > 0 ? Math.round(totalCostAmt / totalSaleAmt * 1000) / 10 : 0

    const totalOrdTagAmt = items.reduce((s, i) => s + i.ordTagAmt, 0)
    const totalInAmt = items.reduce((s, i) => s + i.inAmt, 0)

    return { totalStyles, totalSkus, totalSaleAmt, salesRate, dcRate, cogsRate, totalInvTagAmt, totalInvCostAmt, totalOrdTagAmt, totalInAmt }
  }, [filteredCompItems, compData])

  // 어패럴/용품 + 성별 KPI 비중
  const salesBreakdown = useMemo(() => {
    if (!data) return null
    const items = data.items
    const ap = items.filter(i => ITEM_GROUP_MAP[i.category] === '어패럴')
    const gd = items.filter(i => ITEM_GROUP_MAP[i.category] === '용품')

    const sum = (arr: PlanItem[], key: keyof PlanItem) => arr.reduce((s, i) => s + (Number(i[key]) || 0), 0)
    const pct = (a: number, b: number) => (a + b) > 0 ? Math.round(a / (a + b) * 100) : 0

    // 어패럴/용품 비율
    const apSale = sum(ap, 'saleAmt'); const gdSale = sum(gd, 'saleAmt')
    const apOrd = sum(ap, 'ordTagAmt'); const gdOrd = sum(gd, 'ordTagAmt')
    const apInv = sum(ap, 'invTagAmt'); const gdInv = sum(gd, 'invTagAmt')
    const apOrdQty = sum(ap, 'ordQty'); const gdOrdQty = sum(gd, 'ordQty')
    const apSaleQty = sum(ap, 'saleQty'); const gdSaleQty = sum(gd, 'saleQty')
    const apTag = sum(ap, 'tagAmt'); const gdTag = sum(gd, 'tagAmt')
    const apSalePrice = sum(ap, 'salePriceAmt'); const gdSalePrice = sum(gd, 'salePriceAmt')
    const apSalesRate = apOrdQty > 0 ? Math.round(apSaleQty / apOrdQty * 1000) / 10 : 0
    const gdSalesRate = gdOrdQty > 0 ? Math.round(gdSaleQty / gdOrdQty * 1000) / 10 : 0
    const apDc = apTag > 0 ? Math.round((1 - apSalePrice / apTag) * 1000) / 10 : 0
    const gdDc = gdTag > 0 ? Math.round((1 - gdSalePrice / gdTag) * 1000) / 10 : 0

    // 성별: API genderSales
    const gs = data.genderSales ?? []
    const isUni = (g: string) => ['공통', '남성', '키즈공통'].includes(g)
    const sumG = (key: keyof GenderSale, filter: (g: string) => boolean) =>
      gs.filter(r => filter(r.gender)).reduce((s, r) => s + (Number(r[key]) || 0), 0)
    const wAvg = (key: keyof GenderSale, filter: (g: string) => boolean) => {
      const matched = gs.filter(r => filter(r.gender))
      if (matched.length === 0) return 0
      // amt-weighted average for rate fields
      const totalAmt = matched.reduce((s, r) => s + r.amt, 0)
      if (totalAmt === 0) return 0
      return Math.round(matched.reduce((s, r) => s + Number(r[key]) * r.amt, 0) / totalAmt * 10) / 10
    }

    const uniAmt = sumG('amt', isUni); const wAmt = sumG('amt', g => !isUni(g))
    const uniOrd = sumG('ordTagAmt', isUni); const wOrd = sumG('ordTagAmt', g => !isUni(g))
    const uniInv = sumG('invTagAmt', isUni); const wInv = sumG('invTagAmt', g => !isUni(g))
    const uniSalesRate = wAvg('salesRate', isUni); const wSalesRate = wAvg('salesRate', g => !isUni(g))
    const uniDc = wAvg('dcRate', isUni); const wDc = wAvg('dcRate', g => !isUni(g))

    return {
      // 매출
      salePct: { ap: pct(apSale, gdSale), gd: pct(gdSale, apSale), uni: pct(uniAmt, wAmt), w: pct(wAmt, uniAmt) },
      // 판매율
      salesRate: { ap: apSalesRate, gd: gdSalesRate, uni: uniSalesRate, w: wSalesRate },
      // 발주
      ordPct: { ap: pct(apOrd, gdOrd), gd: pct(gdOrd, apOrd), uni: pct(uniOrd, wOrd), w: pct(wOrd, uniOrd) },
      // 재고
      invPct: { ap: pct(apInv, gdInv), gd: pct(gdInv, apInv), uni: pct(uniInv, wInv), w: pct(wInv, uniInv) },
      // 할인율
      dcRate: { ap: apDc, gd: gdDc, uni: uniDc, w: wDc },
    }
  }, [data])

  // 판매율 도넛 차트 데이터
  const salesRatePieData = useMemo(() => {
    if (!kpiData) return []
    const rate = kpiData.salesRate
    return [
      { name: '판매', value: rate, fill: '#e91e63' },
      { name: '미판매', value: Math.max(0, 100 - rate), fill: '#f1f5f9' },
    ]
  }, [kpiData])

  return (
    <div className="flex flex-col gap-4 p-4 min-h-0">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">기획현황판</h1>
          <p className="text-xs text-gray-400 mt-0.5">시즌별 아이템 기획·실적·재고 종합 분석</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* 필터: 브랜드 + 시즌 + 카테고리 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">브랜드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleBrands.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {b.value !== 'all' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px" style={{ background: BRAND_COLORS[b.value] }} />}
              {b.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">시즌</span>
        <select value={SEASON_OPTIONS.indexOf(selSeason)}
          onChange={e => { const idx = Number(e.target.value); setSelSeason(SEASON_OPTIONS[idx]) }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          {SEASON_OPTIONS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
        </select>

        <span className="text-xs text-gray-400 ml-2">품목</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {ITEM_GROUPS.map(g => (
            <button key={g} onClick={() => setSelGroup(g)}
              className={cn('px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                selGroup === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleCategories.map(cat => (
            <button key={cat} onClick={() => setSelCategory(cat)}
              className={cn('px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                selCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {cat !== '전체' && CATEGORY_COLORS[cat] && (
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px" style={{ background: CATEGORY_COLORS[cat].text }} />
              )}
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">성별</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {GENDER_FILTERS.map(g => (
            <button key={g} onClick={() => setSelGender(g)}
              className={cn('px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                selGender === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {g}
            </button>
          ))}
        </div>

{/* 전년 비교는 KPI 블록 내 정량+정율로 표시 */}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>}

      {/* KPI 섹션 — ① 매출 ② 판매율 ③ 발주 ④ 입고 ⑤ 재고 ⑥ 할인율 */}
      <div className="grid grid-cols-6 gap-3">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[110px] bg-surface-subtle animate-pulse rounded-xl" />
        )) : kpiData && (
          <>
            {/* ① 매출 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">매출</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmtW(kpiData.totalSaleAmt)}</p>
              <p className="text-[10px] text-gray-500">{kpiData.totalStyles}st · {kpiData.totalSkus}SKU</p>
              {compKpi && (
                <div className="flex gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-medium', kpiData.totalSaleAmt >= compKpi.totalSaleAmt ? 'text-emerald-600' : 'text-red-500')}>
                    {fmtDelta(kpiData.totalSaleAmt, compKpi.totalSaleAmt).t}
                  </span>
                  <span className="text-[10px] text-gray-400">({fmtW(kpiData.totalSaleAmt - compKpi.totalSaleAmt)})</span>
                </div>
              )}
              {salesBreakdown && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <p className="text-[9px] text-gray-400">
                    어패럴 <span className="font-semibold text-gray-600">{salesBreakdown.salePct.ap}%</span>
                    <span className="mx-1">·</span>
                    용품 <span className="font-semibold text-gray-600">{salesBreakdown.salePct.gd}%</span>
                  </p>
                  <p className="text-[9px] text-gray-400">
                    유니 <span className="font-semibold text-gray-600">{salesBreakdown.salePct.uni}%</span>
                    <span className="mx-1">·</span>
                    여성 <span className="font-semibold text-gray-600">{salesBreakdown.salePct.w}%</span>
                  </p>
                </div>
              )}
            </div>

            {/* ② 판매율 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 flex flex-col items-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide w-full">판매율</p>
              <div className="relative" style={{ width: 64, height: 64 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={salesRatePieData} dataKey="value" innerRadius={20} outerRadius={30} startAngle={90} endAngle={-270} strokeWidth={0}>
                      {salesRatePieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">{kpiData.salesRate}%</span>
              </div>
              <span className={cn('text-[10px] font-medium', compKpi ? 'text-gray-600' : 'text-gray-300')}>
                {compKpi ? fmtDeltaPt(kpiData.salesRate, compKpi.salesRate).t : '—'}
              </span>
              {salesBreakdown && (
                <div className="mt-1 pt-1 border-t border-gray-100 w-full space-y-0.5">
                  <p className="text-[9px] text-gray-400">어패럴 <span className="font-semibold text-gray-600">{salesBreakdown.salesRate.ap}%</span> · 용품 <span className="font-semibold text-gray-600">{salesBreakdown.salesRate.gd}%</span></p>
                  <p className="text-[9px] text-gray-400">유니 <span className="font-semibold text-gray-600">{salesBreakdown.salesRate.uni}%</span> · 여성 <span className="font-semibold text-gray-600">{salesBreakdown.salesRate.w}%</span></p>
                </div>
              )}
            </div>

            {/* ③ 발주 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">발주(TAG)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmtW(kpiData.totalOrdTagAmt)}</p>
              {compKpi && (
                <div className="flex gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-medium', kpiData.totalOrdTagAmt >= compKpi.totalOrdTagAmt ? 'text-emerald-600' : 'text-red-500')}>
                    {fmtDelta(kpiData.totalOrdTagAmt, compKpi.totalOrdTagAmt).t}
                  </span>
                  <span className="text-[10px] text-gray-400">({fmtW(kpiData.totalOrdTagAmt - compKpi.totalOrdTagAmt)})</span>
                </div>
              )}
              {salesBreakdown && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <p className="text-[9px] text-gray-400">어패럴 <span className="font-semibold text-gray-600">{salesBreakdown.ordPct.ap}%</span> · 용품 <span className="font-semibold text-gray-600">{salesBreakdown.ordPct.gd}%</span></p>
                  <p className="text-[9px] text-gray-400">유니 <span className="font-semibold text-gray-600">{salesBreakdown.ordPct.uni}%</span> · 여성 <span className="font-semibold text-gray-600">{salesBreakdown.ordPct.w}%</span></p>
                </div>
              )}
            </div>

            {/* ④ 입고 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">입고금액</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmtW(kpiData.totalInAmt)}</p>
              <p className="text-[10px] text-gray-500">입고율 {data?.kpi.inboundRate ?? 0}%</p>
              {compKpi && (
                <div className="flex gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-medium', kpiData.totalInAmt >= compKpi.totalInAmt ? 'text-emerald-600' : 'text-red-500')}>
                    {fmtDelta(kpiData.totalInAmt, compKpi.totalInAmt).t}
                  </span>
                  <span className="text-[10px] text-gray-400">({fmtW(kpiData.totalInAmt - compKpi.totalInAmt)})</span>
                </div>
              )}
            </div>

            {/* ⑤ 재고 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">재고(TAG)</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmtW(kpiData.totalInvTagAmt)}</p>
              <p className="text-[10px] text-gray-500">원가 {fmtW(kpiData.totalInvCostAmt)}</p>
              {salesBreakdown && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <p className="text-[9px] text-gray-400">어패럴 <span className="font-semibold text-gray-600">{salesBreakdown.invPct.ap}%</span> · 용품 <span className="font-semibold text-gray-600">{salesBreakdown.invPct.gd}%</span></p>
                  <p className="text-[9px] text-gray-400">유니 <span className="font-semibold text-gray-600">{salesBreakdown.invPct.uni}%</span> · 여성 <span className="font-semibold text-gray-600">{salesBreakdown.invPct.w}%</span></p>
                </div>
              )}
            </div>

            {/* ⑥ 할인율 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">할인율</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{kpiData.dcRate}%</p>
              <span className={cn('text-[10px] font-medium', compKpi ? (kpiData.dcRate <= compKpi.dcRate ? 'text-emerald-600' : 'text-red-500') : 'text-gray-300')}>
                {compKpi ? fmtDeltaPt(kpiData.dcRate, compKpi.dcRate).t : '—'}
              </span>
              {salesBreakdown && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                  <p className="text-[9px] text-gray-400">어패럴 <span className="font-semibold text-gray-600">{salesBreakdown.dcRate.ap}%</span> · 용품 <span className="font-semibold text-gray-600">{salesBreakdown.dcRate.gd}%</span></p>
                  <p className="text-[9px] text-gray-400">유니 <span className="font-semibold text-gray-600">{salesBreakdown.dcRate.uni}%</span> · 여성 <span className="font-semibold text-gray-600">{salesBreakdown.dcRate.w}%</span></p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 베스트 스타일 + 채널별 매출비중 + 날씨 추천 */}
      {!loading && data && (
        <div className="grid grid-cols-12 gap-3">
          {/* 베스트 스타일 TOP10 */}
          <div className="col-span-5 bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">베스트 스타일 TOP10</span>
              <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
                {([['season', '시즌누적'], ['month', '최근4주'], ['week', '전주'], ['rising', '급상승']] as ['season'|'month'|'week'|'rising', string][]).map(([k, l]) => (
                  <button key={k} onClick={() => setBestSort(k)}
                    className={cn('px-2 py-0.5 text-[10px] font-medium rounded transition-colors',
                      bestSort === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
              <table className="w-full text-[11px] table-fixed">
                <colgroup>
                  <col style={{ width: 22 }} />
                  <col style={{ width: 60 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 40 }} />
                  <col style={{ width: 60 }} />
                  <col style={{ width: 50 }} />
                  <col style={{ width: 40 }} />
                </colgroup>
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                    <th className="text-center px-1 py-1.5">#</th>
                    <th className="text-left px-1 py-1.5">코드</th>
                    <th className="text-left px-1 py-1.5">상품명</th>
                    <th className="text-left px-1 py-1.5">품목</th>
                    <th className="text-right px-1 py-1.5">매출</th>
                    <th className="text-right px-1 py-1.5">수량</th>
                    <th className="text-right px-1 py-1.5">WoW</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let styles = [...(data.topStyles ?? [])]
                    if (bestSort === 'week') styles.sort((a, b) => b.cwAmt - a.cwAmt)
                    else if (bestSort === 'month') styles.sort((a, b) => b.m4Amt - a.m4Amt)
                    else if (bestSort === 'rising') {
                      const cwAmts = styles.map(s => s.cwAmt).filter(a => a > 0).sort((a, b) => b - a)
                      const median = cwAmts.length > 0 ? cwAmts[Math.floor(cwAmts.length / 2)] : 0
                      styles = styles.filter(s => s.cwAmt >= median && s.pwAmt > 0)
                      styles.sort((a, b) => b.wow - a.wow)
                    }
                    return styles.slice(0, 10).map((s: TopStyle, i: number) => {
                      const amt = bestSort === 'week' || bestSort === 'rising' ? s.cwAmt : bestSort === 'month' ? s.m4Amt : s.saleAmt
                      const qty = bestSort === 'week' || bestSort === 'rising' ? s.cwQty : bestSort === 'month' ? s.m4Qty : s.saleQty
                      return (
                        <tr key={s.styleCd} onClick={() => handleStyleClick(s.styleCd)}
                          className={cn('border-b border-gray-50 cursor-pointer transition-colors',
                            selStyle === s.styleCd ? 'bg-pink-50' : 'hover:bg-gray-50/50')}>
                          <td className="text-center px-1 py-1.5 font-bold text-gray-400">{i + 1}</td>
                          <td className="px-1 py-1.5 font-mono text-[9px] text-gray-400 truncate">{s.styleCd}</td>
                          <td className="px-1 py-1.5 text-gray-800 font-medium truncate" title={s.styleNm}>{s.styleNm}</td>
                          <td className="px-1 py-1.5 text-[10px] text-gray-500 truncate">{s.item}</td>
                          <td className="px-1 py-1.5 text-right font-mono text-gray-700">{fmtW(amt)}</td>
                          <td className="px-1 py-1.5 text-right font-mono text-gray-500">{qty.toLocaleString()}</td>
                          <td className={cn('px-1 py-1.5 text-right font-mono font-semibold',
                            s.wow > 0 ? 'text-red-500' : s.wow < 0 ? 'text-blue-500' : 'text-gray-400')}>
                            {s.pwAmt > 0 ? `${s.wow > 0 ? '+' : ''}${s.wow}%` : '—'}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* 채널별 매출 비중 + 주간 차트 */}
          <div className="col-span-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
            {/* 채널별 매출 비중 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3" style={{ minHeight: 160 }}>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-semibold text-gray-700">
                  채널별 매출 비중
                  {selStyle && <span className="ml-1 text-pink-600 font-normal text-[10px]">· {(data.topStyles ?? []).find(s => s.styleCd === selStyle)?.styleNm ?? selStyle}</span>}
                </h3>
                {selStyle && (
                  <button onClick={() => { setSelStyle(null); setStyleChannels([]); setStyleWeekly(null) }}
                    className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">전체</button>
                )}
              </div>
              {(() => {
                const chData = selStyle ? styleChannels : data.channels
                if (styleChLoading) return <div className="text-xs text-gray-300 text-center py-3">로딩 중...</div>
                if (chData.length === 0) return <div className="text-xs text-gray-300 text-center py-3">데이터 없음</div>
                const totalAmt = chData.reduce((s, c) => s + c.amt, 0)
                const sorted = [...chData].sort((a, b) => b.amt - a.amt).slice(0, 6)
                return (
                  <div className="space-y-1">
                    {sorted.map(ch => {
                      const pct = totalAmt > 0 ? Math.round(ch.amt / totalAmt * 1000) / 10 : 0
                      return (
                        <div key={ch.channel} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 w-[72px] truncate">{ch.channel}</span>
                          <div className="flex-1 h-3.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-gray-700 w-[36px] text-right">{pct}%</span>
                          <span className="text-[10px] font-mono text-gray-400 w-[50px] text-right">{fmtW(ch.amt)}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            {/* 52주 주간 매출 추이 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold text-gray-700">
                  주간 매출 추이
                  {selStyle
                    ? <span className="text-[10px] text-pink-600 font-normal ml-1">· {(data.topStyles ?? []).find(s => s.styleCd === selStyle)?.styleNm ?? selStyle}</span>
                    : <span className="text-[10px] text-gray-400 font-normal ml-1">{selSeason.label}</span>
                  }
                </h3>
                <div className="flex items-center gap-3 text-[9px]">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500 inline-block" />금년</span>
                  {!selStyle && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '2px dashed #9ca3af' }} />전년</span>}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={(() => {
                  const raw = selStyle && styleWeekly ? styleWeekly : data.weeklyTrend
                  // 전주 일요일 마감 기준 — 해당 주차까지만 금년 선 표시
                  const lastCyWeek = raw.reduce((max, w) => w.cy > 0 ? Math.max(max, w.week) : max, 0)
                  return raw.map(w => ({ ...w, cy: w.week <= lastCyWeek ? w.cy : null }))
                })()} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                  <XAxis dataKey="week" type="number" domain={[1, 52]}
                    ticks={[1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48]}
                    tickFormatter={(w) => { const l = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']; const i = [1,5,9,14,18,22,27,31,35,40,44,48].indexOf(w); return i >= 0 ? l[i] : '' }}
                    tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  />
                  <YAxis tickFormatter={v => fmtW(v)} tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip formatter={(v: number, name: string) => [fmtW(v), name === 'cy' ? '금년' : '전년']} labelFormatter={(w) => `W${w}`} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  {!selStyle && <Line type="monotone" dataKey="ly" name="전년" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls />}
                  <Line type="monotone" dataKey="cy" name="금년" stroke="#e91e63" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 날씨 기반 추천 */}
          {weather && (
            <div className="col-span-3 bg-gradient-to-b from-sky-50 to-blue-50 rounded-xl border border-sky-200 shadow-sm p-4 flex flex-col gap-2.5">
              <h3 className="text-base font-bold text-sky-800">날씨 기반 추천</h3>
              <div className="flex flex-wrap gap-1.5">
                {weather.temps.slice(0, 10).map(t => {
                  const isWeekend = t.day === '토' || t.day === '일'
                  const wIcon = t.weather === '비' || t.weather === '소나기' ? '🌧' : t.weather === '눈' || t.weather === '비/눈' ? '🌨' : t.weather === '흐림' ? '☁' : t.weather === '구름' ? '⛅' : t.weather === '맑음' ? '☀' : '·'
                  const rainPct = (t as any).rainPct as number | undefined
                  return (
                    <div key={t.date} className={cn('flex flex-col items-center min-w-[36px] rounded-lg py-1', isWeekend && 'bg-sky-100/50')}>
                      <span className={cn('text-xs font-semibold', isWeekend ? 'text-red-400' : 'text-sky-500')}>{t.day}</span>
                      <span className="text-[11px] text-sky-400">{t.dateLabel}</span>
                      <span className="text-lg leading-none my-0.5">{wIcon}</span>
                      <span className="text-sm font-bold text-sky-800">{t.tmx ?? '?'}°</span>
                      <span className="text-xs text-sky-400">{t.tmn ?? '?'}°</span>
                      {rainPct != null && rainPct > 0 && (
                        <span className={cn('text-[9px] font-semibold mt-0.5', rainPct >= 60 ? 'text-blue-600' : 'text-sky-400')}>{rainPct}%</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="text-sm text-sky-600 font-semibold">3일 평균 {weather.avgTemp}°C{weather.laterAvg != null ? ` · 후반 ${weather.laterAvg}°C` : ''}</div>
              {weather.recommendations.map((rec, i) => (
                <div key={i}>
                  <span className="text-sm font-bold text-sky-700">{rec.period ? `[${rec.period}] ` : ''}{rec.label}:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {rec.items.map(item => (
                      <span key={item} className="px-2.5 py-1 text-xs rounded-full bg-white/70 text-sky-700 border border-sky-200 font-semibold">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
              {weather.tempTrend && <p className="text-sm text-sky-700 font-bold mt-2">{weather.tempTrend}</p>}
              {weather.alerts && weather.alerts.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {weather.alerts.map((a, i) => (
                    <p key={i} className="text-sm text-sky-600">· {a}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 품목별 상세 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">
          품목별 기획·판매·재고 현황
          <span className="ml-2 font-normal text-gray-400">{selSeason.label} · {selCategory !== '전체' ? selCategory + ' · ' : ''}품목 클릭 시 상세 페이지</span>
        </h3>
        <PlanningItemTable
          items={diagResults}
          compItems={filteredCompItems}
          loading={loading}
          onItemClick={handleItemClick}
        />
      </div>
    </div>
  )
}
