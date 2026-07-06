'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { RefreshCw, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BRAND_COLORS, BRAND_TABS,
  ITEM_CATEGORY_MAP, ITEM_CATEGORIES, ITEM_GROUP_MAP, ITEM_GROUPS,
} from '@/lib/constants'
import { fmt, channelParamsFromSet } from '@/lib/sales-types'
import { useAuth } from '@/contexts/AuthContext'

const YEAR_TABS = [
  { label: '2026년', value: '2026' },
  { label: '2025년', value: '2025' },
]

const CHANNEL_GROUPS = ['전체', '오프라인', '온라인', '해외'] as const
type ChannelGroupTab = typeof CHANNEL_GROUPS[number]

// 개별 채널 목록 (SHOPTYPENM)
const CHANNELS = [
  '백화점', '아울렛', '대리점', '직영점', '면세점', '쇼핑몰', '오프라인 위탁', '본사매장', '팝업',
  '온라인(자사몰)', '온라인(위탁몰)', '온라인(무신사)', '온라인B2B', '해외 사입', '해외 위탁',
]

type Metric = 'yoy' | 'wow' | 'rev'
const METRICS: { key: Metric; label: string }[] = [
  { key: 'yoy', label: '전년비 YoY' },
  { key: 'wow', label: '전주비 WoW' },
  { key: 'rev', label: '매출액' },
]

interface ItemRow {
  item: string
  cy: Record<number, number>
  ly: Record<number, number>
  qty: Record<number, number>
}

function getLastSunday(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

const getCat = (item: string): string => ITEM_CATEGORY_MAP[item] ?? '기타'

// 성장률(%) → 셀 색상 (앱 관례: 양=빨강, 음=파랑)
function growthColor(v: number | null): { bg: string; color: string } {
  if (v == null) return { bg: 'transparent', color: '#cbd5e1' }
  const t = Math.min(Math.abs(v) / 80, 1)
  if (v >= 0) return { bg: `rgba(233,30,99,${0.08 + 0.62 * t})`, color: t > 0.55 ? '#fff' : '#9d174d' }
  return { bg: `rgba(37,99,235,${0.08 + 0.62 * t})`, color: t > 0.55 ? '#fff' : '#1e40af' }
}
// 매출 절대값 → 단색 농도 (emerald)
function revColor(v: number, max: number): { bg: string; color: string } {
  if (v <= 0) return { bg: 'transparent', color: '#cbd5e1' }
  const t = max > 0 ? Math.min(v / max, 1) : 0
  return { bg: `rgba(16,185,129,${0.08 + 0.62 * t})`, color: t > 0.55 ? '#fff' : '#065f46' }
}

export default function CategoryTrendPage() {
  const { allowedBrands, loading: authLoading } = useAuth()

  const [brand, setBrand] = useState('all')
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  useEffect(() => {
    if (authLoading) return
    if (allowedBrands?.length === 1) setBrand(allowedBrands[0])
  }, [allowedBrands, authLoading])

  const visibleBrandTabs = allowedBrands
    ? [
        ...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
        ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value)),
      ]
    : BRAND_TABS

  const [year, setYear] = useState('2026')
  const [metric, setMetric] = useState<Metric>('yoy')
  const [grpTab, setGrpTab] = useState<ChannelGroupTab>('전체')
  const [selChannels, setSelChannels] = useState<Set<string>>(new Set())
  const [showChannels, setShowChannels] = useState(false)
  const [itemGroup, setItemGroup] = useState<string>('전체')  // 어패럴/용품/전체
  const [topN, setTopN] = useState<number | 'all'>(20)  // 베스트 품목 표시 개수
  const [weekWindow, setWeekWindow] = useState<number | 'all'>(12)  // 최근 N주만 표시

  // 펼친 품목의 채널별 분해 (어느 채널에서 떨어졌는지)
  const [detailRows, setDetailRows] = useState<ItemRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const [items, setItems] = useState<ItemRow[]>([])
  const [maxWeek, setMaxWeek] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const lastSunday = useMemo(getLastSunday, [])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    const toDt = year === String(new Date().getFullYear()) ? lastSunday : `${year}1231`
    const chParam = selChannels.size > 0
      ? channelParamsFromSet(selChannels)
      : (grpTab !== '전체' ? `&channelGroup=${encodeURIComponent(grpTab)}` : '')
    try {
      const res = await fetch(`/api/sales/category-weekly?brand=${apiBrand}&toDt=${toDt}${chParam}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setItems(json.items ?? [])
      setMaxWeek(json.maxWeek ?? 0)
    } catch (e) { setError(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [apiBrand, year, grpTab, selChannels, lastSunday])

  useEffect(() => { fetchData() }, [fetchData])

  const weekNums = useMemo(() => Array.from({ length: maxWeek }, (_, i) => i + 1), [maxWeek])

  // 카테고리 → 품목 그룹핑 (해당 그룹 필터 적용, 품목은 금년 매출 합 내림차순)
  const catGroups = useMemo(() => {
    const byCat = new Map<string, ItemRow[]>()
    for (const it of items) {
      const cat = getCat(it.item)
      if (itemGroup !== '전체' && ITEM_GROUP_MAP[cat] !== itemGroup) continue
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(it)
    }
    const catOrder = ITEM_CATEGORIES.filter(c => c !== '전체')
    const totalCy = (r: ItemRow) => Object.values(r.cy).reduce((s, v) => s + v, 0)
    return catOrder
      .filter(c => byCat.has(c))
      .map(cat => {
        const rows = byCat.get(cat)!.sort((a, b) => totalCy(b) - totalCy(a))
        // 카테고리 합계 (주차별 cy/ly)
        const cy: Record<number, number> = {}
        const ly: Record<number, number> = {}
        for (const r of rows) {
          for (const w of weekNums) {
            if (r.cy[w]) cy[w] = (cy[w] || 0) + r.cy[w]
            if (r.ly[w]) ly[w] = (ly[w] || 0) + r.ly[w]
          }
        }
        return { cat, rows, agg: { item: cat, cy, ly, qty: {} } as ItemRow, total: Object.values(cy).reduce((s, v) => s + v, 0) }
      })
      .filter(g => g.total > 0)
  }, [items, itemGroup, weekNums])

  // 베스트 품목 평면 리스트 (매출순, Top N)
  const flatItems = useMemo(() => {
    const totalCy = (r: ItemRow) => Object.values(r.cy).reduce((s, v) => s + v, 0)
    const list = items
      .filter(it => itemGroup === '전체' || ITEM_GROUP_MAP[getCat(it.item)] === itemGroup)
      .filter(it => totalCy(it) > 0)
      .sort((a, b) => totalCy(b) - totalCy(a))
    return typeof topN === 'number' ? list.slice(0, topN) : list
  }, [items, itemGroup, topN])

  // rev 모드용 최대값 (색상 정규화 — 표시되는 품목/주차 기준)
  const maxRev = useMemo(() => {
    if (metric !== 'rev') return 0
    const rows = topN === 'all' ? catGroups.flatMap(g => g.rows) : flatItems
    const wks = weekWindow === 'all' ? weekNums : weekNums.slice(-weekWindow)
    let m = 0
    for (const r of rows) for (const w of wks) { const v = r.cy[w] ?? 0; if (v > m) m = v }
    return m
  }, [metric, topN, catGroups, flatItems, weekNums, weekWindow])

  // 셀 값 계산
  const cellValue = (cy: Record<number, number>, ly: Record<number, number>, w: number): number | null => {
    const c = cy[w]
    if (metric === 'rev') return c != null ? c : null
    if (metric === 'yoy') {
      const l = ly[w] ?? 0
      if (l <= 0) return null
      return ((c ?? 0) - l) / l * 100
    }
    // wow
    const p = cy[w - 1] ?? 0
    if (p <= 0) return null
    return ((c ?? 0) - p) / p * 100
  }

  const cellStyle = (cy: Record<number, number>, ly: Record<number, number>, w: number, maxRevOverride?: number) => {
    const v = cellValue(cy, ly, w)
    if (metric === 'rev') return { ...revColor(cy[w] ?? 0, maxRevOverride ?? maxRev), v }
    return { ...growthColor(v), v }
  }

  // 셀 두 줄: 절대액수(백만) + 성장률(%). 지표에 따라 강조 줄만 바뀜
  const cellInner = (cy: Record<number, number>, ly: Record<number, number>, w: number) => {
    const c = cy[w]
    const absM = c != null && c > 0 ? String(Math.round(c / 1e6)) : ''
    const l = ly[w] ?? 0, p = cy[w - 1] ?? 0
    const yoy = l > 0 ? Math.round(((c ?? 0) - l) / l * 100) : null
    const wow = p > 0 ? Math.round(((c ?? 0) - p) / p * 100) : null
    const g = metric === 'wow' ? wow : yoy
    const gTxt = g == null ? '' : `${g >= 0 ? '+' : ''}${g}%`
    // rev 모드: 매출 강조 + 성장률(%) 보조 / yoy·wow 모드: 성장률 강조 + 매출 보조
    const primary = metric === 'rev' ? absM : (gTxt || (absM ? '·' : ''))
    const secondary = metric === 'rev' ? gTxt : absM
    if (!primary && !secondary) return null
    return (
      <div className="leading-[1.05] py-0.5">
        <div className="font-medium">{primary || ' '}</div>
        {secondary ? <div className="text-[8px] opacity-70">{secondary}</div> : null}
      </div>
    )
  }

  const cellTitle = (label: string, cy: Record<number, number>, ly: Record<number, number>, w: number): string => {
    const c = cy[w] ?? 0, l = ly[w] ?? 0, p = cy[w - 1] ?? 0
    const yoy = l > 0 ? Math.round((c - l) / l * 100) : null
    const wow = p > 0 ? Math.round((c - p) / p * 100) : null
    return [
      `W${w} · ${label}`,
      `금년 ${fmt(c)} / 전년 ${fmt(l)} / 전주 ${fmt(p)}`,
      `YoY ${yoy == null ? '—' : (yoy >= 0 ? '+' : '') + yoy + '%'} · WoW ${wow == null ? '—' : (wow >= 0 ? '+' : '') + wow + '%'}`,
    ].join('\n')
  }

  const toggleCat = (cat: string) => setCollapsed(prev => {
    const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n
  })
  const toggleChannel = (ch: string) => setSelChannels(prev => {
    const n = new Set(prev); n.has(ch) ? n.delete(ch) : n.add(ch); return n
  })

  // 표시할 주차 (최근 N주). WoW는 전주 데이터가 maps에 그대로 있어 영향 없음
  const displayWeeks = useMemo(
    () => (weekWindow === 'all' ? weekNums : weekNums.slice(-weekWindow)),
    [weekNums, weekWindow],
  )

  // 품목 클릭 → 채널별 분해 fetch
  useEffect(() => {
    if (!expandedItem) { setDetailRows([]); return }
    let cancelled = false
    setDetailLoading(true)
    const toDt = year === String(new Date().getFullYear()) ? lastSunday : `${year}1231`
    fetch(`/api/sales/category-weekly?brand=${apiBrand}&toDt=${toDt}&item=${encodeURIComponent(expandedItem)}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setDetailRows(j.items ?? []) })
      .catch(() => { if (!cancelled) setDetailRows([]) })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [expandedItem, apiBrand, year, lastSunday])

  // 채널 상세: 매출순 정렬 + rev 색상 정규화 max
  const detailSorted = useMemo(() => {
    const totalCy = (r: ItemRow) => Object.values(r.cy).reduce((s, v) => s + v, 0)
    return [...detailRows].filter(r => totalCy(r) > 0).sort((a, b) => totalCy(b) - totalCy(a))
  }, [detailRows])
  const detailMaxRev = useMemo(() => {
    let m = 0
    for (const r of detailSorted) for (const w of displayWeeks) { const v = r.cy[w] ?? 0; if (v > m) m = v }
    return m
  }, [detailSorted, displayWeeks])

  const colW = 'w-12 min-w-[3rem]'
  const metricLabel = METRICS.find(m => m.key === metric)?.label ?? ''

  // 품목 행 + (펼침 시) 채널별 주간 히트맵
  const renderItemRow = (r: ItemRow, keyPrefix: string, indent: boolean, showCat: boolean) => (
    <Fragment key={`${keyPrefix}-${r.item}`}>
      <tr className="border-b border-surface-border/50 hover:bg-amber-50/40 cursor-pointer"
        onClick={() => setExpandedItem(prev => prev === r.item ? null : r.item)}>
        <td className={cn('px-2 py-1.5 sticky left-0 z-10 text-gray-600 whitespace-nowrap',
          indent && 'pl-6', expandedItem === r.item ? 'bg-amber-50' : 'bg-white')}>
          <span className="flex items-center gap-1.5">
            {showCat && <span className="text-[9px] px-1 rounded bg-gray-100 text-gray-500">{getCat(r.item)}</span>}
            <span className={expandedItem === r.item ? 'font-semibold text-gray-900' : ''}>{r.item}</span>
          </span>
        </td>
        {displayWeeks.map(w => {
          const s = cellStyle(r.cy, r.ly, w)
          return (
            <td key={w} className={cn('text-center tabular-nums', colW)}
              style={{ background: s.bg, color: s.color }} title={cellTitle(r.item, r.cy, r.ly, w)}>
              {cellInner(r.cy, r.ly, w)}
            </td>
          )
        })}
      </tr>
      {expandedItem === r.item && (
        <tr>
          <td colSpan={displayWeeks.length + 1} className="p-3 bg-amber-50/30 border-b border-surface-border">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">
              {r.item} · 채널별 주간 {metricLabel}
              <span className="font-normal text-gray-400 ml-1">— 어느 채널에서 변화했는지 (전 채널)</span>
            </div>
            {detailLoading ? (
              <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-5 bg-white/70 animate-pulse rounded" />)}</div>
            ) : detailSorted.length === 0 ? (
              <div className="text-[10px] text-gray-400 py-2">채널 데이터 없음</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="text-[10px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-2 py-1 sticky left-0 bg-amber-50 w-[110px] min-w-[110px] text-gray-400 font-medium">채널</th>
                      {displayWeeks.map(w => <th key={w} className={cn('py-1 text-center text-gray-400 font-medium', colW)}>W{w}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {detailSorted.map(ch => (
                      <tr key={ch.item} className="border-t border-amber-100/70">
                        <td className="px-2 py-1 sticky left-0 bg-amber-50 text-gray-600 whitespace-nowrap">{ch.item}</td>
                        {displayWeeks.map(w => {
                          const s = cellStyle(ch.cy, ch.ly, w, detailMaxRev)
                          return (
                            <td key={w} className={cn('text-center tabular-nums', colW)}
                              style={{ background: s.bg, color: s.color }} title={cellTitle(ch.item, ch.cy, ch.ly, w)}>
                              {cellInner(ch.cy, ch.ly, w)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  )

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">카테고리 주간 성장 추이</h1>
          <p className="text-xs text-gray-400 mt-0.5">품목 × 주차 히트맵 · 채널별 · 부가세 제외 · 매출 단위: 백만원</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle transition-colors">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">브랜드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleBrandTabs.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {b.value !== 'all' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px" style={{ background: BRAND_COLORS[b.value] }} />}
              {b.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-1">연도</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {YEAR_TABS.map(y => (
            <button key={y.value} onClick={() => setYear(y.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                year === y.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {y.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-1">지표</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => setMetric(m.key)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                metric === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 채널/품목그룹 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">채널</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {CHANNEL_GROUPS.map(g => (
            <button key={g} onClick={() => { setGrpTab(g); setSelChannels(new Set()) }}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                selChannels.size === 0 && grpTab === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {g}
            </button>
          ))}
        </div>
        <button onClick={() => setShowChannels(v => !v)}
          className={cn('flex items-center gap-1 text-xs border rounded-lg px-2.5 py-1.5 transition-colors',
            selChannels.size > 0 ? 'border-brand-accent/40 text-brand-accent bg-brand-accent-light' : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
          개별 채널{selChannels.size > 0 ? ` (${selChannels.size})` : ''}
          {showChannels ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        {selChannels.size > 0 && (
          <button onClick={() => setSelChannels(new Set())} className="text-[10px] text-gray-400 hover:text-gray-600 underline">해제</button>
        )}

        <span className="text-xs text-gray-400 ml-2">품목군</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {ITEM_GROUPS.map(g => (
            <button key={g} onClick={() => setItemGroup(g)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                itemGroup === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {g}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">표시</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {([['10', 10], ['20', 20], ['30', 30], ['전체', 'all']] as [string, number | 'all'][]).map(([label, v]) => (
            <button key={label} onClick={() => setTopN(v)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                topN === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {label === '전체' ? '전체' : `베스트 ${label}`}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">주차</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {([['8', 8], ['12', 12], ['전체', 'all']] as [string, number | 'all'][]).map(([label, v]) => (
            <button key={label} onClick={() => setWeekWindow(v)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                weekWindow === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {label === '전체' ? '전체' : `최근 ${label}주`}
            </button>
          ))}
        </div>
      </div>

      {showChannels && (
        <div className="flex flex-wrap gap-1 p-2 bg-surface-subtle rounded-lg">
          {CHANNELS.map(ch => (
            <button key={ch} onClick={() => toggleChannel(ch)}
              className={cn('px-2 py-0.5 text-[11px] rounded-full border transition-colors',
                selChannels.has(ch) ? 'bg-brand-accent text-white border-brand-accent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400')}>
              {ch}
            </button>
          ))}
        </div>
      )}

      {/* 범례 */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
        {metric === 'rev' ? (
          <span className="flex items-center gap-1"><span className="w-8 h-3 rounded" style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.1), rgba(16,185,129,0.7))' }} /> 색=매출 크기 · 셀: 윗줄 매출(백만) / 아랫줄 YoY%</span>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="w-8 h-3 rounded" style={{ background: 'linear-gradient(90deg, rgba(37,99,235,0.7), rgba(37,99,235,0.1))' }} /> 감소</span>
            <span className="flex items-center gap-1"><span className="w-8 h-3 rounded" style={{ background: 'linear-gradient(90deg, rgba(233,30,99,0.1), rgba(233,30,99,0.7))' }} /> 증가</span>
            <span className="text-gray-400">셀: 윗줄 {metricLabel}(%) / 아랫줄 매출(백만) · · = 비교 기준 없음</span>
          </>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>}

      {/* 히트맵 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-7 bg-surface-subtle animate-pulse rounded" />)}</div>
        ) : (topN === 'all' ? catGroups.length === 0 : flatItems.length === 0) ? (
          <div className="py-12 text-center text-xs text-gray-400">데이터 없음</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-[11px] border-collapse">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 border-b border-surface-border">
                  <th className="text-left px-3 py-2 sticky left-0 bg-gray-50 z-30 w-[150px] min-w-[150px] text-gray-500 font-semibold">
                    {topN === 'all' ? '품목 / 카테고리' : `베스트 품목 (${flatItems.length})`}
                  </th>
                  {displayWeeks.map(w => (
                    <th key={w} className={cn('px-0 py-2 text-center text-gray-400 font-medium', colW)}>W{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topN === 'all'
                  ? catGroups.map(g => {
                      const isCollapsed = collapsed.has(g.cat)
                      return (
                        <Fragment key={g.cat}>
                          {/* 카테고리 합계 행 */}
                          <tr className="border-b border-surface-border bg-gray-50/60 cursor-pointer hover:bg-gray-100/60"
                            onClick={() => toggleCat(g.cat)}>
                            <td className="px-2 py-1.5 sticky left-0 bg-gray-50/95 z-10 font-semibold text-gray-800">
                              <span className="flex items-center gap-1">
                                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                {g.cat}
                                <span className="text-[9px] text-gray-400 font-normal">({g.rows.length})</span>
                              </span>
                            </td>
                            {displayWeeks.map(w => {
                              const s = cellStyle(g.agg.cy, g.agg.ly, w)
                              return (
                                <td key={w} className={cn('text-center font-semibold tabular-nums', colW)}
                                  style={{ background: s.bg, color: s.color }}
                                  title={cellTitle(g.cat, g.agg.cy, g.agg.ly, w)}>
                                  {cellInner(g.agg.cy, g.agg.ly, w)}
                                </td>
                              )
                            })}
                          </tr>
                          {!isCollapsed && g.rows.map(r => renderItemRow(r, g.cat, true, false))}
                        </Fragment>
                      )
                    })
                  : flatItems.map(r => renderItemRow(r, 'flat', false, true))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
