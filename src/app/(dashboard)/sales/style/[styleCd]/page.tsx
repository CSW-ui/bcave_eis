'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, Download, ArrowUpDown, Package, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_COLORS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import * as XLSX from 'xlsx'

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const ymdToCompact = (s: string) => s.replace(/-/g, '')

function sizeOrder(s: string): number {
  if (!s) return 9999
  const u = s.toUpperCase().trim()
  const map: Record<string, number> = {
    'XXXS': -3, 'XXS': -2, 'XS': -1, 'S': 0, 'M': 1, 'L': 2,
    'XL': 3, 'XXL': 4, 'XXXL': 5, '3XL': 5, '4XL': 6, '5XL': 7,
    'FREE': 1000, 'F': 1000, 'OS': 1000, '단품': 1000, 'ONE': 1000,
  }
  if (u in map) return map[u]
  const num = Number(u.replace(/[^0-9.]/g, ''))
  if (!isNaN(num) && num > 0) return num + 100
  return 999
}

interface ShopRow {
  shopCd: string; shopNm: string; channel: string; area: string
  sizes: Record<string, { qty: number; inv: number; avail: number; qty4w: number }>
  totalQty: number; totalRev: number; totalStoreRev: number; totalOtherRev: number
  totalInv: number; totalAvail: number; totalTrf: number; total4w: number
  sellThrough: number; wos: number
}
interface WhRow { whCd: string; whNm: string; sizes: Record<string, number>; total: number }

function useSortable(defaultKey: string) {
  const [key, setKey] = useState(defaultKey)
  const [dir, setDir] = useState<'asc'|'desc'>('desc')
  const toggle = (k: string) => { if (key === k) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setKey(k); setDir('desc') } }
  const sort = (arr: any[]) => [...arr].sort((a, b) => {
    const va = a[key] ?? 0; const vb = b[key] ?? 0
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return dir === 'asc' ? va - vb : vb - va
  })
  return { key, dir, toggle, sort }
}

function SortTh({ k, label, sort, align = 'right' }: { k: string; label: string; sort: ReturnType<typeof useSortable>; align?: string }) {
  return (
    <th className={cn('px-2 py-1.5 cursor-pointer hover:text-gray-900 whitespace-nowrap', align === 'left' ? 'text-left' : 'text-right')}
      onClick={() => sort.toggle(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        <ArrowUpDown size={9} className={cn(sort.key === k ? 'opacity-100 text-brand-accent' : 'opacity-20')} />
      </span>
    </th>
  )
}

export default function StyleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const styleCd = decodeURIComponent(params.styleCd as string)

  const today = new Date()
  // 매월 1일에 from > to 되는 문제 방지: 1일이면 지난달 1일을 기본으로
  const isFirstOfMonth = today.getDate() === 1
  const defaultTo = toYmd(new Date(today.getTime() - 86400000))
  const defaultFrom = isFirstOfMonth
    ? toYmd(new Date(today.getFullYear(), today.getMonth() - 1, 1))
    : toYmd(new Date(today.getFullYear(), today.getMonth(), 1))
  const parseCompact = (s: string | null): string | null => {
    if (!s || !/^\d{8}$/.test(s)) return null
    return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
  }
  const [from, setFrom] = useState(parseCompact(searchParams.get('from')) ?? defaultFrom)
  const [to, setTo] = useState(parseCompact(searchParams.get('to')) ?? defaultTo)
  const [color, setColor] = useState(searchParams.get('color') || '')

  const [style, setStyle] = useState<any>(null)
  const [colors, setColors] = useState<string[]>([])
  const [kpi, setKpi] = useState<any>(null)
  const [shops, setShops] = useState<ShopRow[]>([])
  const [warehouses, setWarehouses] = useState<WhRow[]>([])
  const [sizeCols, setSizeCols] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const shopSort = useSortable('totalRev')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/sales/style-detail?styleCd=${encodeURIComponent(styleCd)}&from=${ymdToCompact(from)}&to=${ymdToCompact(to)}${color ? `&color=${encodeURIComponent(color)}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) { alert(json.error || '조회 실패'); return }
      setStyle(json.style); setColors(json.colors ?? [])
      setKpi(json.kpi); setShops(json.shops ?? []); setWarehouses(json.warehouses ?? [])
      const sorted = [...(json.sizeCols ?? [])].sort((a: string, b: string) => sizeOrder(a) - sizeOrder(b))
      setSizeCols(sorted)
      // 첫 진입 시 컬러 미선택 + 컬러가 여러개면 가장 많이 등장하는 컬러로 자동 선택
      if (!color && (json.colors?.length ?? 0) > 1) {
        // 일단 유지 - 사용자가 명시적으로 선택할 때만 필터링
      }
    } catch (err) {
      alert(`조회 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [styleCd, from, to, color])

  useEffect(() => { fetchData() }, [fetchData])

  // 매장별 할인율/원가율 계산 (style.tagPrice, style.prodCost 기준)
  const shopsWithRates = useMemo(() => {
    const tagPrice = style?.tagPrice ?? 0
    const prodCost = style?.prodCost ?? 0
    return shops.map(r => {
      const tagBase = tagPrice * r.totalQty
      const costBase = prodCost * r.totalQty
      return {
        ...r,
        dcRate: tagBase > 0 ? Math.round((1 - r.totalRev / tagBase) * 1000) / 10 : 0,
        cogsRate: r.totalRev > 0 ? Math.round(costBase / r.totalRev * 1000) / 10 : 0,
      }
    })
  }, [shops, style])

  const sortedShops = useMemo(() => {
    if (shopSort.key.startsWith('size:')) {
      const sz = shopSort.key.slice(5)
      return [...shopsWithRates].sort((a, b) => {
        const va = a.sizes[sz]?.qty ?? 0
        const vb = b.sizes[sz]?.qty ?? 0
        return shopSort.dir === 'asc' ? va - vb : vb - va
      })
    }
    return shopSort.sort(shopsWithRates) as (ShopRow & { dcRate: number; cogsRate: number })[]
  }, [shopsWithRates, shopSort])

  const applyPreset = (kind: 'thisMonth'|'lastMonth'|'last7'|'last30'|'ytd') => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    let f: Date, t: Date = new Date(now.getTime() - 86400000)
    if (kind === 'thisMonth') { f = new Date(y, m, 1) }
    else if (kind === 'lastMonth') { f = new Date(y, m-1, 1); t = new Date(y, m, 0) }
    else if (kind === 'ytd') { f = new Date(y, 0, 1) }
    else if (kind === 'last7') { f = new Date(now.getTime() - 7 * 86400000) }
    else { f = new Date(now.getTime() - 30 * 86400000) }
    setFrom(toYmd(f)); setTo(toYmd(t))
  }

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    if (sortedShops.length > 0) {
      const shopData = sortedShops.map(r => {
        const row: Record<string, any> = { 매장명: r.shopNm, 채널: r.channel, 지역: r.area }
        for (const sz of sizeCols) {
          row[`${sz}_판매`] = r.sizes[sz]?.qty ?? 0
          row[`${sz}_가용`] = r.sizes[sz]?.avail ?? 0
        }
        row['합계판매'] = r.totalQty
        row['매출'] = r.totalRev
        row['매장매출'] = r.totalStoreRev
        row['기타매출'] = r.totalOtherRev
        row['할인율'] = r.dcRate
        row['원가율'] = r.cogsRate
        row['매장가용합계'] = r.totalAvail
        row['이동입고합계'] = r.totalTrf
        row['ST%'] = r.sellThrough
        row['WoS'] = r.wos
        return row
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shopData), '매장별')
    }
    if (warehouses.length > 0) {
      const whData = warehouses.map(w => {
        const row: Record<string, any> = { 창고코드: w.whCd, 창고명: w.whNm }
        for (const sz of sizeCols) row[sz] = w.sizes[sz] ?? 0
        row['합계'] = w.total
        return row
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(whData), '창고별')
    }
    XLSX.writeFile(wb, `${style?.styleNm ?? styleCd}_${color || 'ALL'}_${ymdToCompact(from)}-${ymdToCompact(to)}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle">
            <ArrowLeft size={12} /> 뒤로
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-gray-400" />
              {style?.styleNm ?? styleCd}
              {style?.brandcd && (
                <span className="px-1.5 py-px rounded-full text-[9px] font-bold text-white"
                  style={{ background: BRAND_COLORS[style.brandcd] ?? '#999' }}>
                  {BRAND_NAMES[style.brandcd] ?? style.brandcd}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-mono">{styleCd}</span>
              {style?.itemNm && ` · ${style.itemNm}`}
              {style?.year && ` · ${style.year} ${style.season}`}
              {style?.tagPrice ? ` · 태그가 ${style.tagPrice.toLocaleString()}원` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
          </button>
          <button onClick={downloadExcel} disabled={shops.length + warehouses.length === 0}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5 disabled:opacity-40">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 필터 (기간 + 컬러 탭) */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">기간</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="text-xs border border-surface-border rounded px-2 py-1" />
          <span className="text-xs text-gray-400">~</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="text-xs border border-surface-border rounded px-2 py-1" />
          <div className="flex gap-1 ml-2">
            {[['thisMonth', '이번달'], ['lastMonth', '지난달'], ['last7', '7일'], ['last30', '30일'], ['ytd', '올해']].map(([k, l]) => (
              <button key={k} onClick={() => applyPreset(k as any)}
                className="text-[10px] text-gray-500 hover:text-gray-800 border border-surface-border rounded px-1.5 py-0.5">
                {l}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 ml-2">재고는 현재 시점 · WoS는 최근 4주 기준</span>
        </div>
        {colors.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500 w-12 shrink-0">컬러</span>
            <button onClick={() => setColor('')}
              className={cn('text-[11px] px-2.5 py-0.5 rounded-full border',
                color === '' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
              전체
            </button>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={cn('text-[11px] px-2.5 py-0.5 rounded-full border font-mono',
                  color === c ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI */}
      {!loading && kpi && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
          {([
            { title: '발주', value: (kpi.orderQty ?? 0).toLocaleString() },
            { title: '입고', value: (kpi.inboundQty ?? 0).toLocaleString() },
            { title: '누적판매수량', value: (kpi.cumQty ?? 0).toLocaleString() },
            { title: '누적판매율', value: `${kpi.cumSellThrough ?? 0}%`,
              color: (kpi.cumSellThrough ?? 0) >= 70 ? 'text-emerald-600' : (kpi.cumSellThrough ?? 0) >= 30 ? 'text-amber-500' : 'text-gray-700' },
            { title: '매출', value: `${fmtM(kpi.rev)}백만` },
            { title: '매장매출', value: `${fmtM(kpi.storeRev ?? 0)}백만`, color: 'text-emerald-600' },
            { title: '기타매출', value: `${fmtM(kpi.otherRev ?? 0)}백만`, color: 'text-purple-600' },
            { title: '기간판매수량', value: kpi.qty.toLocaleString() },
            { title: '매장가용', value: (kpi.shopAvail ?? kpi.shopInv).toLocaleString() },
            { title: '이동입고', value: (kpi.shopTrf ?? 0) > 0 ? `+${kpi.shopTrf.toLocaleString()}` : (kpi.shopTrf ?? 0) < 0 ? kpi.shopTrf.toLocaleString() : '—',
              color: (kpi.shopTrf ?? 0) > 0 ? 'text-sky-600' : (kpi.shopTrf ?? 0) < 0 ? 'text-rose-500' : undefined },
            { title: '창고재고', value: kpi.whInv.toLocaleString() },
            { title: 'ST%', value: `${kpi.sellThrough}%`,
              color: kpi.sellThrough >= 70 ? 'text-emerald-600' : kpi.sellThrough >= 30 ? 'text-amber-500' : 'text-gray-700' },
            { title: 'WoS', value: kpi.wos > 0 ? `${kpi.wos}주` : '—',
              color: kpi.wos === 0 ? undefined : kpi.wos < 2 ? 'text-red-500' : kpi.wos > 12 ? 'text-amber-500' : 'text-emerald-600' },
            { title: 'DC%', value: `${kpi.dcRate}%` },
          ] as { title: string; value: string; color?: string }[]).map(k => (
            <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
              <p className="text-[10px] text-gray-400 uppercase">{k.title}</p>
              <p className={cn('text-lg font-bold mt-0.5', k.color || 'text-gray-900')}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 매장 × 사이즈 사이즈런 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Package size={12} /> 매장별 분포
            <span className="text-[10px] font-normal text-gray-400">{shops.length}개 매장 · 셀: 판매 / 가용재고</span>
          </h3>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 480 }}>
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div>
          ) : shops.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">이 기간/컬러에 매장 데이터가 없습니다.</div>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                  <SortTh k="shopNm" label="매장명" sort={shopSort} align="left" />
                  <SortTh k="channel" label="채널" sort={shopSort} align="left" />
                  {sizeCols.map(sz => {
                    const active = shopSort.key === `size:${sz}`
                    return (
                      <th key={sz}
                        onClick={() => shopSort.toggle(`size:${sz}`)}
                        className={cn('px-2 py-1.5 text-center whitespace-nowrap border-l border-surface-border/50 cursor-pointer hover:text-gray-900',
                          active ? 'text-brand-accent' : 'text-gray-500')}>
                        <span className="inline-flex items-center gap-0.5">{sz}
                          <ArrowUpDown size={8} className={cn(active ? 'opacity-100' : 'opacity-20')} />
                        </span>
                      </th>
                    )
                  })}
                  <SortTh k="totalQty" label="판매합계" sort={shopSort} />
                  <SortTh k="totalRev" label="매출" sort={shopSort} />
                  <SortTh k="totalStoreRev" label="매장매출" sort={shopSort} />
                  <SortTh k="totalOtherRev" label="기타매출" sort={shopSort} />
                  <SortTh k="dcRate" label="할인율" sort={shopSort} />
                  <SortTh k="cogsRate" label="원가율" sort={shopSort} />
                  <SortTh k="totalAvail" label="매장가용" sort={shopSort} />
                  <SortTh k="totalTrf" label="이동입고" sort={shopSort} />
                  <SortTh k="sellThrough" label="ST%" sort={shopSort} />
                  <SortTh k="wos" label="WoS" sort={shopSort} />
                </tr>
              </thead>
              <tbody>
                {sortedShops.map((r, i) => (
                  <tr key={r.shopCd}
                    className={cn('border-b border-surface-border/50',
                      i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                    <td className="px-2 py-1.5 font-medium truncate max-w-[160px]">
                      <a
                        href={`/sales/shops/${encodeURIComponent(r.shopCd)}?from=${ymdToCompact(from)}&to=${ymdToCompact(to)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >{r.shopNm}</a>
                    </td>
                    <td className="px-2 py-1.5 text-gray-600">{r.channel || '—'}</td>
                    {sizeCols.map(sz => {
                      const c = r.sizes[sz]
                      if (!c || (c.qty === 0 && c.avail === 0)) {
                        return <td key={sz} className="px-1 py-1.5 text-center text-gray-300 border-l border-surface-border/50">—</td>
                      }
                      const oos = c.qty > 0 && c.avail === 0
                      return (
                        <td key={sz} className="px-1 py-1.5 text-center border-l border-surface-border/50">
                          <div className={cn('font-mono font-semibold leading-tight', c.qty > 0 ? 'text-blue-600' : 'text-gray-300')}>
                            {c.qty || '·'}
                          </div>
                          <div className={cn('font-mono text-[9px] leading-tight',
                            oos ? 'text-red-500 font-bold' : 'text-gray-400')}>
                            {c.avail > 0 ? c.avail : (oos ? 'OOS' : '·')}
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900 bg-gray-50">{r.totalQty.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(r.totalRev)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{r.totalStoreRev > 0 ? fmtM(r.totalStoreRev) : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-purple-700">{r.totalOtherRev > 0 ? fmtM(r.totalOtherRev) : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.dcRate}%</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.cogsRate}%</td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.totalAvail === 0 && r.totalQty > 0 ? 'text-red-500 font-bold' : 'text-gray-700')}>
                      {r.totalAvail.toLocaleString()}
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.totalTrf > 0 ? 'text-sky-600' : r.totalTrf < 0 ? 'text-rose-500' : 'text-gray-300')}>
                      {r.totalTrf > 0 ? `+${r.totalTrf.toLocaleString()}` : r.totalTrf < 0 ? r.totalTrf.toLocaleString() : '—'}
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.sellThrough >= 70 ? 'text-emerald-600' : r.sellThrough >= 30 ? 'text-amber-500' : 'text-gray-500')}>
                      {r.sellThrough}%
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.wos === 0 ? 'text-gray-300' : r.wos < 2 ? 'text-red-500 font-semibold' : r.wos > 12 ? 'text-amber-500' : 'text-emerald-600')}>
                      {r.wos === 0 ? '—' : r.wos >= 99 ? '99+' : r.wos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 창고 × 사이즈 재고 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Warehouse size={12} /> 창고별 재고 (사이즈별)
            <span className="text-[10px] font-normal text-gray-400">{warehouses.length}개 창고</span>
          </h3>
        </div>
        <div className="overflow-auto">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div>
          ) : warehouses.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">창고 재고가 없습니다.</div>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                  <th className="px-2 py-1.5 text-left">창고명</th>
                  {sizeCols.map(sz => (
                    <th key={sz} className="px-2 py-1.5 text-center whitespace-nowrap border-l border-surface-border/50">{sz}</th>
                  ))}
                  <th className="px-2 py-1.5 text-right">합계</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w, i) => (
                  <tr key={w.whCd}
                    className={cn('border-b border-surface-border/50',
                      i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                    <td className="px-2 py-1.5 text-gray-800 font-medium">
                      {w.whNm} <span className="text-[10px] font-mono text-gray-400">{w.whCd}</span>
                    </td>
                    {sizeCols.map(sz => {
                      const v = w.sizes[sz] ?? 0
                      return (
                        <td key={sz} className={cn('px-1 py-1.5 text-center font-mono border-l border-surface-border/50',
                          v === 0 ? 'text-gray-300' : 'text-gray-700')}>
                          {v || '·'}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900 bg-gray-50">{w.total.toLocaleString()}</td>
                  </tr>
                ))}
                {/* 합계 행 */}
                <tr className="bg-blue-50/50 font-semibold border-t-2 border-blue-200">
                  <td className="px-2 py-1.5 text-gray-700">전체 합계</td>
                  {sizeCols.map(sz => {
                    const sum = warehouses.reduce((s, w) => s + (w.sizes[sz] ?? 0), 0)
                    return (
                      <td key={sz} className="px-1 py-1.5 text-center font-mono text-gray-900 border-l border-surface-border/50">
                        {sum || '·'}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-right font-mono text-gray-900 bg-blue-100/50">
                    {warehouses.reduce((s, w) => s + w.total, 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
