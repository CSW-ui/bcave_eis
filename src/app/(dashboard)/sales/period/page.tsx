'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_TABS, brandNameToCode } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData } from '@/hooks/useTargetData'
import { getChannelGroup, type ChannelGroup, CHANNEL_GROUP_ORDER } from '@/lib/sales-types'

const fmtE = (v: number) => Math.round(v / 1e6).toLocaleString()

const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄', year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
]

const ADULT_BRANDS = ['CO', 'LE', 'WA']
const KIDS_BRANDS = ['CK', 'LK']

const CHANNEL_OPTIONS = ['백화점', '아울렛', '직영점', '쇼핑몰', '대리점', '면세점', '본사매장', '팝업', '오프라인 사입', '오프라인 위탁', '온라인(무신사)', '온라인(위탁몰)', '온라인(자사몰)', '온라인B2B', '해외 사입', '해외 위탁']

interface ChannelRow {
  brandcd: string; brandnm: string; channel: string
  rev: number; lyRev: number; yoy: number | null
  shopCnt: number; lyShopCnt: number
  dcRate: number; lyDcRate: number; cogsRate: number; lyCogsRate: number
  normRev: number; lyNormRev: number; normYoy: number | null
  normDcRate: number; lyNormDcRate: number; normCogsRate: number; lyNormCogsRate: number; normRatio: number
  coRev: number; lyCoRev: number; coYoy: number | null
  coDcRate: number; lyCoDcRate: number; coCogsRate: number; lyCoCogsRate: number
}

interface AggRow {
  rev: number; lyRev: number; yoy: number | null
  shopCnt: number; lyShopCnt: number
  dcRate: number; lyDcRate: number; cogsRate: number; lyCogsRate: number
  normRev: number; lyNormRev: number; normYoy: number | null
  normDcRate: number; lyNormDcRate: number; normCogsRate: number; lyNormCogsRate: number; normRatio: number
  coRev: number; lyCoRev: number; coYoy: number | null
  coDcRate: number; lyCoDcRate: number; coCogsRate: number; lyCoCogsRate: number
}

const EXCLUDE_SHOP_CNT = ['오프라인 위탁', '온라인B2B', '해외 사입']
const SINGLE_SHOP_CHANNELS = ['온라인(무신사)', '온라인(위탁몰)', '온라인(자사몰)']

function sumRows(rows: ChannelRow[]): AggRow {
  let rev = 0, lyRev = 0, nRev = 0, lyNRev = 0, cRev = 0, lyCRev = 0
  let shopCnt = 0, lyShopCnt = 0
  let dcW = 0, cgW = 0, lyDcW = 0, lyCgW = 0
  let nDcW = 0, nCgW = 0, lyNDcW = 0, lyNCgW = 0, cDcW = 0, cCgW = 0, lyCDcW = 0, lyCCgW = 0
  for (const r of rows) {
    rev += r.rev; lyRev += r.lyRev
    if (!EXCLUDE_SHOP_CNT.includes(r.channel)) {
      const cyS = SINGLE_SHOP_CHANNELS.includes(r.channel) ? (r.shopCnt > 0 ? 1 : 0) : r.shopCnt
      const lyS = SINGLE_SHOP_CHANNELS.includes(r.channel) ? (r.lyShopCnt > 0 ? 1 : 0) : r.lyShopCnt
      shopCnt += cyS; lyShopCnt += lyS
    }
    dcW += r.dcRate * r.rev; cgW += r.cogsRate * r.rev
    lyDcW += r.lyDcRate * r.lyRev; lyCgW += r.lyCogsRate * r.lyRev
    nRev += r.normRev; lyNRev += r.lyNormRev; cRev += r.coRev; lyCRev += r.lyCoRev
    nDcW += r.normDcRate * r.normRev; nCgW += r.normCogsRate * r.normRev
    lyNDcW += r.lyNormDcRate * r.lyNormRev; lyNCgW += r.lyNormCogsRate * r.lyNormRev
    cDcW += r.coDcRate * r.coRev; cCgW += r.coCogsRate * r.coRev
    lyCDcW += r.lyCoDcRate * r.lyCoRev; lyCCgW += r.lyCoCogsRate * r.lyCoRev
  }
  const y = (a: number, b: number) => b > 0 ? Math.round((a - b) / b * 1000) / 10 : null
  const w = (v: number, d: number) => d > 0 ? Math.round(v / d * 10) / 10 : 0
  return {
    rev, lyRev, yoy: y(rev, lyRev), shopCnt, lyShopCnt,
    dcRate: w(dcW, rev), lyDcRate: w(lyDcW, lyRev),
    cogsRate: w(cgW, rev), lyCogsRate: w(lyCgW, lyRev),
    normRev: nRev, lyNormRev: lyNRev, normYoy: y(nRev, lyNRev),
    normDcRate: w(nDcW, nRev), lyNormDcRate: w(lyNDcW, lyNRev),
    normCogsRate: w(nCgW, nRev), lyNormCogsRate: w(lyNCgW, lyNRev),
    normRatio: rev > 0 ? Math.round(nRev / rev * 1000) / 10 : 0,
    coRev: cRev, lyCoRev: lyCRev, coYoy: y(cRev, lyCRev),
    coDcRate: w(cDcW, cRev), lyCoDcRate: w(lyCDcW, lyCRev),
    coCogsRate: w(cCgW, cRev), lyCoCogsRate: w(lyCCgW, lyCRev),
  }
}

export default function PeriodPage() {
  const { allowedBrands, loading: authLoading } = useAuth()
  const { targets } = useTargetData()
  const [brand, setBrand] = useState<string | null>(null)
  useEffect(() => {
    if (authLoading) return
    if (allowedBrands?.length === 1) setBrand(allowedBrands[0])
    else setBrand('all')
  }, [allowedBrands, authLoading])
  const [selChannels, setSelChannels] = useState<Set<string>>(new Set())
  const [chDropdownOpen, setChDropdownOpen] = useState(false)
  const toggleChannel = (ch: string) => {
    setSelChannels(prev => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch); else next.add(ch)
      return next
    })
  }
  const [selSeason, setSelSeason] = useState(SEASON_OPTIONS[0])
  // 기간비교 기본값: 금년 1/1~전일, 전년 동기간
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayDt = new Date(); yesterdayDt.setDate(yesterdayDt.getDate() - 1)
  const yesterdayStr = yesterdayDt.toISOString().slice(0, 10)
  const cyYear = new Date().getFullYear()
  const defaultFromDt = `${cyYear}-01-01`
  const defaultToDt = yesterdayStr
  const defaultLyFromDt = `${cyYear - 1}-01-01`
  const defaultLyToDt = `${cyYear - 1}-${yesterdayStr.slice(5)}`
  const [fromDt, setFromDt] = useState(defaultFromDt)
  const [toDt, setToDt] = useState(defaultToDt)
  const [lyFromDt, setLyFromDt] = useState(defaultLyFromDt)
  const [lyToDt, setLyToDt] = useState(defaultLyToDt)
  const [loading, setLoading] = useState(true)
  const [brandData, setBrandData] = useState<Map<string, ChannelRow[]>>(new Map())

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  const individualBrands = useMemo(() => {
    if (brand !== 'all') return []
    return BRAND_TABS.filter(b => b.value !== 'all' && (!allowedBrands || allowedBrands.includes(b.value)))
  }, [brand, allowedBrands])

  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand

  const fetchData = useCallback(async () => {
    if (brand === null) return
    setLoading(true)
    try {
      const base = `/api/sales/period?year=${selSeason.year}&season=${encodeURIComponent(selSeason.season)}&fromDt=${fromDt.replace(/-/g, '')}&toDt=${toDt.replace(/-/g, '')}&lyFromDt=${lyFromDt.replace(/-/g, '')}&lyToDt=${lyToDt.replace(/-/g, '')}`

      if (individualBrands.length > 1) {
        const adultCodes = individualBrands.filter(b => ADULT_BRANDS.includes(b.value)).map(b => b.value).join(',')
        const kidsCodes = individualBrands.filter(b => KIDS_BRANDS.includes(b.value)).map(b => b.value).join(',')
        const results = await Promise.all([
          fetch(`${base}&brand=${apiBrand}`).then(r => r.json()),
          ...(adultCodes ? [fetch(`${base}&brand=${adultCodes}`).then(r => r.json())] : [Promise.resolve({ rows: [] })]),
          ...(kidsCodes ? [fetch(`${base}&brand=${kidsCodes}`).then(r => r.json())] : [Promise.resolve({ rows: [] })]),
          ...individualBrands.map(b => fetch(`${base}&brand=${b.value}`).then(r => r.json())),
        ])
        const map = new Map<string, ChannelRow[]>()
        map.set('all', results[0].rows ?? [])
        map.set('adult', results[1].rows ?? [])
        map.set('kids', results[2].rows ?? [])
        individualBrands.forEach((b, i) => map.set(b.value, results[i + 3].rows ?? []))
        setBrandData(map)
      } else {
        const res = await fetch(`${base}&brand=${apiBrand}`)
        const json = await res.json()
        const map = new Map<string, ChannelRow[]>()
        map.set(brand, json.rows ?? [])
        setBrandData(map)
      }
    } catch {}
    finally { setLoading(false) }
  }, [brand, apiBrand, selSeason, fromDt, toDt, lyFromDt, lyToDt, individualBrands])

  useEffect(() => { fetchData() }, [fetchData])

  // 섹션: TOTAL → 성인합산 → 브랜드 → 키즈합산 → 브랜드
  type Section = { key: string; label: string; rows: ChannelRow[]; indent?: number; isSummary?: boolean }
  const sections = useMemo<Section[]>(() => {
    const result: Section[] = []
    const allRows = brandData.get('all') ?? brandData.get(brand) ?? []
    result.push({ key: 'all', label: 'TOTAL', rows: allRows, isSummary: true })

    if (individualBrands.length > 1) {
      const adult = individualBrands.filter(b => ADULT_BRANDS.includes(b.value))
      const kids = individualBrands.filter(b => KIDS_BRANDS.includes(b.value))
      if (adult.length > 0) {
        // 성인합산: API에서 DISTINCT로 집계된 데이터 사용 (점포수 중복 제거)
        result.push({ key: 'adult', label: '성인 합산', rows: brandData.get('adult') ?? adult.flatMap(b => brandData.get(b.value) ?? []), isSummary: true })
        for (const b of adult) result.push({ key: b.value, label: b.label, rows: brandData.get(b.value) ?? [], indent: 1 })
      }
      if (kids.length > 0) {
        result.push({ key: 'kids', label: '키즈 합산', rows: brandData.get('kids') ?? kids.flatMap(b => brandData.get(b.value) ?? []), isSummary: true })
        for (const b of kids) result.push({ key: b.value, label: b.label, rows: brandData.get(b.value) ?? [], indent: 1 })
      }
    }
    return result
  }, [brandData, brand, individualBrands])

  // 채널 필터 적용
  const matchesChannelFilter = (channel: string) => {
    if (selChannels.size === 0) return true
    if (!channel) return false
    return Array.from(selChannels).some(sel => channel.includes(sel) || sel.includes(channel))
  }

  // 채널 → 그룹 → 개별 채널
  const groupChannels = (rows: ChannelRow[]) => {
    const filteredRows = rows.filter(r => matchesChannelFilter(r.channel))
    const groups = new Map<ChannelGroup, ChannelRow[]>()
    for (const g of CHANNEL_GROUP_ORDER) groups.set(g, [])
    for (const r of filteredRows) groups.get(getChannelGroup(r.channel))!.push(r)
    return CHANNEL_GROUP_ORDER.map(g => {
      const chRows = groups.get(g)!
      const chMap = new Map<string, ChannelRow[]>()
      for (const r of chRows) { if (!chMap.has(r.channel)) chMap.set(r.channel, []); chMap.get(r.channel)!.push(r) }
      return {
        group: g,
        agg: sumRows(chRows),
        channels: Array.from(chMap.entries())
          .map(([ch, rs]) => ({ channel: ch, agg: sumRows(rs) }))
          .sort((a, b) => b.agg.rev - a.agg.rev),
      }
    }).filter(g => g.channels.length > 0)
  }

  const filterRowsByGroup = (rows: ChannelRow[]) => rows.filter(r => matchesChannelFilter(r.channel))

  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set(['all', 'adult', 'kids', 'CO', 'LE', 'WA', 'CK', 'LK']))
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const cellBase = 'py-1.5 px-1.5 text-right font-mono text-[11px] whitespace-nowrap'

  const renderPt = (cur: number, prev: number) => {
    const d = Math.round((cur - prev) * 10) / 10
    if (d === 0) return <span className="text-gray-400">0p</span>
    return <span className={cn('font-semibold', d > 0 ? 'text-red-500' : 'text-blue-500')}>{d > 0 ? '+' : ''}{d}p</span>
  }
  const renderYoy = (yoy: number | null) => {
    if (yoy === null) return '—'
    return <span className={cn('font-semibold', yoy >= 0 ? 'text-red-500' : 'text-blue-500')}>{yoy >= 0 ? '+' : ''}{yoy}%</span>
  }

  const bg = (isTotal: boolean) => isTotal ? 'bg-gray-100' : ''
  const renderGap = (cy: number, ly: number) => {
    const gap = cy - ly
    if (ly === 0 && cy === 0) return '—'
    return <span className={cn('font-mono', gap >= 0 ? 'text-red-500' : 'text-blue-500')}>{gap >= 0 ? '+' : ''}{fmtE(gap)}</span>
  }
  const renderRow = (label: React.ReactNode, a: AggRow, isTotal: boolean, totalRev?: number, channelName?: string) => {
    const share = totalRev && totalRev > 0 ? Math.round(a.rev / totalRev * 1000) / 10 : null
    const hideShop = channelName && EXCLUDE_SHOP_CNT.includes(channelName)
    const isSingleShop = channelName && SINGLE_SHOP_CHANNELS.includes(channelName)
    const dispShopCnt = hideShop ? 0 : isSingleShop ? (a.shopCnt > 0 ? 1 : 0) : a.shopCnt
    const dispLyShopCnt = hideShop ? 0 : isSingleShop ? (a.lyShopCnt > 0 ? 1 : 0) : a.lyShopCnt
    return (
    <>
      <td className={cn('py-1.5 px-1.5 sticky left-0 z-10 whitespace-nowrap text-xs w-[160px] min-w-[160px]', bg(isTotal))} style={{ boxShadow: '4px 0 8px -2px rgba(0,0,0,0.1)' }}>{label}</td>
      {/* 점포 */}
      <td className={cn(cellBase, 'text-gray-600', bg(isTotal))}>{hideShop ? '—' : (dispShopCnt || '—')}</td>
      <td className={cn(cellBase, 'text-gray-400', bg(isTotal))}>
        {hideShop ? '—' : (dispShopCnt && dispLyShopCnt ? <span className={cn('font-semibold', dispShopCnt >= dispLyShopCnt ? 'text-red-500' : 'text-blue-500')}>{dispShopCnt >= dispLyShopCnt ? '+' : ''}{dispShopCnt - dispLyShopCnt}</span> : '—')}
      </td>
      {/* 총 매출 */}
      <td className={cn(cellBase, 'font-semibold text-gray-900', bg(isTotal))}>{fmtE(a.rev)}</td>
      <td className={cn(cellBase, 'text-gray-400', bg(isTotal))}>{share !== null ? `${share}%` : ''}</td>
      <td className={cn(cellBase, 'text-gray-500', bg(isTotal))}>{fmtE(a.lyRev)}</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderYoy(a.yoy)}</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderGap(a.rev, a.lyRev)}</td>
      <td className={cn(cellBase, 'text-gray-700', bg(isTotal))}>{a.dcRate}%</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderPt(a.dcRate, a.lyDcRate)}</td>
      <td className={cn(cellBase, 'text-gray-700', bg(isTotal))}>{a.cogsRate}%</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderPt(a.cogsRate, a.lyCogsRate)}</td>
      {/* 정상 매출 */}
      <td className={cn(cellBase, 'font-semibold text-gray-800', bg(isTotal))}>{fmtE(a.normRev)}</td>
      <td className={cn(cellBase, 'text-gray-400', bg(isTotal))}>{a.normRatio}%</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderPt(a.normRatio, a.lyRev > 0 ? Math.round(a.lyNormRev / a.lyRev * 1000) / 10 : a.normRatio)}</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderYoy(a.normYoy)}</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderGap(a.normRev, a.lyNormRev)}</td>
      <td className={cn(cellBase, 'text-gray-700', bg(isTotal))}>{a.normDcRate}%</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderPt(a.normDcRate, a.lyNormDcRate)}</td>
      <td className={cn(cellBase, 'text-gray-700', bg(isTotal))}>{a.normCogsRate}%</td>
      <td className={cn(cellBase, bg(isTotal))}>{renderPt(a.normCogsRate, a.lyNormCogsRate)}</td>
      {/* 이월 매출 */}
      <td className={cn(cellBase, 'font-semibold text-amber-700', bg(isTotal))}>{a.coRev ? fmtE(a.coRev) : '—'}</td>
      <td className={cn(cellBase, bg(isTotal))}>{a.coRev ? renderYoy(a.coYoy) : '—'}</td>
      <td className={cn(cellBase, bg(isTotal))}>{a.coRev || a.lyCoRev ? renderGap(a.coRev, a.lyCoRev) : '—'}</td>
      <td className={cn(cellBase, 'text-gray-600', bg(isTotal))}>{a.coRev ? `${a.coDcRate}%` : '—'}</td>
      <td className={cn(cellBase, bg(isTotal))}>{a.coRev ? renderPt(a.coDcRate, a.lyCoDcRate) : '—'}</td>
      <td className={cn(cellBase, 'text-gray-600', bg(isTotal))}>{a.coRev ? `${a.coCogsRate}%` : '—'}</td>
      <td className={cn(cellBase, bg(isTotal))}>{a.coRev ? renderPt(a.coCogsRate, a.lyCoCogsRate) : '—'}</td>
    </>
  )}

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">채널판매현황</h1>
          <p className="text-xs text-gray-400 mt-0.5">브랜드×채널별 매출·수익성 종합 분석</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-subtle">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">브랜드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleBrands.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{b.label}</button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-2">채널</span>
        <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setChDropdownOpen(false) }}>
          <button onClick={() => setChDropdownOpen(p => !p)}
            className={cn('text-xs border rounded-lg px-3 py-1.5 bg-white flex items-center gap-1.5 min-w-[100px]',
              selChannels.size > 0 ? 'border-brand-accent text-brand-accent' : 'border-gray-200 text-gray-500')}>
            {selChannels.size === 0 ? '전체' : `${selChannels.size}개 선택`}
            <ChevronDown size={12} />
          </button>
          {chDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 p-1.5 min-w-[160px]">
              <button onClick={() => { setSelChannels(new Set()); setChDropdownOpen(false) }}
                className={cn('w-full text-left px-2 py-1 text-[11px] rounded hover:bg-gray-50', selChannels.size === 0 && 'font-semibold text-brand-accent')}>전체</button>
              {CHANNEL_OPTIONS.map(ch => (
                <button key={ch} onClick={() => toggleChannel(ch)}
                  className={cn('w-full text-left px-2 py-1 text-[11px] rounded hover:bg-gray-50 flex items-center gap-1.5',
                    selChannels.has(ch) && 'font-semibold text-brand-accent')}>
                  <span className={cn('w-3 h-3 rounded border flex items-center justify-center text-[8px]',
                    selChannels.has(ch) ? 'bg-brand-accent border-brand-accent text-white' : 'border-gray-300')}>
                    {selChannels.has(ch) && '✓'}
                  </span>
                  {ch}
                </button>
              ))}
            </div>
          )}
        </div>
        {selChannels.size > 0 && (
          <div className="flex flex-wrap gap-1">
            {Array.from(selChannels).map(ch => (
              <button key={ch} onClick={() => toggleChannel(ch)}
                className="text-[10px] text-brand-accent border border-brand-accent/30 rounded-full px-2 py-0.5 hover:bg-brand-accent/5">
                {ch} ×
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-gray-400 ml-2">시즌</span>
        <select value={SEASON_OPTIONS.indexOf(selSeason)} onChange={e => setSelSeason(SEASON_OPTIONS[Number(e.target.value)])}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          {SEASON_OPTIONS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
        </select>

        <span className="text-xs text-gray-400 ml-3">기간</span>
        <input type="date" value={fromDt} onChange={e => setFromDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
        <span className="text-xs text-gray-300">~</span>
        <input type="date" value={toDt} onChange={e => setToDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
        <span className="text-xs text-gray-400 ml-1">전년</span>
        <input type="date" value={lyFromDt} onChange={e => setLyFromDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
        <span className="text-xs text-gray-300">~</span>
        <input type="date" value={lyToDt} onChange={e => setLyToDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 1900 }}>
              <thead>
                <tr className="bg-gray-800">
                  <th rowSpan={2} className="text-left px-1.5 py-1.5 sticky left-0 bg-gray-800 z-20 w-[160px] min-w-[160px] text-[11px] text-gray-300 font-bold" style={{ boxShadow: '4px 0 8px -2px rgba(0,0,0,0.2)' }}>구분</th>
                  <th colSpan={2} className="text-center px-1.5 py-1.5 text-[11px] text-gray-300 font-bold border-l border-gray-600">점포</th>
                  <th colSpan={9} className="text-center px-1.5 py-1.5 text-[11px] text-gray-200 font-bold border-l border-gray-600">총 매출</th>
                  <th colSpan={9} className="text-center px-1.5 py-1.5 text-[11px] text-gray-200 font-bold border-l border-gray-600">정상 매출</th>
                  <th colSpan={7} className="text-center px-1.5 py-1.5 text-[11px] text-amber-300 font-bold border-l border-gray-600">이월 매출</th>
                </tr>
                <tr className="bg-gray-700 border-b-2 border-gray-400 text-[11px] text-gray-300 font-medium">
                  {/* 점포 */}
                  <th className="text-right px-1.5 py-1.5 border-l border-gray-500">점포수</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  {/* 총 매출 */}
                  <th className="text-right px-1.5 py-1.5 border-l border-gray-500">매출</th>
                  <th className="text-right px-1.5 py-1.5">비중</th>
                  <th className="text-right px-1.5 py-1.5">전년</th>
                  <th className="text-right px-1.5 py-1.5">신장률</th>
                  <th className="text-right px-1.5 py-1.5">GAP</th>
                  <th className="text-right px-1.5 py-1.5">할인율</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  <th className="text-right px-1.5 py-1.5">원가율</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  {/* 정상 */}
                  <th className="text-right px-1.5 py-1.5 border-l border-gray-500">매출</th>
                  <th className="text-right px-1.5 py-1.5">비중</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  <th className="text-right px-1.5 py-1.5">신장률</th>
                  <th className="text-right px-1.5 py-1.5">GAP</th>
                  <th className="text-right px-1.5 py-1.5">할인율</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  <th className="text-right px-1.5 py-1.5">원가율</th>
                  <th className="text-right px-1.5 py-1.5">전년비</th>
                  {/* 이월 */}
                  <th className="text-right px-1.5 py-1.5 border-l border-gray-500 text-amber-400/80">매출</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">신장률</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">GAP</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">할인율</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">전년비</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">원가율</th>
                  <th className="text-right px-1.5 py-1.5 text-amber-400/80">전년비</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(sec => {
                  const isSummary = sec.isSummary
                  const isTotal = sec.key === 'all'
                  const isGroupSummary = sec.key === 'adult' || sec.key === 'kids'
                  const isBrand = !isSummary
                  const isBrandCollapsed = collapsedBrands.has(sec.key)
                  const indent = (sec as any).indent ?? 0
                  const secAgg = sumRows(filterRowsByGroup(sec.rows))
                  const grouped = groupChannels(sec.rows)

                  return (
                    <Fragment key={sec.key}>
                      <tr className={cn('font-semibold cursor-pointer',
                        isTotal ? 'bg-gray-100 border-b-2 border-gray-300' :
                        isGroupSummary ? 'bg-gray-50 border-b-2 border-gray-200' :
                        'bg-white border-b border-gray-200')}
                        onClick={() => setCollapsedBrands(p => { const n = new Set(p); if (n.has(sec.key)) n.delete(sec.key); else n.add(sec.key); return n })}>
                        {renderRow(
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: indent * 16 }}>
                            {isBrandCollapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
                            <span className={cn('font-bold', isTotal ? 'text-gray-900' : isGroupSummary ? 'text-gray-800' : 'text-gray-700')}>{sec.label}</span>
                          </div>,
                          secAgg, isTotal || isGroupSummary, secAgg.rev,
                        )}
                      </tr>

                      {!isBrandCollapsed && grouped.map(g => {
                        const gKey = `${sec.key}::${g.group}`
                        const isOpen = expandedGroups.has(gKey)
                        return (
                          <Fragment key={gKey}>
                            <tr className="bg-gray-50/50 border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                              onClick={() => setExpandedGroups(p => { const n = new Set(p); if (n.has(gKey)) n.delete(gKey); else n.add(gKey); return n })}>
                              {renderRow(
                                <div className="flex items-center gap-1.5" style={{ paddingLeft: (indent + 1) * 16 }}>
                                  {isOpen ? <ChevronDown size={10} className="text-gray-300" /> : <ChevronRight size={10} className="text-gray-300" />}
                                  <span className="text-[11px] font-semibold text-gray-700">{g.group}</span>
                                  <span className="text-[10px] text-gray-400">{g.channels.length}</span>
                                </div>,
                                g.agg, false, secAgg.rev,
                              )}
                            </tr>
                            {isOpen && g.channels.map((ch, ci) => (
                              <tr key={ch.channel} className={cn('border-b border-gray-50', ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                                {renderRow(
                                  <div style={{ paddingLeft: (indent + 2) * 16 }}>
                                    <span className="text-[11px] text-gray-600">{ch.channel}</span>
                                  </div>,
                                  ch.agg, false, secAgg.rev, ch.channel,
                                )}
                              </tr>
                            ))}
                          </Fragment>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
