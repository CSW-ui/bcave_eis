'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, ArrowUpDown, Search, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_COLORS, BRAND_TABS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄', year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
  { label: '전체', year: '', season: '' },
]

interface StyleRow {
  styleCd: string; styleNm: string; brandcd: string
  itemNm: string; year: string; season: string
  tagPrice: number
  rev: number; storeRev: number; otherRev: number
  qty: number
  shopInv: number; shopAvail: number; shopTransfer: number; whInv: number
  sellThrough: number; wos: number; dcRate: number
}

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const ymdToCompact = (s: string) => s.replace(/-/g, '')

function useSortable(defaultKey: string) {
  const [key, setKey] = useState(defaultKey)
  const [dir, setDir] = useState<'asc'|'desc'>('desc')
  const toggle = (k: string) => { if (key === k) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setKey(k); setDir('desc') } }
  const sort = <T,>(arr: T[]): T[] => [...arr].sort((a: any, b: any) => {
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

export default function ProductSearchPage() {
  const router = useRouter()
  const { allowedBrands } = useAuth()

  const today = new Date()
  const yesterday = new Date(today.getTime() - 86400000)
  // 매월 1일에 from(이번달 1일) > to(어제=지난달 말일)이 되는 문제 방지: 지난달로 폴백
  const isFirstOfMonth = today.getDate() === 1
  const defaultTo = toYmd(yesterday)
  const defaultFrom = isFirstOfMonth
    ? toYmd(new Date(today.getFullYear(), today.getMonth() - 1, 1))
    : toYmd(new Date(today.getFullYear(), today.getMonth(), 1))

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [brandSel, setBrandSel] = useState<Set<string>>(new Set())
  const [seasonIdx, setSeasonIdx] = useState(0)
  const [itemSel, setItemSel] = useState('')
  const [q, setQ] = useState('')
  const [soldOnly, setSoldOnly] = useState(true)
  const [items, setItems] = useState<string[]>([])
  const [styles, setStyles] = useState<StyleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const sort = useSortable('rev')

  const brandOptions = (allowedBrands ?? BRAND_TABS.filter(b => b.value !== 'all').map(b => b.value))
    .filter(b => b !== 'all')

  // 품목 리스트 (전체 브랜드 기준)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/sales/items?brand=all')
        const json = await res.json()
        const set = new Set<string>()
        for (const r of (json.items ?? json.data ?? [])) {
          if (r.item || r.ITEMNM) set.add(r.item ?? r.ITEMNM)
        }
        setItems(Array.from(set).sort())
      } catch {}
    })()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sel = SEASON_OPTIONS[seasonIdx]
      const brandsParam = brandSel.size === 0 || brandSel.size === brandOptions.length ? 'all' : Array.from(brandSel).join(',')
      const params = new URLSearchParams({
        brands: brandsParam,
        from: ymdToCompact(from),
        to: ymdToCompact(to),
      })
      if (sel.year) params.set('year', sel.year)
      if (sel.season) params.set('seasons', sel.season)
      if (itemSel) params.set('item', itemSel)
      if (q.trim()) params.set('q', q.trim())
      if (!soldOnly) params.set('soldOnly', '0')
      const res = await fetch(`/api/planning/style-search?${params}`)
      const json = await res.json()
      if (!res.ok) { alert(json.error || '조회 실패'); setStyles([]); return }
      setStyles(json.styles ?? [])
      setTruncated(!!json.meta?.truncated)
    } catch (err) {
      alert(`조회 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [from, to, brandSel, seasonIdx, itemSel, q, soldOnly, brandOptions.length])

  useEffect(() => { fetchData() }, [fetchData])

  const sorted = useMemo(() => sort.sort(styles), [styles, sort])

  const applyPreset = (kind: 'thisMonth'|'lastMonth'|'ytd'|'last7'|'last30') => {
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

  const toggleBrand = (b: string) => setBrandSel(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n })

  const downloadExcel = () => {
    if (sorted.length === 0) return
    const data = sorted.map(r => ({
      스타일코드: r.styleCd, 상품명: r.styleNm,
      브랜드: BRAND_NAMES[r.brandcd] ?? r.brandcd,
      시즌: `${r.year} ${r.season}`, 품목: r.itemNm,
      태그가: r.tagPrice, 매출: r.rev, 매장매출: r.storeRev, 기타매출: r.otherRev, 판매수량: r.qty,
      매장가용: r.shopAvail, 이동입고: r.shopTransfer, 창고재고: r.whInv,
      '판매율': r.sellThrough, WoS: r.wos, 'DC%': r.dcRate,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '상품별')
    XLSX.writeFile(wb, `상품별판매_${ymdToCompact(from)}-${ymdToCompact(to)}.xlsx`)
  }

  const goToStyle = (styleCd: string) => {
    router.push(`/sales/style/${encodeURIComponent(styleCd)}?from=${ymdToCompact(from)}&to=${ymdToCompact(to)}`)
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package size={18} className="text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">상품별 판매조회</h1>
          <span className="text-xs text-gray-400">스타일 단위 · 단위: 백만원</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
          </button>
          <button onClick={downloadExcel} disabled={sorted.length === 0}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5 disabled:opacity-40">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 space-y-2">
        {/* 기간 */}
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
        </div>

        {/* 브랜드 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">브랜드</span>
          {brandOptions.map(b => (
            <button key={b} onClick={() => toggleBrand(b)}
              className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                brandSel.has(b)
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
              {BRAND_NAMES[b] ?? b}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">{brandSel.size === 0 ? '(전체)' : `${brandSel.size}개`}</span>
        </div>

        {/* 시즌 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">시즌</span>
          {SEASON_OPTIONS.map((s, i) => (
            <button key={s.label} onClick={() => setSeasonIdx(i)}
              className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                seasonIdx === i
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
              {s.label}
            </button>
          ))}
        </div>

        {/* 품목 + 검색어 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">품목</span>
          <select value={itemSel} onChange={e => setItemSel(e.target.value)}
            className="text-xs border border-surface-border rounded px-2 py-1 min-w-[140px]">
            <option value="">전체</option>
            {items.map(it => <option key={it} value={it}>{it}</option>)}
          </select>
          <div className="flex items-center gap-1 ml-2 flex-1 max-w-[400px]">
            <Search size={12} className="text-gray-400" />
            <input type="text" placeholder="스타일코드 또는 상품명 검색"
              value={q} onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') fetchData() }}
              className="text-xs border border-surface-border rounded px-2 py-1 w-full" />
          </div>
          <button onClick={() => setSoldOnly(v => !v)}
            title="OFF로 하면 기간 내 미판매 상품(재고만 있는 죽은 SKU)까지 표시"
            className={cn('text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap',
              soldOnly
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
            {soldOnly ? '판매분만' : '미판매 포함'}
          </button>
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">
          {loading ? '조회 중…' : `${sorted.length}개 상품`}
          {truncated && <span className="ml-2 text-amber-600">· 최대 1,000개까지 표시. 필터로 좁혀주세요.</span>}
        </span>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:12}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">조건에 맞는 상품이 없습니다.</div>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                  <SortTh k="styleCd" label="스타일코드" sort={sort} align="left" />
                  <SortTh k="styleNm" label="상품명" sort={sort} align="left" />
                  <th className="text-left px-2 py-1.5">브랜드</th>
                  <SortTh k="season" label="시즌" sort={sort} align="left" />
                  <SortTh k="itemNm" label="품목" sort={sort} align="left" />
                  <SortTh k="tagPrice" label="태그가" sort={sort} />
                  <SortTh k="rev" label="매출" sort={sort} />
                  <SortTh k="storeRev" label="매장매출" sort={sort} />
                  <SortTh k="otherRev" label="기타매출" sort={sort} />
                  <SortTh k="qty" label="판매수량" sort={sort} />
                  <SortTh k="shopAvail" label="매장가용" sort={sort} />
                  <SortTh k="shopTransfer" label="이동" sort={sort} />
                  <SortTh k="whInv" label="창고재고" sort={sort} />
                  <SortTh k="sellThrough" label="판매율" sort={sort} />
                  <SortTh k="wos" label="WoS" sort={sort} />
                  <SortTh k="dcRate" label="DC%" sort={sort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.styleCd}
                    className={cn('border-b border-surface-border/50',
                      i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                    <td className="px-2 py-1.5 font-mono text-[10px]">
                      <button onClick={() => goToStyle(r.styleCd)} className="text-blue-600 hover:underline">{r.styleCd}</button>
                    </td>
                    <td className="px-2 py-1.5 truncate max-w-[200px]">
                      <button onClick={() => goToStyle(r.styleCd)} className="text-blue-700 hover:underline text-left">{r.styleNm}</button>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-px rounded-full text-[9px] font-bold text-white"
                        style={{ background: BRAND_COLORS[r.brandcd] ?? '#999' }}>
                        {BRAND_NAMES[r.brandcd] ?? r.brandcd}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 text-[10px]">{r.year} {r.season}</td>
                    <td className="px-2 py-1.5 text-gray-600 truncate max-w-[100px]">{r.itemNm}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{r.tagPrice.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(r.rev)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-700">{r.storeRev > 0 ? fmtM(r.storeRev) : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-purple-700">{r.otherRev > 0 ? fmtM(r.otherRev) : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-gray-900">{r.qty.toLocaleString()}</td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.shopAvail === 0 && r.qty > 0 ? 'text-red-500 font-bold' : 'text-gray-700')}>
                      {r.shopAvail.toLocaleString()}
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.shopTransfer > 0 ? 'text-sky-600' : r.shopTransfer < 0 ? 'text-rose-500' : 'text-gray-300')}>
                      {r.shopTransfer > 0 ? `+${r.shopTransfer.toLocaleString()}` : r.shopTransfer < 0 ? r.shopTransfer.toLocaleString() : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-600">{r.whInv.toLocaleString()}</td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.sellThrough >= 70 ? 'text-emerald-600' : r.sellThrough >= 30 ? 'text-amber-500' : 'text-gray-500')}>
                      {r.sellThrough}%
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.wos === 0 ? 'text-gray-300' : r.wos < 2 ? 'text-red-500 font-semibold' : r.wos > 12 ? 'text-amber-500' : 'text-emerald-600')}>
                      {r.wos === 0 ? '—' : r.wos >= 99 ? '99+' : r.wos}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.dcRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
