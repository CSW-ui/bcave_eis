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

const GROUP_COLORS: Record<string, string> = { '오프라인': '#3b82f6', '온라인': '#e91e63', '해외': '#10b981' }

interface ChannelRow {
  brandcd: string; brandnm: string; channel: string
  rev: number; lyRev: number; qty: number; lyQty: number
  yoy: number | null; dcRate: number; lyDcRate: number; cogsRate: number; lyCogsRate: number
}

interface AggRow { rev: number; lyRev: number; qty: number; lyQty: number; yoy: number | null; dcRate: number; lyDcRate: number; cogsRate: number; lyCogsRate: number }

function sumRows(rows: { rev: number; lyRev: number; qty: number; lyQty: number; dcRate: number; lyDcRate: number; cogsRate: number; lyCogsRate: number }[]): AggRow {
  let rev = 0, lyRev = 0, qty = 0, lyQty = 0, wDc = 0, wCogs = 0, wLyDc = 0, wLyCogs = 0
  for (const r of rows) {
    rev += r.rev; lyRev += r.lyRev; qty += r.qty; lyQty += r.lyQty
    wDc += r.dcRate * r.rev; wCogs += r.cogsRate * r.rev
    wLyDc += r.lyDcRate * r.lyRev; wLyCogs += r.lyCogsRate * r.lyRev
  }
  return {
    rev, lyRev, qty, lyQty,
    yoy: lyRev > 0 ? Math.round((rev - lyRev) / lyRev * 1000) / 10 : null,
    dcRate: rev > 0 ? Math.round(wDc / rev * 10) / 10 : 0,
    lyDcRate: lyRev > 0 ? Math.round(wLyDc / lyRev * 10) / 10 : 0,
    cogsRate: rev > 0 ? Math.round(wCogs / rev * 10) / 10 : 0,
    lyCogsRate: lyRev > 0 ? Math.round(wLyCogs / lyRev * 10) / 10 : 0,
  }
}

export default function PeriodPage() {
  const { allowedBrands } = useAuth()
  const { targets } = useTargetData()
  const [brand, setBrand] = useState('all')
  const [selSeason, setSelSeason] = useState(SEASON_OPTIONS[0])
  const [mode, setMode] = useState<'season' | 'custom'>('season')
  const [fromDt, setFromDt] = useState('')
  const [toDt, setToDt] = useState('')
  const [lyFromDt, setLyFromDt] = useState('')
  const [lyToDt, setLyToDt] = useState('')
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
    setLoading(true)
    try {
      const base = mode === 'season'
        ? `/api/sales/period?year=${selSeason.year}&season=${encodeURIComponent(selSeason.season)}`
        : `/api/sales/period?fromDt=${fromDt.replace(/-/g, '')}&toDt=${toDt.replace(/-/g, '')}&lyFromDt=${lyFromDt.replace(/-/g, '')}&lyToDt=${lyToDt.replace(/-/g, '')}`

      if (individualBrands.length > 1) {
        const results = await Promise.all([
          fetch(`${base}&brand=${apiBrand}`).then(r => r.json()),
          ...individualBrands.map(b => fetch(`${base}&brand=${b.value}`).then(r => r.json())),
        ])
        const map = new Map<string, ChannelRow[]>()
        map.set('all', results[0].rows ?? [])
        individualBrands.forEach((b, i) => map.set(b.value, results[i + 1].rows ?? []))
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
  }, [brand, apiBrand, selSeason, mode, fromDt, toDt, lyFromDt, lyToDt, individualBrands])

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
        result.push({ key: 'adult', label: '성인 합산', rows: adult.flatMap(b => brandData.get(b.value) ?? []), isSummary: true })
        for (const b of adult) result.push({ key: b.value, label: b.label, rows: brandData.get(b.value) ?? [], indent: 1 })
      }
      if (kids.length > 0) {
        result.push({ key: 'kids', label: '키즈 합산', rows: kids.flatMap(b => brandData.get(b.value) ?? []), isSummary: true })
        for (const b of kids) result.push({ key: b.value, label: b.label, rows: brandData.get(b.value) ?? [], indent: 1 })
      }
    }
    return result
  }, [brandData, brand, individualBrands])

  // 채널 → 그룹 → 개별 채널
  const groupChannels = (rows: ChannelRow[]) => {
    const groups = new Map<ChannelGroup, ChannelRow[]>()
    for (const g of CHANNEL_GROUP_ORDER) groups.set(g, [])
    for (const r of rows) groups.get(getChannelGroup(r.channel))!.push(r)
    return CHANNEL_GROUP_ORDER.map(g => {
      const chRows = groups.get(g)!
      // 채널별 합산
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

  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set(['CO', 'LE', 'WA', 'CK', 'LK']))
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

  const renderRow = (label: React.ReactNode, agg: AggRow, isTotal: boolean) => (
    <>
      <td className={cn('py-1.5 px-1.5 sticky left-0 z-10 whitespace-nowrap text-xs w-[180px] min-w-[180px]', isTotal ? 'bg-gray-100' : '')}>{label}</td>
      <td className={cn(cellBase, 'font-semibold text-gray-900', isTotal && 'bg-gray-100')}>{fmtE(agg.rev)}</td>
      <td className={cn(cellBase, 'text-gray-500', isTotal && 'bg-gray-100')}>{fmtE(agg.lyRev)}</td>
      <td className={cn(cellBase, isTotal && 'bg-gray-100')}>{renderYoy(agg.yoy)}</td>
      <td className={cn(cellBase, 'text-gray-700', isTotal && 'bg-gray-100')}>{agg.dcRate}%</td>
      <td className={cn(cellBase, isTotal && 'bg-gray-100')}>{renderPt(agg.dcRate, agg.lyDcRate)}</td>
      <td className={cn(cellBase, 'text-gray-700', isTotal && 'bg-gray-100')}>{agg.cogsRate}%</td>
      <td className={cn(cellBase, isTotal && 'bg-gray-100')}>{renderPt(agg.cogsRate, agg.lyCogsRate)}</td>
    </>
  )

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">시즌/기간 분석</h1>
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
        <span className="text-xs text-gray-400 ml-2">모드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          <button onClick={() => setMode('season')} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', mode === 'season' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>시즌</button>
          <button onClick={() => setMode('custom')} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', mode === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>기간비교</button>
        </div>
        {mode === 'season' ? (
          <>
            <span className="text-xs text-gray-400 ml-2">시즌</span>
            <select value={SEASON_OPTIONS.indexOf(selSeason)} onChange={e => setSelSeason(SEASON_OPTIONS[Number(e.target.value)])}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
              {SEASON_OPTIONS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
            </select>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400 ml-2">금년</span>
            <input type="date" value={fromDt} onChange={e => setFromDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            <span className="text-xs text-gray-300">~</span>
            <input type="date" value={toDt} onChange={e => setToDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            <span className="text-xs text-gray-400 ml-2">전년</span>
            <input type="date" value={lyFromDt} onChange={e => setLyFromDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            <span className="text-xs text-gray-300">~</span>
            <input type="date" value={lyToDt} onChange={e => setLyToDt(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
            <button onClick={fetchData} className="text-xs text-white bg-brand-accent rounded-lg px-3 py-1.5">조회</button>
          </>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 850 }}>
              <thead>
                <tr className="bg-gray-800 text-gray-300 text-[11px] font-bold">
                  <th className="text-left px-1.5 py-2 sticky left-0 bg-gray-800 z-20 w-[180px] min-w-[180px]">구분</th>
                  <th className="text-right px-1.5 py-2">매출</th>
                  <th className="text-right px-1.5 py-2">전년</th>
                  <th className="text-right px-1.5 py-2">신장률</th>
                  <th className="text-right px-1.5 py-2">할인율</th>
                  <th className="text-right px-1.5 py-2">전년비</th>
                  <th className="text-right px-1.5 py-2">원가율</th>
                  <th className="text-right px-1.5 py-2">전년비</th>
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
                  const secAgg = sumRows(sec.rows)
                  const grouped = groupChannels(sec.rows)

                  return (
                    <Fragment key={sec.key}>
                      <tr className={cn('font-semibold',
                        isTotal ? 'bg-gray-100 border-b-2 border-gray-300' :
                        isGroupSummary ? 'bg-gray-50 border-b-2 border-gray-200' :
                        'bg-white border-b border-gray-200')}
                        onClick={isBrand ? () => setCollapsedBrands(p => { const n = new Set(p); if (n.has(sec.key)) n.delete(sec.key); else n.add(sec.key); return n }) : undefined}
                        style={isBrand ? { cursor: 'pointer' } : undefined}>
                        {renderRow(
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: indent * 16 }}>
                            {isBrand && (isBrandCollapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />)}
                            <span className={cn('font-bold', isTotal ? 'text-gray-900' : isGroupSummary ? 'text-gray-800' : 'text-gray-700')}>{sec.label}</span>
                          </div>,
                          secAgg, isTotal || isGroupSummary,
                        )}
                      </tr>

                      {isBrand && !isBrandCollapsed && grouped.map(g => {
                        const gKey = `${sec.key}::${g.group}`
                        const isOpen = expandedGroups.has(gKey)
                        return (
                          <Fragment key={gKey}>
                            <tr className="bg-gray-50/50 border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                              onClick={() => setExpandedGroups(p => { const n = new Set(p); if (n.has(gKey)) n.delete(gKey); else n.add(gKey); return n })}>
                              {renderRow(
                                <div className="flex items-center gap-1.5" style={{ paddingLeft: (indent + 1) * 16 }}>
                                  {isOpen ? <ChevronDown size={10} className="text-gray-300" /> : <ChevronRight size={10} className="text-gray-300" />}
                                  <span className="text-[11px] font-semibold" style={{ color: GROUP_COLORS[g.group] }}>{g.group}</span>
                                  <span className="text-[10px] text-gray-400">{g.channels.length}</span>
                                </div>,
                                g.agg, false,
                              )}
                            </tr>
                            {isOpen && g.channels.map((ch, ci) => (
                              <tr key={ch.channel} className={cn('border-b border-gray-50', ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                                {renderRow(
                                  <div style={{ paddingLeft: (indent + 2) * 16 }}>
                                    <span className="text-[11px] text-gray-600">{ch.channel}</span>
                                  </div>,
                                  ch.agg, false,
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
