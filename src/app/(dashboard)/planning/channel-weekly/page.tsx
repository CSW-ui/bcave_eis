'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { fmtW } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { BRAND_TABS } from '@/lib/constants'

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
]

interface WRow { week: number; key: string; vin: 'N' | 'C'; cyAmt: number; cyQty: number; cyTag: number; lyAmt: number; lyQty: number; lyTag: number }
type Metric = 'amt' | 'qty'
type Gran = 'week' | 'month'

export default function ChannelWeeklyPage() {
  const { allowedBrands, loading: authLoading } = useAuth()
  const [brand, setBrand] = useState<string | null>(null)
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  const [selSeason, setSelSeason] = useState(SEASON_OPTIONS[0])
  const [metric, setMetric] = useState<Metric>('amt')
  const [gran, setGran] = useState<Gran>('week')
  const [selChannel, setSelChannel] = useState<string | null>(null)
  const [selItem, setSelItem] = useState<string | null>(null)

  const [channelWeekly, setChannelWeekly] = useState<WRow[]>([])
  const [itemWeekly, setItemWeekly] = useState<WRow[]>([])
  const [weekDates, setWeekDates] = useState<Record<number, string>>({})
  const [chLoading, setChLoading] = useState(true)
  const [itemLoading, setItemLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    setBrand(allowedBrands?.length === 1 ? allowedBrands[0] : 'all')
  }, [allowedBrands, authLoading])

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  const base = `/api/planning/channel-item-weekly?brand=${apiBrand}&year=${selSeason.year}&season=${encodeURIComponent(selSeason.season)}&gran=${gran}`

  const fetchChannels = useCallback(async () => {
    if (!apiBrand) return
    setChLoading(true)
    try {
      const itemParam = selItem ? `&item=${encodeURIComponent(selItem)}` : ''
      const j = await (await fetch(`${base}&only=channel${itemParam}`)).json()
      setChannelWeekly(j.channelWeekly ?? [])
      setWeekDates(prev => ({ ...prev, ...(j.weekDates ?? {}) }))
    } catch { setChannelWeekly([]) }
    finally { setChLoading(false) }
  }, [base, apiBrand, selItem])

  const fetchItems = useCallback(async () => {
    if (!apiBrand) return
    setItemLoading(true)
    try {
      const chParam = selChannel ? `&channel=${encodeURIComponent(selChannel)}` : ''
      const j = await (await fetch(`${base}&only=item${chParam}`)).json()
      setItemWeekly(j.itemWeekly ?? [])
      setWeekDates(prev => ({ ...prev, ...(j.weekDates ?? {}) }))
    } catch { setItemWeekly([]) }
    finally { setItemLoading(false) }
  }, [base, apiBrand, selChannel])

  useEffect(() => { fetchChannels() }, [fetchChannels])
  useEffect(() => { fetchItems() }, [fetchItems])

  const weeks = useMemo(() => {
    // 마감 안된 당주(주간)·당월(월간) 제외 기준
    const n = new Date()
    let cutoff: string
    if (gran === 'month') {
      cutoff = `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}01` // 이번 달 1일
    } else {
      const mon = new Date(n); mon.setDate(n.getDate() - ((n.getDay() + 6) % 7)) // 이번 주 월요일
      cutoff = `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`
    }
    return Array.from(new Set([...channelWeekly, ...itemWeekly].filter(r => r.cyAmt > 0 || r.cyQty > 0).map(r => r.week)))
      .filter(w => { const s = weekDates[w]; return !s || s < cutoff }) // 버킷 시작일이 기준 이전 = 마감된 것만
      .sort((a, b) => a - b)
  }, [channelWeekly, itemWeekly, weekDates, gran])

  const onBrandSeason = (fn: () => void) => { setSelChannel(null); setSelItem(null); fn() }
  const clickChannel = (k: string) => { setSelItem(null); setSelChannel(prev => prev === k ? null : k) }
  const clickItem = (k: string) => { setSelChannel(null); setSelItem(prev => prev === k ? null : k) }

  const Toggle = <T extends string>({ val, set, opts }: { val: T; set: (v: T) => void; opts: [T, string][] }) => (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-[11px]">
      {opts.map(([v, label]) => (
        <button key={v} onClick={() => set(v)}
          className={cn('px-2.5 py-1 rounded-md font-medium transition-all', val === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
          {label}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">채널 × 품목 {gran === 'month' ? '월간' : '주간'} 실적</h1>
          <p className="text-sm text-gray-500 mt-0.5">정상/이월 분리 · 행 클릭 시 반대 표가 그 기준으로 변동 · {gran === 'month' ? '월 기준' : '주 시작일(월) 기준'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Toggle val={gran} set={setGran} opts={[['week', '주간'], ['month', '월간']]} />
          <Toggle val={metric} set={setMetric} opts={[['amt', '금액'], ['qty', '수량']]} />
          <select value={SEASON_OPTIONS.indexOf(selSeason)}
            onChange={e => onBrandSeason(() => setSelSeason(SEASON_OPTIONS[Number(e.target.value)]))}
            className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent">
            {SEASON_OPTIONS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit text-xs">
        {visibleBrands.map(b => (
          <button key={b.value} onClick={() => onBrandSeason(() => setBrand(b.value))}
            className={cn('px-3 py-1.5 rounded-md font-medium transition-all', brand === b.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {b.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {/* 좌측: 채널 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-700">
              채널별 {gran === 'month' ? '월간' : '주간'} 실적
              <span className={cn('ml-2 font-medium', selItem ? 'text-pink-600' : 'text-gray-400')}>· {selItem ?? '전체 품목'}</span>
              <span className="ml-2 font-normal text-gray-400">{gran === 'month' ? '월별' : '주차별'} 실적({metric === 'amt' ? '백만원' : '개'})·할인율·{gran === 'month' ? '전월비' : '전주비'}·전년비 · 행 클릭 시 우측 변동</span>
            </h3>
            {selItem && <button onClick={() => setSelItem(null)} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-0.5">전체 품목으로</button>}
          </div>
          <WeeklyMatrix rows={channelWeekly} weeks={weeks} weekDates={weekDates} metric={metric} gran={gran}
            firstCol="채널" loading={chLoading} selectedKey={selChannel} onRowClick={clickChannel} />
        </div>

        {/* 우측: 품목 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-700">
              품목별 {gran === 'month' ? '월간' : '주간'} 실적
              <span className={cn('ml-2 font-medium', selChannel ? 'text-pink-600' : 'text-gray-400')}>· {selChannel ?? '전체 채널'}</span>
              <span className="ml-2 font-normal text-gray-400">{gran === 'month' ? '월별' : '주차별'} 실적({metric === 'amt' ? '백만원' : '개'})·할인율·{gran === 'month' ? '전월비' : '전주비'}·전년비 · 행 클릭 시 좌측 변동</span>
            </h3>
            {selChannel && <button onClick={() => setSelChannel(null)} className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-0.5">전체 채널로</button>}
          </div>
          <WeeklyMatrix rows={itemWeekly} weeks={weeks} weekDates={weekDates} metric={metric} gran={gran}
            firstCol="품목" loading={itemLoading} selectedKey={selItem} onRowClick={clickItem} />
        </div>
      </div>
    </div>
  )
}

// ── 주간 매트릭스 (정상/이월/전체 + 주차별 실적·할인·전주비·전년비) ──
interface WkCell { amt: number; qty: number; tag: number }
interface VinData { wk: Record<number, WkCell>; lyWk: Record<number, WkCell>; sumAmt: number; sumQty: number; sumTag: number; lyAmt: number; lyQty: number; lyTag: number }

function WeeklyMatrix({ rows, weeks, weekDates, metric, gran, firstCol, loading, selectedKey, onRowClick }: {
  rows: WRow[]; weeks: number[]; weekDates: Record<number, string>; metric: Metric; gran: Gran
  firstCol: string; loading?: boolean; selectedKey?: string | null; onRowClick?: (k: string) => void
}) {
  // 첫 화면을 최근 주간(맨 오른쪽)으로
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const id = requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth })
    return () => cancelAnimationFrame(id)
  }, [loading, weeks])

  const fmtCell = (v: number) => v <= 0 ? '' : metric === 'amt' ? fmtW(v) : v.toLocaleString()
  const wkLabel = (w: number) => {
    const s = weekDates[w]
    if (gran === 'month') return s ? `${Number(s.slice(4, 6))}월` : `${w}월`
    return s ? `${Number(s.slice(4, 6))}/${Number(s.slice(6, 8))}` : `W${w}`
  }
  const chgCls = (v: number | null) => v == null ? 'text-gray-300' : v >= 0 ? 'text-red-500' : 'text-blue-500'
  const chgTxt = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${Math.round(v)}%`
  const mv = (c: WkCell | undefined) => c ? (metric === 'amt' ? c.amt : c.qty) : 0

  if (loading) return <div className="h-40 bg-surface-subtle animate-pulse rounded-lg" />
  if (weeks.length === 0 || rows.length === 0) return <div className="text-center py-10 text-xs text-gray-400">데이터 없음</div>

  // key → {N, C}
  const keyMap = new Map<string, { N: VinData; C: VinData }>()
  const blank = (): VinData => ({ wk: {}, lyWk: {}, sumAmt: 0, sumQty: 0, sumTag: 0, lyAmt: 0, lyQty: 0, lyTag: 0 })
  for (const r of rows) {
    let e = keyMap.get(r.key)
    if (!e) { e = { N: blank(), C: blank() }; keyMap.set(r.key, e) }
    const vd = r.vin === 'N' ? e.N : e.C
    if (!vd.wk[r.week]) vd.wk[r.week] = { amt: 0, qty: 0, tag: 0 }
    vd.wk[r.week].amt += r.cyAmt; vd.wk[r.week].qty += r.cyQty; vd.wk[r.week].tag += r.cyTag
    if (!vd.lyWk[r.week]) vd.lyWk[r.week] = { amt: 0, qty: 0, tag: 0 }
    vd.lyWk[r.week].amt += r.lyAmt; vd.lyWk[r.week].qty += r.lyQty; vd.lyWk[r.week].tag += r.lyTag
    if (weeks.includes(r.week)) { vd.sumAmt += r.cyAmt; vd.sumQty += r.cyQty; vd.sumTag += r.cyTag; vd.lyAmt += r.lyAmt; vd.lyQty += r.lyQty; vd.lyTag += r.lyTag }
  }
  // 정상+이월 합 (전체)
  const combine = (a: VinData, b: VinData): VinData => {
    const o = blank()
    for (const w of weeks) {
      const ca = a.wk[w], cb = b.wk[w]
      if (ca || cb) o.wk[w] = { amt: (ca?.amt ?? 0) + (cb?.amt ?? 0), qty: (ca?.qty ?? 0) + (cb?.qty ?? 0), tag: (ca?.tag ?? 0) + (cb?.tag ?? 0) }
      const la = a.lyWk[w], lb = b.lyWk[w]
      if (la || lb) o.lyWk[w] = { amt: (la?.amt ?? 0) + (lb?.amt ?? 0), qty: (la?.qty ?? 0) + (lb?.qty ?? 0), tag: (la?.tag ?? 0) + (lb?.tag ?? 0) }
    }
    o.sumAmt = a.sumAmt + b.sumAmt; o.sumQty = a.sumQty + b.sumQty; o.sumTag = a.sumTag + b.sumTag
    o.lyAmt = a.lyAmt + b.lyAmt; o.lyQty = a.lyQty + b.lyQty; o.lyTag = a.lyTag + b.lyTag
    return o
  }
  const keys = Array.from(keyMap.entries())
    .map(([key, v]) => ({ key, v, t: combine(v.N, v.C) }))
    .filter(k => k.t.sumAmt > 0).sort((a, b) => b.t.sumAmt - a.t.sumAmt)
  if (keys.length === 0) return <div className="text-center py-10 text-xs text-gray-400">데이터 없음</div>

  // 히트맵 기준은 전체(T) 셀
  const maxCell = Math.max(1, ...keys.flatMap(k => weeks.map(w => mv(k.t.wk[w]))))

  // 실적 셀: 금액=백만원 정수(한 줄), 수량=정수
  const salesTxt = (v: number) => {
    if (v <= 0) return ''
    if (metric !== 'amt') return v.toLocaleString()
    if (v < 1e6) return fmtW(v) // 100만 미만은 만 단위
    return Math.round(v / 1e6).toLocaleString() // 백만원
  }
  // 주차 한 칸 = 4개 하위셀: 실적 · 할인율 · 전주비 · 전년비
  const pctTxt = (v: number | null) => v == null ? '' : `${v >= 0 ? '+' : ''}${Math.round(v)}%`
  const weekCells = (vd: VinData, w: number, idx: number) => {
    const c = vd.wk[w]
    const sales = mv(c)
    const op = sales > 0 ? 0.08 + 0.5 * (sales / maxCell) : 0
    const disc = c && c.tag > 0 ? (1 - c.amt / c.tag) * 100 : null
    const prev = idx > 0 ? mv(vd.wk[weeks[idx - 1]]) : 0
    const wow = prev > 0 ? (sales / prev - 1) * 100 : null
    const ly = metric === 'amt' ? (vd.lyWk[w]?.amt ?? 0) : (vd.lyWk[w]?.qty ?? 0)
    const yoy = ly > 0 ? (sales / ly - 1) * 100 : null
    return [
      <td key={`${w}s`} className="px-1 py-1 text-right font-mono text-gray-800 border-l border-gray-200 whitespace-nowrap" style={{ background: sales > 0 ? `rgba(236,72,153,${op.toFixed(3)})` : undefined }}>{salesTxt(sales)}</td>,
      <td key={`${w}d`} className="px-1 py-1 text-right font-mono text-gray-400 whitespace-nowrap">{disc != null ? `${Math.round(disc)}%` : ''}</td>,
      <td key={`${w}w`} className={cn('px-1 py-1 text-right font-mono whitespace-nowrap', chgCls(wow))}>{pctTxt(wow)}</td>,
      <td key={`${w}y`} className={cn('px-1 py-1 text-right font-mono whitespace-nowrap', chgCls(yoy))}>{pctTxt(yoy)}</td>,
    ]
  }

  // 우측 요약 (시즌합만)
  const summaryCells = (vd: VinData) => (
    <td className="px-2 py-1 text-right font-mono font-semibold text-gray-900 border-l border-gray-200 whitespace-nowrap">{fmtCell(metric === 'amt' ? vd.sumAmt : vd.sumQty)}</td>
  )

  const VIN_LABEL = { T: '전체', N: '정상', C: '이월' }
  const VIN_CLS = { T: 'text-gray-700', N: 'text-emerald-600', C: 'text-amber-600' }
  const vinRow = (key: string, vd: VinData, kind: 'T' | 'N' | 'C', isFirst: boolean, isSel: boolean) => {
    if (kind !== 'T' && vd.sumAmt <= 0 && vd.lyAmt <= 0) return null
    const bg = isSel ? 'bg-pink-50' : kind === 'T' ? 'bg-gray-100' : 'bg-white'
    return (
      <tr key={`${key}|${kind}`}
        onClick={onRowClick ? () => onRowClick(key) : undefined}
        className={cn(isFirst && 'border-t-2 border-gray-200', kind === 'T' && 'font-semibold', onRowClick && 'cursor-pointer', isSel ? 'bg-pink-50/60' : kind === 'T' ? 'bg-gray-50/40' : onRowClick && 'hover:bg-gray-50/70')}>
        <td className={cn('sticky text-left py-1 pr-2 font-medium z-10 truncate w-[92px] min-w-[92px] max-w-[92px]', isSel ? 'bg-pink-50 text-pink-700' : cn(bg, 'text-gray-700'))} style={{ left: 0 }} title={key}>{isFirst ? key : ''}</td>
        <td className={cn('sticky text-left py-1 px-2 text-[9px] font-semibold z-10', isSel ? 'bg-pink-50' : bg, VIN_CLS[kind])} style={{ left: 92 }}>{VIN_LABEL[kind]}</td>
        {weeks.map((w, i) => weekCells(vd, w, i))}
        {summaryCells(vd)}
      </tr>
    )
  }

  // 합계 (정상/이월)
  const totals = { N: blank(), C: blank() }
  for (const k of keys) for (const vin of ['N', 'C'] as const) {
    const s = totals[vin], vd = k.v[vin]
    for (const w of weeks) {
      if (vd.wk[w]) { if (!s.wk[w]) s.wk[w] = { amt: 0, qty: 0, tag: 0 }; s.wk[w].amt += vd.wk[w].amt; s.wk[w].qty += vd.wk[w].qty; s.wk[w].tag += vd.wk[w].tag }
      if (vd.lyWk[w]) { if (!s.lyWk[w]) s.lyWk[w] = { amt: 0, qty: 0, tag: 0 }; s.lyWk[w].amt += vd.lyWk[w].amt; s.lyWk[w].qty += vd.lyWk[w].qty }
    }
    s.sumAmt += vd.sumAmt; s.sumQty += vd.sumQty; s.sumTag += vd.sumTag; s.lyAmt += vd.lyAmt; s.lyQty += vd.lyQty
  }

  return (
    <div ref={scrollRef} className="overflow-auto max-h-[72vh]">
      <table className="text-[10px] border-collapse">
        <thead>
          <tr className="text-gray-500 font-semibold">
            <th rowSpan={2} className="sticky top-0 bg-white text-left py-1.5 pr-2 z-30 w-[92px] min-w-[92px] max-w-[92px] border-b border-gray-200" style={{ left: 0 }}>{firstCol}</th>
            <th rowSpan={2} className="sticky top-0 bg-white text-left py-1.5 px-2 z-30 border-b border-gray-200" style={{ left: 92 }}>구분</th>
            {weeks.map(w => <th key={w} colSpan={4} className="sticky top-0 z-20 bg-white h-6 px-1 py-1 text-center border-l border-b border-gray-200 text-gray-600">{wkLabel(w)}</th>)}
            <th rowSpan={2} className="sticky top-0 z-20 bg-gray-100 px-2 py-1.5 text-right border-l border-b border-gray-200">시즌합</th>
          </tr>
          <tr className="text-[9px] text-gray-400 font-medium">
            {weeks.flatMap(w => [
              <th key={`${w}s`} className="sticky top-6 z-20 bg-white px-1 py-1 text-right border-l border-b border-gray-200 min-w-[40px]">실적</th>,
              <th key={`${w}d`} className="sticky top-6 z-20 bg-white px-1 py-1 text-right border-b border-gray-200 min-w-[30px]">할인</th>,
              <th key={`${w}w`} className="sticky top-6 z-20 bg-white px-1 py-1 text-right border-b border-gray-200 min-w-[34px]">{gran === 'month' ? '전월' : '전주'}</th>,
              <th key={`${w}y`} className="sticky top-6 z-20 bg-white px-1 py-1 text-right border-b border-gray-200 min-w-[34px]">전년</th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {keys.map(k => {
            const isSel = selectedKey === k.key
            return [
              vinRow(k.key, k.t, 'T', true, isSel),
              vinRow(k.key, k.v.N, 'N', false, isSel),
              vinRow(k.key, k.v.C, 'C', false, isSel),
            ]
          })}
          {([['T', combine(totals.N, totals.C)], ['N', totals.N], ['C', totals.C]] as [('T' | 'N' | 'C'), VinData][]).map(([vin, vd], i) => (
            <tr key={`tot-${vin}`} className={cn('bg-gray-100 font-bold', i === 0 && 'border-t-2 border-gray-300')}>
              <td className="sticky bg-gray-100 text-left py-1.5 pr-2 text-gray-900 z-10 w-[92px] min-w-[92px] max-w-[92px]" style={{ left: 0 }}>{i === 0 ? '합계' : ''}</td>
              <td className={cn('sticky bg-gray-100 text-left py-1.5 px-2 text-[9px] font-semibold z-10', VIN_CLS[vin])} style={{ left: 92 }}>{VIN_LABEL[vin]}</td>
              {weeks.map((w, idx) => weekCells(vd, w, idx))}
              {summaryCells(vd)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
