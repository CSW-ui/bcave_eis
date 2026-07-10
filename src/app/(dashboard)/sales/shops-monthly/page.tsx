'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_TABS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

const CHANNEL_OPTIONS = [
  '백화점', '아울렛', '직영점', '쇼핑몰', '대리점', '면세점',
  '본사매장', '팝업', '오프라인 사입', '오프라인 위탁',
  '온라인(무신사)', '온라인(위탁몰)', '온라인(자사몰)', '온라인B2B',
  '해외 사입', '해외 위탁',
]
const YEAR_OPTIONS = ['2026', '2025']

type Cmp = 'mom' | 'yoy'
interface VinData { rev: Record<number, number>; qty: Record<number, number>; tag: Record<number, number>; lyRev: Record<number, number> }
interface ShopRow {
  shopCd: string; shopNm: string; area: string; brandcd: string; channel: string
  n: VinData; c: VinData
}

const sumRec = (r: Record<number, number>) => Object.values(r).reduce((s, v) => s + v, 0)
const combineVin = (a: VinData, b: VinData, months: number[]): VinData => {
  const o: VinData = { rev: {}, qty: {}, tag: {}, lyRev: {} }
  for (const m of months) {
    const ar = a.rev[m] ?? 0, br = b.rev[m] ?? 0; if (ar || br) o.rev[m] = ar + br
    const aq = a.qty[m] ?? 0, bq = b.qty[m] ?? 0; if (aq || bq) o.qty[m] = aq + bq
    const at = a.tag[m] ?? 0, bt = b.tag[m] ?? 0; if (at || bt) o.tag[m] = at + bt
    const al = a.lyRev[m] ?? 0, bl = b.lyRev[m] ?? 0; if (al || bl) o.lyRev[m] = al + bl
  }
  return o
}

export default function ShopsMonthlyPage() {
  const { allowedBrands } = useAuth()
  const router = useRouter()

  const [year, setYear] = useState('2026')
  const [cmp, setCmp] = useState<Cmp>('mom')
  const [brandSel, setBrandSel] = useState<Set<string>>(new Set())
  const [channelSel, setChannelSel] = useState<Set<string>>(new Set())
  const [areaQuery, setAreaQuery] = useState('')
  const [topN, setTopN] = useState<number | 'all'>(30)

  const [shops, setShops] = useState<ShopRow[]>([])
  const [maxMonth, setMaxMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const brandOptions = (allowedBrands ?? BRAND_TABS.filter(b => b.value !== 'all').map(b => b.value)).filter(b => b !== 'all')

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const brandsParam = brandSel.size === 0 || brandSel.size === brandOptions.length ? 'all' : Array.from(brandSel).join(',')
      const channelsParam = Array.from(channelSel).join(',')
      const url = `/api/sales/shops-monthly?year=${year}&brands=${brandsParam}&channels=${encodeURIComponent(channelsParam)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setShops(json.shops ?? [])
      setMaxMonth(json.maxMonth ?? 0)
    } catch (e) { setError(String(e)); setShops([]) }
    finally { setLoading(false) }
  }, [year, brandSel, channelSel, brandOptions.length])

  useEffect(() => { fetchData() }, [fetchData])

  const months = useMemo(() => Array.from({ length: maxMonth }, (_, i) => i + 1), [maxMonth])

  const toggleBrand = (b: string) => setBrandSel(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n })
  const toggleChannel = (c: string) => setChannelSel(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })

  const shopTotal = (s: ShopRow) => sumRec(s.n.rev) + sumRec(s.c.rev)

  const rows = useMemo(() => {
    const q = areaQuery.trim().toLowerCase()
    const list = shops
      .filter(s => !q || (s.area ?? '').toLowerCase().includes(q) || (s.shopNm ?? '').toLowerCase().includes(q))
      .sort((a, b) => shopTotal(b) - shopTotal(a))
    return typeof topN === 'number' ? list.slice(0, topN) : list
  }, [shops, areaQuery, topN])

  // 매출 히트맵 정규화 max (전체 기준)
  const maxRev = useMemo(() => {
    let m = 0
    for (const r of rows) for (const mm of months) {
      const v = (r.n.rev[mm] ?? 0) + (r.c.rev[mm] ?? 0); if (v > m) m = v
    }
    return m
  }, [rows, months])

  // 합계 행 (표시된 매장 전체)
  const totals = useMemo(() => {
    let n: VinData = { rev: {}, qty: {}, tag: {}, lyRev: {} }, c: VinData = { rev: {}, qty: {}, tag: {}, lyRev: {} }
    for (const r of rows) { n = combineVin(n, r.n, months); c = combineVin(c, r.c, months) }
    return { n, c }
  }, [rows, months])

  const downloadExcel = () => {
    if (rows.length === 0) return
    const VIN = [['T', '전체'], ['N', '정상'], ['C', '이월']] as const
    const data: Record<string, string | number>[] = []
    for (const r of rows) {
      const t = combineVin(r.n, r.c, months)
      const pick = (k: string): VinData => k === 'T' ? t : k === 'N' ? r.n : r.c
      for (const [k, label] of VIN) {
        const vd = pick(k)
        const base: Record<string, string | number> = {
          매장명: r.shopNm, 브랜드: BRAND_NAMES[r.brandcd] ?? r.brandcd, 채널: r.channel, 지역: r.area, 구분: label,
        }
        for (const m of months) {
          const rev = vd.rev[m] ?? 0
          base[`${m}월_매출`] = Math.round(rev / 1e6)
          const prev = vd.rev[months[months.indexOf(m) - 1]] ?? 0
          base[`${m}월_전월비`] = prev > 0 ? Math.round((rev / prev - 1) * 100) : ''
          const ly = vd.lyRev[m] ?? 0
          base[`${m}월_전년비`] = ly > 0 ? Math.round((rev / ly - 1) * 100) : ''
          base[`${m}월_할인율`] = (vd.tag[m] ?? 0) > 0 ? Math.round((1 - rev / vd.tag[m]) * 100) : ''
        }
        base['합계_매출'] = Math.round(sumRec(vd.rev) / 1e6)
        data.push(base)
      }
    }
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매장별 월별 실적')
    XLSX.writeFile(wb, `매장별월별실적_${year}.xlsx`)
  }

  const colTrim = 'text-[10px]'

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">매장별 월별 실적</h1>
          <span className="text-xs text-gray-400">매장 × 월 · 전체/정상/이월 · 매출(백만)·전월비·할인율</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
          </button>
          <button onClick={downloadExcel} disabled={rows.length === 0}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5 disabled:opacity-40">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">연도</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {YEAR_OPTIONS.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                year === y ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {y}년
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">비교</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {([['mom', '전월비'], ['yoy', '전년비']] as [Cmp, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setCmp(v)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                cmp === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-1">표시</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {([['20', 20], ['30', 30], ['50', 50], ['전체', 'all']] as [string, number | 'all'][]).map(([label, v]) => (
            <button key={label} onClick={() => setTopN(v)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                topN === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {label === '전체' ? '전체' : `상위 ${label}`}
            </button>
          ))}
        </div>
        <input type="text" value={areaQuery} onChange={e => setAreaQuery(e.target.value)}
          placeholder="매장/지역 검색"
          className="text-[11px] border border-surface-border rounded px-2 py-1 w-36" />
      </div>

      {/* 브랜드 / 채널 필터 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">브랜드</span>
          {brandOptions.map(b => (
            <button key={b} onClick={() => toggleBrand(b)}
              className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                brandSel.has(b) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
              {BRAND_NAMES[b] ?? b}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">{brandSel.size === 0 ? '(전체)' : `${brandSel.size}개`}</span>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0 pt-0.5">채널</span>
          <div className="flex gap-1 flex-wrap flex-1">
            {CHANNEL_OPTIONS.map(c => (
              <button key={c} onClick={() => toggleChannel(c)}
                className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                  channelSel.has(c) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
                {c}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 ml-1">{channelSel.size === 0 ? '(전체)' : `${channelSel.size}개`}</span>
        </div>
      </div>

      {/* 범례 */}
      <div className="text-[10px] text-gray-400">
        각 월 3개 칸 = <b className="text-gray-600">매출</b>(백만) · <b className="text-gray-600">{cmp === 'yoy' ? '전년비' : '전월비'}</b>(%) · <b className="text-gray-600">할인율</b>(%) · 매출 셀 진할수록 큼 · {cmp === 'yoy' ? '전년비' : '전월비'} <span className="text-red-500">+빨강</span>/<span className="text-blue-500">-파랑</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>}

      {/* 매트릭스 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">매장 × 월 매트릭스</h3>
          <span className="text-[10px] text-gray-400">{loading ? '조회 중…' : `${rows.length}개 매장`}</span>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-7 bg-surface-subtle animate-pulse rounded" />)}</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">조건에 맞는 매장이 없습니다.</div>
          ) : (
            <table className={cn('border-collapse', colTrim)}>
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50 text-gray-500 font-semibold">
                  <th rowSpan={2} className="sticky left-0 bg-gray-50 z-30 text-left px-2 py-1.5 border-b border-surface-border w-[150px] min-w-[150px]">매장</th>
                  <th rowSpan={2} className="sticky left-[150px] bg-gray-50 z-30 text-left px-2 py-1.5 border-b border-r border-surface-border w-[44px] min-w-[44px]">구분</th>
                  {months.map(m => (
                    <th key={m} colSpan={3} className="text-center px-1 py-1 border-l border-b border-surface-border text-gray-600">{m}월</th>
                  ))}
                  <th className="text-center px-1 py-1 border-l-2 border-b border-gray-300 text-gray-700">합계</th>
                </tr>
                <tr className="bg-gray-50 text-[9px] text-gray-400 font-medium">
                  {months.flatMap(m => [
                    <th key={`${m}r`} className="px-1 py-1 text-right border-l border-b border-surface-border min-w-[42px]">매출</th>,
                    <th key={`${m}p`} className="px-1 py-1 text-right border-b border-surface-border min-w-[36px]">{cmp === 'yoy' ? '전년' : '전월'}</th>,
                    <th key={`${m}d`} className="px-1 py-1 text-right border-b border-surface-border min-w-[34px]">할인</th>,
                  ])}
                  <th className="px-1 py-1 text-right border-l-2 border-b border-gray-300 min-w-[46px]">매출</th>
                </tr>
              </thead>
              <tbody>
                {/* 합계 (맨 위) */}
                <TotalRows totals={totals} months={months} maxRev={maxRev} cmp={cmp} count={rows.length} />
                {rows.map((r, i) => {
                  const t = combineVin(r.n, r.c, months)
                  return (
                    <ShopRows key={`${r.shopCd}-${r.brandcd}-${r.channel}-${i}`}
                      r={r} t={t} months={months} maxRev={maxRev} cmp={cmp} first
                      onName={() => router.push(`/sales/shops/${encodeURIComponent(r.shopCd)}?from=${year}0101&to=${year}1231`)} />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 매출 셀 색 (emerald 농도) / 전월비 색 ──
const revBg = (v: number, max: number) => v <= 0 ? undefined : `rgba(16,185,129,${(0.08 + 0.5 * Math.min(v / (max || 1), 1)).toFixed(3)})`
const momCls = (v: number | null) => v == null ? 'text-gray-300' : v >= 0 ? 'text-red-500' : 'text-blue-500'
const revM = (v: number) => v > 0 ? String(Math.round(v / 1e6)) : ''
const momTxt = (v: number | null) => v == null ? '' : `${v >= 0 ? '+' : ''}${Math.round(v)}%`
const dcTxt = (rev: number, tag: number) => tag > 0 ? `${Math.round((1 - rev / tag) * 100)}%` : ''

function metricCells(vd: VinData, months: number[], maxRev: number, cmp: Cmp, keyPrefix: string) {
  return months.flatMap((m, idx) => {
    const rev = vd.rev[m] ?? 0
    const base = cmp === 'yoy' ? (vd.lyRev[m] ?? 0) : (vd.rev[months[idx - 1]] ?? 0)
    const chg = base > 0 ? (rev / base - 1) * 100 : null
    const tag = vd.tag[m] ?? 0
    return [
      <td key={`${keyPrefix}${m}r`} className="px-1 py-1 text-right font-mono text-gray-800 border-l border-surface-border/70 whitespace-nowrap"
        style={{ background: revBg(rev, maxRev) }}>{revM(rev)}</td>,
      <td key={`${keyPrefix}${m}p`} className={cn('px-1 py-1 text-right font-mono whitespace-nowrap', momCls(chg))}>{momTxt(chg)}</td>,
      <td key={`${keyPrefix}${m}d`} className="px-1 py-1 text-right font-mono text-gray-400 whitespace-nowrap">{dcTxt(rev, tag)}</td>,
    ]
  })
}

const VIN_LABEL = { T: '전체', N: '정상', C: '이월' } as const
const VIN_CLS = { T: 'text-gray-800', N: 'text-emerald-600', C: 'text-amber-600' } as const

function ShopRows({ r, t, months, maxRev, cmp, onName }: {
  r: ShopRow; t: VinData; months: number[]; maxRev: number; cmp: Cmp; first?: boolean; onName: () => void
}) {
  const rowsDef: [('T' | 'N' | 'C'), VinData][] = [['T', t], ['N', r.n], ['C', r.c]]
  return (
    <>
      {rowsDef.map(([kind, vd], ri) => {
        const isFirst = ri === 0
        const totRev = sumRec(vd.rev)
        return (
          <tr key={kind} className={cn('border-b border-surface-border/40', isFirst ? 'border-t-2 border-gray-200' : '', kind === 'T' ? 'bg-gray-50/40 font-semibold' : 'hover:bg-amber-50/30')}>
            {isFirst && (
              <td rowSpan={3} className="sticky left-0 z-10 bg-white px-2 py-1 align-middle whitespace-nowrap w-[150px] min-w-[150px] border-r border-surface-border/40">
                <button onClick={onName} className="block truncate max-w-[134px] text-blue-600 hover:text-blue-800 hover:underline text-left" title={`${r.shopNm} · ${r.channel}`}>{r.shopNm}</button>
              </td>
            )}
            <td className={cn('sticky left-[150px] z-10 px-2 py-1 text-[9px] font-semibold border-r border-surface-border', kind === 'T' ? 'bg-gray-50/95' : 'bg-white', VIN_CLS[kind])}>{VIN_LABEL[kind]}</td>
            {metricCells(vd, months, maxRev, cmp, `${kind}`)}
            <td className={cn('px-1 py-1 text-right font-mono border-l-2 border-gray-300 whitespace-nowrap', kind === 'T' ? 'text-gray-900 font-semibold' : 'text-gray-500')}>{totRev > 0 ? fmtM(totRev) : ''}</td>
          </tr>
        )
      })}
    </>
  )
}

function TotalRows({ totals, months, maxRev, cmp, count }: { totals: { n: VinData; c: VinData }; months: number[]; maxRev: number; cmp: Cmp; count: number }) {
  const t = combineVin(totals.n, totals.c, months)
  const rowsDef: [('T' | 'N' | 'C'), VinData][] = [['T', t], ['N', totals.n], ['C', totals.c]]
  return (
    <>
      {rowsDef.map(([kind, vd], ri) => (
        <tr key={`tot-${kind}`} className={cn('bg-gray-100 font-bold', ri === 0 && 'border-t-2 border-gray-300')}>
          {ri === 0 && (
            <td rowSpan={3} className="sticky left-0 z-10 bg-gray-100 px-2 py-1 text-gray-900 align-middle w-[150px] min-w-[150px] border-r border-surface-border">합계 ({count}개)</td>
          )}
          <td className={cn('sticky left-[150px] z-10 bg-gray-100 px-2 py-1 text-[9px] font-semibold border-r border-surface-border', VIN_CLS[kind])}>{VIN_LABEL[kind]}</td>
          {metricCells(vd, months, maxRev, cmp, `tot${kind}`)}
          <td className="px-1 py-1 text-right font-mono border-l-2 border-gray-300 text-gray-900">{fmtM(sumRec(vd.rev))}</td>
        </tr>
      ))}
    </>
  )
}
