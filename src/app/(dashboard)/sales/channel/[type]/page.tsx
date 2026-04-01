'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Store, Download, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_NAMES, BRAND_TABS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData } from '@/hooks/useTargetData'
import * as XLSX from 'xlsx'

// 정렬 헬퍼
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
    <th className={cn('px-1 py-1.5 cursor-pointer hover:text-gray-900 whitespace-nowrap', align === 'left' ? 'text-left px-2' : 'text-right')}
      onClick={() => sort.toggle(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        <ArrowUpDown size={8} className={cn(sort.key === k ? 'opacity-100 text-brand-accent' : 'opacity-20')} />
      </span>
    </th>
  )
}

export default function ChannelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { allowedBrands } = useAuth()
  const { targets } = useTargetData()
  const channelName = decodeURIComponent(params.type as string)

  const [brand, setBrand] = useState('all')

  // 메인 데이터 (매장 목록 — 고정)
  const [shopData, setShopData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 필터에 따라 변하는 데이터
  const [items, setItems] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selShop, setSelShop] = useState<string | null>(null)
  const [selItem, setSelItem] = useState<string | null>(null)

  // 정렬
  const shopSort = useSortable('mtdRev')
  const itemSort = useSortable('cwRev')
  const prodSort = useSortable('revenue')

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  // 목표 매칭
  const shopTargetMap = (() => {
    const today = new Date()
    const lastSun = new Date(today); lastSun.setDate(today.getDate() - (today.getDay() === 0 ? 7 : today.getDay()))
    const curMonth = `${lastSun.getFullYear()}${String(lastSun.getMonth()+1).padStart(2,'0')}`
    const withCd = targets.filter(t => t.shopcd)
    const exact = withCd.filter(t => t.yyyymm === curMonth)
    const fb = exact.length > 0 ? exact : withCd.filter(t => t.yyyymm.startsWith(curMonth.slice(0, 4)))
    const div = exact.length > 0 ? 1 : new Set(fb.map(f => f.yyyymm)).size || 1
    const map = new Map<string, number>()
    for (const t of fb) { const cd = (t.shopcd ?? '').trim().toUpperCase(); if (cd) map.set(cd, (map.get(cd) ?? 0) + t.target / div) }
    return map
  })()

  // 1. 메인 데이터 fetch (매장 목록 — 브랜드 변경 시만)
  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/channel-detail?brand=${brand}&channel=${encodeURIComponent(channelName)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setShopData(json)
      setItems(json.items ?? [])
      setProducts(json.products ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [brand, channelName])

  useEffect(() => { setSelShop(null); setSelItem(null); fetchShops() }, [fetchShops])

  // 2. 품목/상품 데이터 fetch (매장 또는 품목 선택 시)
  const fetchFiltered = useCallback(async (shopCd: string | null, item: string | null) => {
    const params = new URLSearchParams({ brand, channel: channelName })
    if (shopCd) params.set('shopCd', shopCd)
    if (item) params.set('item', item)
    try {
      const res = await fetch(`/api/sales/channel-detail?${params}`)
      const json = await res.json()
      if (!res.ok) return
      // 매장 클릭 → 품목/상품만 업데이트 (매장 목록은 유지)
      setItems(json.items ?? [])
      setProducts(json.products ?? [])
    } catch {}
  }, [brand, channelName])

  const handleShopClick = (shopCd: string) => {
    const next = selShop === shopCd ? null : shopCd
    setSelShop(next)
    setSelItem(null)
    fetchFiltered(next, null)
  }

  const handleItemClick = (item: string) => {
    const next = selItem === item ? null : item
    setSelItem(next)
    fetchFiltered(selShop, next)
  }

  const clearFilters = () => {
    setSelShop(null); setSelItem(null)
    // 원본 데이터로 복원
    if (shopData) { setItems(shopData.items ?? []); setProducts(shopData.products ?? []) }
  }

  const downloadExcel = () => {
    if (!shopData?.shops) return
    const rows = shopData.shops.map((s: any) => ({
      '매장코드': s.shopCd, '매장명': s.shopNm, 'MTD매출': s.mtdRev,
      '전주매출': s.cwRev, 'WoW%': s.wow, 'YoY%': s.yoy,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, channelName)
    XLSX.writeFile(wb, `${channelName}_매장실적.xlsx`)
  }

  const kpi = shopData?.kpi

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/sales')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle">
            <ArrowLeft size={12} /> 매출 대시보드
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Store size={18} className="text-gray-400" />{channelName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">매장별 실적 · 단위: 백만원</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {visibleBrands.map(b => (
              <button key={b.value} onClick={() => setBrand(b.value)}
                className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{b.label}</button>
            ))}
          </div>
          <button onClick={fetchShops} disabled={loading} className="text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={downloadExcel} className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 필터 뱃지 */}
      {(selShop || selItem) && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">필터:</span>
          {selShop && <button onClick={() => handleShopClick(selShop)} className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {shopData?.shops?.find((s: any) => s.shopCd === selShop)?.shopNm ?? selShop} ✕</button>}
          {selItem && <button onClick={() => handleItemClick(selItem)} className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
            {selItem} ✕</button>}
          <button onClick={clearFilters} className="text-[10px] text-gray-400 hover:text-gray-600 underline">전체 해제</button>
        </div>
      )}

      {/* KPI */}
      {!loading && kpi && (
        <div className="grid grid-cols-5 gap-3">
          {([
            { title: '매장수', value: `${kpi.shopCount}개` },
            { title: 'MTD 매출', value: `${fmtM(kpi.mtdRev)}백만` },
            { title: '전주 매출', value: `${fmtM(kpi.cwRev)}백만` },
            { title: 'WoW', value: `${kpi.wow >= 0 ? '+' : ''}${kpi.wow}%`, color: kpi.wow >= 0 ? 'text-emerald-600' : 'text-red-500' },
            { title: 'YoY', value: `${kpi.yoy >= 0 ? '+' : ''}${kpi.yoy}%`, color: kpi.yoy >= 0 ? 'text-emerald-600' : 'text-red-500' },
          ] as { title: string; value: string; color?: string }[]).map(k => (
            <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase">{k.title}</p>
              <p className={cn('text-xl font-bold mt-1', k.color || 'text-gray-900')}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3개 테이블 */}
      <div className="flex gap-3" style={{ height: 1000 }}>

        {/* 매장별 실적 */}
        <div className="flex-[4] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">매장별 실적</h3>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-4 space-y-2">{Array.from({length:10}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div> : (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <SortTh k="shopNm" label="매장명" sort={shopSort} align="left" />
                    <SortTh k="target" label="목표" sort={shopSort} />
                    <SortTh k="mtdRev" label="MTD" sort={shopSort} />
                    <SortTh k="ach" label="ACH%" sort={shopSort} />
                    <SortTh k="cwRev" label="전주" sort={shopSort} />
                    <SortTh k="wow" label="WoW" sort={shopSort} />
                    <SortTh k="yoy" label="YoY" sort={shopSort} />
                  </tr>
                </thead>
                <tbody>
                  {shopSort.sort((shopData?.shops ?? []).map((s: any) => ({
                    ...s,
                    target: shopTargetMap.get(s.shopCd?.toUpperCase()) ?? 0,
                    ach: shopTargetMap.get(s.shopCd?.toUpperCase()) ? Math.round(s.mtdRev / shopTargetMap.get(s.shopCd?.toUpperCase())! * 100) : 0,
                  }))).map((shop: any, i: number) => {
                    const isSel = selShop === shop.shopCd
                    const tgt = shop.target || null
                    const ach = tgt ? shop.ach : null
                    return (
                      <tr key={shop.shopCd} onClick={() => handleShopClick(shop.shopCd)}
                        className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                          isSel ? 'bg-blue-50' : i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                        <td className="px-2 py-1.5 font-medium text-gray-800 truncate max-w-[140px]">{shop.shopNm}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-gray-400">{tgt ? fmtM(tgt) : '—'}</td>
                        <td className="px-1 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(shop.mtdRev)}</td>
                        <td className={cn('px-1 py-1.5 text-right font-semibold', ach==null?'text-gray-300':ach>=100?'text-emerald-600':ach>=80?'text-amber-500':'text-red-500')}>
                          {ach!=null ? `${ach}%` : '—'}
                        </td>
                        <td className="px-1 py-1.5 text-right font-mono text-gray-600">{fmtM(shop.cwRev)}</td>
                        <td className={cn('px-1 py-1.5 text-right font-mono', shop.wow>=0?'text-emerald-600':'text-red-500')}>
                          {shop.pwRev>0 ? `${shop.wow>=0?'+':''}${shop.wow}%` : '—'}
                        </td>
                        <td className={cn('px-1 py-1.5 text-right font-mono', shop.yoy>=0?'text-emerald-600':'text-red-500')}>
                          {shop.lyRev>0 ? `${shop.yoy>=0?'+':''}${shop.yoy}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 품목별 */}
        <div className="flex-[2] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">품목별</h3>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-2 space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-6 bg-surface-subtle animate-pulse rounded"/>)}</div> : items.length ? (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <SortTh k="item" label="품목" sort={itemSort} align="left" />
                    <SortTh k="cwRev" label="전주" sort={itemSort} />
                    <SortTh k="wow" label="WoW" sort={itemSort} />
                    <SortTh k="yoy" label="YoY" sort={itemSort} />
                    <SortTh k="dcRate" label="DC%" sort={itemSort} />
                  </tr>
                </thead>
                <tbody>
                  {itemSort.sort(items).map((item: any) => {
                    const isItemSel = selItem === item.item
                    return (
                      <tr key={item.item} onClick={() => handleItemClick(item.item)}
                        className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                          isItemSel ? 'bg-emerald-50' : 'hover:bg-surface-subtle')}>
                        <td className="px-2 py-1.5 text-gray-800 font-medium truncate max-w-[80px]">{item.item}</td>
                        <td className="px-1 py-1.5 text-right font-mono text-gray-700">{fmtM(item.cwRev)}</td>
                        <td className={cn('px-1 py-1.5 text-right font-mono', item.wow>=0?'text-emerald-600':'text-red-500')}>
                          {item.pwRev>0 ? `${item.wow>=0?'+':''}${item.wow}%` : '—'}
                        </td>
                        <td className={cn('px-1 py-1.5 text-right font-mono', item.yoy>=0?'text-emerald-600':'text-red-500')}>
                          {item.lyMtdRev>0 ? `${item.yoy>=0?'+':''}${item.yoy}%` : '—'}
                        </td>
                        <td className="px-1 py-1.5 text-right text-gray-600">{item.dcRate}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <div className="py-8 text-center text-[10px] text-gray-400">데이터 없음</div>}
          </div>
        </div>

        {/* 베스트 상품 TOP 20 */}
        <div className="flex-[4] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">
              전주 베스트 상품 TOP 20
              {selShop && <span className="ml-1 font-normal text-blue-500 text-[10px]">· {shopData?.shops?.find((s:any)=>s.shopCd===selShop)?.shopNm}</span>}
              {selItem && <span className="ml-1 font-normal text-emerald-500 text-[10px]">· {selItem}</span>}
            </h3>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-3 space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div> : products.length ? (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-400 font-semibold">
                    <th className="text-left px-2 py-1.5 w-5">#</th>
                    <SortTh k="code" label="코드" sort={prodSort} align="left" />
                    <SortTh k="name" label="상품명" sort={prodSort} align="left" />
                    <SortTh k="revenue" label="매출" sort={prodSort} />
                    <SortTh k="qty" label="수량" sort={prodSort} />
                    <SortTh k="dcRate" label="DC%" sort={prodSort} />
                    <SortTh k="cogsRate" label="원가율" sort={prodSort} />
                    <SortTh k="wow" label="WoW" sort={prodSort} />
                  </tr>
                </thead>
                <tbody>
                  {prodSort.sort(products).map((p: any, i: number) => (
                    <tr key={p.code+i} className="border-b border-surface-border/50 hover:bg-surface-subtle">
                      <td className="px-2 py-1.5 text-gray-400 font-mono">{i+1}</td>
                      <td className="px-1 py-1.5 font-mono text-gray-400 text-[9px]">{p.code}</td>
                      <td className="px-1 py-1.5">
                        <div className="font-medium text-gray-800 truncate max-w-[140px]">{p.name}</div>
                        <span className="px-1 py-px rounded-full text-[8px] font-bold text-white" style={{background:BRAND_COLORS[p.brand]??'#999'}}>{BRAND_NAMES[p.brand]??p.brand}</span>
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono font-semibold text-gray-800">{fmtM(p.revenue)}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-600">{p.qty?.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right text-gray-600">{p.dcRate}%</td>
                      <td className="px-1 py-1.5 text-right text-gray-600">{p.cogsRate}%</td>
                      <td className={cn('px-1 py-1.5 text-right font-mono', p.wow>0?'text-emerald-600':p.wow<0?'text-red-500':'text-gray-300')}>
                        {p.pwRev>0 ? `${p.wow>=0?'+':''}${p.wow}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
