'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, Download, ArrowUpDown, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_COLORS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import * as XLSX from 'xlsx'

interface Sku {
  styleCd: string; colorCd: string; sizeCd: string
  styleNm: string; itemNm: string; season: string; year: string
  tagPrice: number
  rev: number; storeRev: number; otherRev: number; qty: number; qty4w: number
  shopInv: number; whInv: number
}

interface Kpi {
  rev: number; qty: number; atv: number
  orderCount: number | null; avgOrderRev: number | null
  liveRev: number
  shopInv: number; whInv: number
  wos: number; dcRate: number; periodDays: number
}

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const ymdToCompact = (s: string) => s.replace(/-/g, '')

// 사이즈 표준 정렬 (알파벳/숫자/FREE 휴리스틱)
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

interface GroupRow {
  key: string
  styleCd: string; colorCd: string
  styleNm: string; itemNm: string; season: string; year: string
  tagPrice: number
  sizes: Record<string, { qty: number; shopInv: number; whInv: number; rev: number; qty4w: number }>
  totalQty: number; totalRev: number; totalStoreRev: number; totalOtherRev: number
  totalShopInv: number; totalWhInv: number; totalQty4w: number
  sellThrough: number; wos: number; dcRate: number
}

interface ProductList {
  rows: GroupRow[]
  sizeCols: string[]
  totRev: number
}

function groupSkus(skus: Sku[]): ProductList {
  const groupMap = new Map<string, GroupRow>()
  for (const s of skus) {
    const key = `${s.styleCd}|${s.colorCd}`
    let g = groupMap.get(key)
    if (!g) {
      g = {
        key, styleCd: s.styleCd, colorCd: s.colorCd,
        styleNm: s.styleNm, itemNm: s.itemNm, season: s.season, year: s.year,
        tagPrice: s.tagPrice,
        sizes: {},
        totalQty: 0, totalRev: 0, totalStoreRev: 0, totalOtherRev: 0, totalShopInv: 0, totalWhInv: 0, totalQty4w: 0,
        sellThrough: 0, wos: 0, dcRate: 0,
      }
      groupMap.set(key, g)
    }
    const sz = s.sizeCd || '—'
    g.sizes[sz] = g.sizes[sz] ?? { qty: 0, shopInv: 0, whInv: 0, rev: 0, qty4w: 0 }
    g.sizes[sz].qty += s.qty
    g.sizes[sz].shopInv += s.shopInv
    g.sizes[sz].whInv += s.whInv
    g.sizes[sz].rev += s.rev
    g.sizes[sz].qty4w += s.qty4w
    g.totalQty += s.qty
    g.totalRev += s.rev
    g.totalStoreRev += s.storeRev || 0
    g.totalOtherRev += s.otherRev || 0
    g.totalShopInv += s.shopInv
    g.totalWhInv += s.whInv
    g.totalQty4w += s.qty4w
  }

  for (const g of groupMap.values()) {
    const tagBase = g.tagPrice * g.totalQty
    g.dcRate = tagBase > 0 ? Math.round((1 - g.totalRev / tagBase) * 1000) / 10 : 0
    g.sellThrough = (g.totalQty + g.totalShopInv) > 0
      ? Math.round(g.totalQty / (g.totalQty + g.totalShopInv) * 1000) / 10 : 0
    const avgWeekly = g.totalQty4w / 4
    g.wos = avgWeekly > 0 ? Math.round(g.totalShopInv / avgWeekly * 10) / 10
      : (g.totalShopInv > 0 ? 99 : 0)
  }

  // 전체를 하나의 리스트로 (사이즈 그룹 분할 제거)
  const rows = Array.from(groupMap.values()).sort((a, b) => b.totalRev - a.totalRev)
  const sizeSet = new Set<string>()
  for (const g of rows) for (const sz of Object.keys(g.sizes)) sizeSet.add(sz)
  const sizeCols = Array.from(sizeSet).sort((a, b) => sizeOrder(a) - sizeOrder(b))
  const totRev = rows.reduce((sum, g) => sum + g.totalRev, 0)
  return { rows, sizeCols, totRev }
}

type SortInstance = {
  key: string; dir: 'asc' | 'desc'
  toggle: (k: string) => void
  sort: (arr: GroupRow[]) => GroupRow[]
}

function useSortable(defaultKey: string): SortInstance {
  const [key, setKey] = useState(defaultKey)
  const [dir, setDir] = useState<'asc'|'desc'>('desc')
  const toggle = (k: string) => { if (key === k) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setKey(k); setDir('desc') } }
  const sort = (arr: GroupRow[]) => [...arr].sort((a: any, b: any) => {
    const va = a[key] ?? 0; const vb = b[key] ?? 0
    if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return dir === 'asc' ? va - vb : vb - va
  })
  return { key, dir, toggle, sort }
}

function SortTh({ k, label, sort, align = 'right' }: { k: string; label: string; sort: SortInstance; align?: string }) {
  return (
    <th className={cn('px-2 py-1.5 cursor-pointer hover:text-gray-900 whitespace-nowrap', align === 'left' ? 'text-left' : 'text-right')}
      onClick={() => sort.toggle(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        <ArrowUpDown size={9} className={cn(sort.key === k ? 'opacity-100 text-brand-accent' : 'opacity-20')} />
      </span>
    </th>
  )
}

function ProductListTable({ list, sort, from, to }: { list: ProductList; sort: SortInstance; from: string; to: string }) {
  const sorted = sort.sort(list.rows) as GroupRow[]
  const fromCompact = from.replace(/-/g, '')
  const toCompact = to.replace(/-/g, '')
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700">
          상품 리스트
          <span className="ml-2 text-[10px] font-normal text-gray-400">{list.rows.length}개 · 매출 {fmtM(list.totRev)}백만</span>
        </h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
              <SortTh k="styleCd" label="스타일코드" sort={sort} align="left" />
              <SortTh k="styleNm" label="상품명" sort={sort} align="left" />
              <SortTh k="colorCd" label="컬러" sort={sort} align="left" />
              <SortTh k="season" label="시즌" sort={sort} align="left" />
              <SortTh k="tagPrice" label="태그가" sort={sort} />
              <SortTh k="totalQty" label="판매수량" sort={sort} />
              <SortTh k="totalRev" label="매출" sort={sort} />
              <SortTh k="totalStoreRev" label="매장매출" sort={sort} />
              <SortTh k="totalOtherRev" label="기타매출" sort={sort} />
              <SortTh k="totalShopInv" label="매장재고" sort={sort} />
              <SortTh k="totalWhInv" label="창고재고" sort={sort} />
              <SortTh k="sellThrough" label="ST%" sort={sort} />
              <SortTh k="wos" label="WoS" sort={sort} />
              <SortTh k="dcRate" label="DC%" sort={sort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, i) => {
              const styleParams = new URLSearchParams()
              if (g.colorCd) styleParams.set('color', g.colorCd)
              if (fromCompact) styleParams.set('from', fromCompact)
              if (toCompact) styleParams.set('to', toCompact)
              const styleHref = `/sales/style/${encodeURIComponent(g.styleCd)}?${styleParams.toString()}`
              return (
              <tr key={g.key}
                className={cn('border-b border-surface-border/50',
                  i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  <a href={styleHref} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{g.styleCd}</a>
                </td>
                <td className="px-2 py-1.5 truncate max-w-[200px]">
                  <a href={styleHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">{g.styleNm}</a>
                </td>
                <td className="px-2 py-1.5 text-gray-600">{g.colorCd || '—'}</td>
                <td className="px-2 py-1.5 text-gray-500 text-[10px]">{g.year} {g.season}</td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">{g.tagPrice.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900">{g.totalQty.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(g.totalRev)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{g.totalStoreRev > 0 ? fmtM(g.totalStoreRev) : '—'}</td>
                <td className="px-2 py-1.5 text-right font-mono text-purple-700">{g.totalOtherRev > 0 ? fmtM(g.totalOtherRev) : '—'}</td>
                <td className={cn('px-2 py-1.5 text-right font-mono',
                  g.totalShopInv === 0 && g.totalQty > 0 ? 'text-red-500 font-bold' : 'text-gray-700')}>
                  {g.totalShopInv.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-600">{g.totalWhInv.toLocaleString()}</td>
                <td className={cn('px-2 py-1.5 text-right font-mono',
                  g.sellThrough >= 70 ? 'text-emerald-600' : g.sellThrough >= 30 ? 'text-amber-500' : 'text-gray-500')}>
                  {g.sellThrough}%
                </td>
                <td className={cn('px-2 py-1.5 text-right font-mono',
                  g.wos === 0 ? 'text-gray-300' : g.wos < 2 ? 'text-red-500 font-semibold' : g.wos > 12 ? 'text-amber-500' : 'text-emerald-600')}>
                  {g.wos === 0 ? '—' : g.wos >= 99 ? '99+' : g.wos}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-700">{g.dcRate}%</td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ShopDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const shopCd = decodeURIComponent(params.shopCd as string)

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
  const [shop, setShop] = useState<any>(null)
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [skus, setSkus] = useState<Sku[]>([])
  const [loading, setLoading] = useState(true)
  const sort = useSortable('totalRev')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const url = `/api/sales/shop-detail?shopCd=${encodeURIComponent(shopCd)}&from=${ymdToCompact(from)}&to=${ymdToCompact(to)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) { alert(json.error || '조회 실패'); return }
      setShop(json.shop); setKpi(json.kpi); setSkus(json.skus ?? [])
    } catch (err) {
      alert(`조회 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [shopCd, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const productList = useMemo(() => groupSkus(skus), [skus])

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
    if (productList.rows.length === 0) return
    const data = productList.rows.map(g => {
      const row: Record<string, any> = {
        스타일코드: g.styleCd, 상품명: g.styleNm, 컬러: g.colorCd,
        시즌: `${g.year} ${g.season}`, 품목: g.itemNm, 태그가: g.tagPrice,
      }
      for (const sz of productList.sizeCols) {
        row[`${sz}_판매`] = g.sizes[sz]?.qty ?? 0
        row[`${sz}_매장재고`] = g.sizes[sz]?.shopInv ?? 0
      }
      row['합계판매'] = g.totalQty
      row['매출'] = g.totalRev
      row['매장매출'] = g.totalStoreRev
      row['기타매출'] = g.totalOtherRev
      row['매장재고합계'] = g.totalShopInv
      row['창고재고합계'] = g.totalWhInv
      row['ST%'] = g.sellThrough
      row['WoS'] = g.wos
      row['DC%'] = g.dcRate
      return row
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '상품 리스트')
    XLSX.writeFile(wb, `${shop?.shopNm ?? shopCd}_상품_${ymdToCompact(from)}-${ymdToCompact(to)}.xlsx`)
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sales/shops')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle">
            <ArrowLeft size={12} /> 매장별 실적
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Store size={18} className="text-gray-400" />
              {shop?.shopNm ?? shopCd}
              {shop?.brandcd && (
                <span className="px-1.5 py-px rounded-full text-[9px] font-bold text-white"
                  style={{ background: BRAND_COLORS[shop.brandcd] ?? '#999' }}>
                  {BRAND_NAMES[shop.brandcd] ?? shop.brandcd}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {shop?.channel ? `${shop.channel} · ` : ''}{shop?.area || '—'} · 스타일·컬러 단위 · 단위: 백만원
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
          </button>
          <button onClick={downloadExcel} disabled={productList.rows.length === 0}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5 disabled:opacity-40">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 기간 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
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
          <span className="text-[10px] text-gray-400 ml-2">재고는 현재 시점 · WoS는 최근 4주 평균 기준</span>
        </div>
      </div>

      {/* KPI */}
      {!loading && kpi && (
        <div className="grid grid-cols-9 gap-3">
          {([
            { title: '매출', value: `${fmtM(kpi.rev)}백만` },
            { title: '라이브매출', value: kpi.liveRev > 0 ? `${fmtM(kpi.liveRev)}백만` : '—',
              color: kpi.liveRev > 0 ? 'text-purple-600' : undefined,
              tooltip: 'SALETYPENM=라이브 매출만 별도 집계' },
            { title: '수량', value: kpi.qty.toLocaleString() },
            { title: '객단가', value: `${kpi.atv.toLocaleString()}원` },
            { title: '주문수', value: kpi.orderCount != null ? kpi.orderCount.toLocaleString() : '—',
              tooltip: kpi.orderCount == null ? '현장결제 채널(직영점·백화점·아울렛 등)에서만 산출 · 라이브 매출 제외' : '라이브 매출 제외' },
            { title: '주문별 평균매출', value: kpi.avgOrderRev != null ? `${kpi.avgOrderRev.toLocaleString()}원` : '—',
              tooltip: kpi.avgOrderRev == null ? '현장결제 채널(직영점·백화점·아울렛 등)에서만 산출 · 라이브 매출 제외' : '라이브 매출 제외' },
            { title: 'DC%', value: `${kpi.dcRate}%` },
            { title: '매장재고', value: kpi.shopInv.toLocaleString() },
            { title: 'WoS', value: kpi.wos > 0 ? `${kpi.wos}주` : '—',
              color: kpi.wos === 0 ? undefined : kpi.wos < 2 ? 'text-red-500' : kpi.wos > 12 ? 'text-amber-500' : 'text-emerald-600' },
          ] as { title: string; value: string; color?: string; tooltip?: string }[]).map(k => (
            <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-3" title={k.tooltip}>
              <p className="text-[10px] text-gray-400 uppercase">{k.title}</p>
              <p className={cn('text-lg font-bold mt-0.5', k.color || 'text-gray-900')}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 상품 리스트 (단일 테이블) */}
      {loading ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4 space-y-2">
          {Array.from({length:12}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}
        </div>
      ) : productList.rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-sm py-12 text-center text-xs text-gray-400">
          이 기간 매출/재고가 없습니다.
        </div>
      ) : (
        <ProductListTable list={productList} sort={sort} from={from} to={to} />
      )}
    </div>
  )
}
