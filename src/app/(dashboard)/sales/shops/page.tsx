'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Download, ArrowUpDown, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_COLORS, BRAND_TABS } from '@/lib/constants'
import { fmtM } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import { useTargetData } from '@/hooks/useTargetData'
import * as XLSX from 'xlsx'

const CHANNEL_OPTIONS = [
  '백화점', '아울렛', '직영점', '쇼핑몰', '대리점', '면세점',
  '본사매장', '팝업', '오프라인 사입', '오프라인 위탁',
  '온라인(무신사)', '온라인(위탁몰)', '온라인(자사몰)', '온라인B2B',
  '해외 사입', '해외 위탁',
]

interface ShopRow {
  shopCd: string; shopNm: string; area: string
  brandcd: string; channel: string
  rev: number; qty: number; atv: number; dcRate: number; cogsRate: number
  normRev: number; coRev: number; promoRev: number
  lyRev: number; yoyAmt: number; yoyPct: number | null
}

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

// YYYY-MM-DD ↔ YYYYMMDD
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const ymdToCompact = (s: string) => s.replace(/-/g, '')

// 기간을 yyyymm별 (해당월에 포함된 일수, 그 월 총 일수) 로 분해
function periodMonthDays(from: string, to: string): Map<string, { inPeriod: number; total: number }> {
  const result = new Map<string, { inPeriod: number; total: number }>()
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) return result
  const fromD = new Date(Number(from.slice(0,4)), Number(from.slice(4,6)) - 1, Number(from.slice(6,8)))
  const toD = new Date(Number(to.slice(0,4)), Number(to.slice(4,6)) - 1, Number(to.slice(6,8)))
  const cur = new Date(fromD)
  while (cur <= toD) {
    const y = cur.getFullYear(), m = cur.getMonth()
    const ym = `${y}${String(m+1).padStart(2,'0')}`
    const monthEnd = new Date(y, m + 1, 0)
    const total = monthEnd.getDate()
    const periodEnd = toD < monthEnd ? toD : monthEnd
    const inPeriod = Math.floor((periodEnd.getTime() - cur.getTime()) / 86400000) + 1
    result.set(ym, { inPeriod, total })
    cur.setMonth(m + 1, 1)
  }
  return result
}

export default function ShopsPage() {
  const { allowedBrands } = useAuth()
  const { targets } = useTargetData()

  // 기본: 이번 달 1일 ~ 어제
  const today = new Date()
  // 매월 1일에 from > to 되는 문제 방지: 1일이면 지난달 1일을 기본으로
  const isFirstOfMonth = today.getDate() === 1
  const defaultFrom = isFirstOfMonth
    ? toYmd(new Date(today.getFullYear(), today.getMonth() - 1, 1))
    : toYmd(new Date(today.getFullYear(), today.getMonth(), 1))
  const defaultTo = toYmd(new Date(today.getTime() - 86400000))

  const router = useRouter()
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [brandSel, setBrandSel] = useState<Set<string>>(new Set())
  const [channelSel, setChannelSel] = useState<Set<string>>(new Set())
  const [areaSel, setAreaSel] = useState<Set<string>>(new Set())
  const [areaQuery, setAreaQuery] = useState('')
  const [shops, setShops] = useState<ShopRow[]>([])
  const [loading, setLoading] = useState(false)
  const sort = useSortable('rev')

  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    shops.forEach(s => { if (s.area) set.add(s.area) })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'))
  }, [shops])

  const brandOptions = (allowedBrands ?? BRAND_TABS.filter(b => b.value !== 'all').map(b => b.value))
    .filter(b => b !== 'all')

  const fetchShops = useCallback(async () => {
    setLoading(true)
    try {
      const brandsParam = brandSel.size === 0 || brandSel.size === brandOptions.length ? 'all' : Array.from(brandSel).join(',')
      const channelsParam = Array.from(channelSel).join(',')
      const url = `/api/sales/shops?from=${ymdToCompact(from)}&to=${ymdToCompact(to)}&brands=${brandsParam}&channels=${encodeURIComponent(channelsParam)}`
      const res = await fetch(url)
      const json = await res.json()
      if (!res.ok) { alert(json.error || '조회 실패'); setShops([]); return }
      setShops(json.shops ?? [])
    } catch (err) {
      alert(`조회 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setLoading(false) }
  }, [from, to, brandSel, channelSel, brandOptions.length])

  useEffect(() => { fetchShops() }, [fetchShops])

  // 매장 목표 안분 (기간 안의 각 월 × 매장 목표 × 해당월 안에 포함된 일수 / 그 월 총 일수)
  const targetMap = useMemo(() => {
    const map = new Map<string, number>()
    const monthDays = periodMonthDays(ymdToCompact(from), ymdToCompact(to))
    if (monthDays.size === 0) return map
    const brandFilter = brandSel.size > 0 && brandSel.size < brandOptions.length
    const channelFilter = channelSel.size > 0
    const allowedBrandNames = new Set(Array.from(brandSel).map(b => BRAND_NAMES[b]))
    for (const t of targets) {
      if (!t.shopcd) continue
      const md = monthDays.get(t.yyyymm)
      if (!md) continue
      if (brandFilter && !allowedBrandNames.has(t.brandnm)) continue
      if (channelFilter && !channelSel.has(t.shoptypenm ?? '')) continue
      const prorated = t.target * md.inPeriod / md.total
      const key = (t.shopcd ?? '').trim().toUpperCase()
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + prorated)
    }
    return map
  }, [targets, from, to, brandSel, channelSel, brandOptions.length])

  const rows = useMemo(() => {
    const qStr = areaQuery.trim().toLowerCase()
    return shops
      .filter(s => {
        if (areaSel.size > 0 && !areaSel.has(s.area ?? '')) return false
        if (qStr && !(s.area ?? '').toLowerCase().includes(qStr)) return false
        return true
      })
      .map(s => {
        const tgt = targetMap.get(s.shopCd?.toUpperCase()) ?? 0
        return {
          ...s,
          target: tgt,
          ach: tgt > 0 ? Math.round(s.rev / tgt * 1000) / 10 : 0,
        }
      })
  }, [shops, targetMap, areaSel, areaQuery])

  const sorted = useMemo(() => sort.sort(rows), [rows, sort])

  const kpi = useMemo(() => {
    const totRev = rows.reduce((s, r) => s + r.rev, 0)
    const totQty = rows.reduce((s, r) => s + r.qty, 0)
    const totTgt = rows.reduce((s, r) => s + r.target, 0)
    const wRev = rows.reduce((s, r) => s + r.rev, 0)
    const wDc = rows.reduce((s, r) => s + r.dcRate * r.rev, 0)
    const wCogs = rows.reduce((s, r) => s + r.cogsRate * r.rev, 0)
    return {
      shopCount: rows.length,
      rev: totRev,
      qty: totQty,
      atv: totQty > 0 ? Math.round(totRev / totQty) : 0,
      avgDc: wRev > 0 ? Math.round(wDc / wRev * 10) / 10 : 0,
      avgCogs: wRev > 0 ? Math.round(wCogs / wRev * 10) / 10 : 0,
      target: totTgt,
      ach: totTgt > 0 ? Math.round(totRev / totTgt * 1000) / 10 : 0,
    }
  }, [rows])

  const toggleBrand = (b: string) => setBrandSel(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n })
  const toggleChannel = (c: string) => setChannelSel(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })
  const toggleArea = (a: string) => setAreaSel(prev => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n })

  const downloadExcel = () => {
    if (rows.length === 0) return
    const data = sorted.map((r: any) => ({
      매장코드: r.shopCd, 매장명: r.shopNm, 지역: r.area, 채널: r.channel,
      브랜드: BRAND_NAMES[r.brandcd] ?? r.brandcd,
      매출: r.rev, 전년: r.lyRev, 전년대비액: r.yoyAmt, '전년비%': r.yoyPct,
      정상매출: r.normRev, 이월매출: r.coRev, 기타매출: r.promoRev,
      수량: r.qty, 객단가: r.atv,
      'DC%': r.dcRate, '원가율%': r.cogsRate,
      목표: r.target, 'ACH%': r.ach,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '매장별 실적')
    XLSX.writeFile(wb, `매장별실적_${ymdToCompact(from)}-${ymdToCompact(to)}.xlsx`)
  }

  // 빠른 기간 프리셋
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

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">매장별 실적</h1>
          <span className="text-xs text-gray-400">단위: 백만원</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchShops} disabled={loading}
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
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 space-y-2.5">
        {/* 기간 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0">기간</span>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="text-xs border border-surface-border rounded px-2 py-1" />
          <span className="text-xs text-gray-400">~</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="text-xs border border-surface-border rounded px-2 py-1" />
          <div className="flex gap-1 ml-2">
            {[
              ['thisMonth', '이번달'], ['lastMonth', '지난달'],
              ['last7', '7일'], ['last30', '30일'], ['ytd', '올해'],
            ].map(([k, l]) => (
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

        {/* 채널 */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0 pt-0.5">채널</span>
          <div className="flex gap-1 flex-wrap flex-1">
            {CHANNEL_OPTIONS.map(c => (
              <button key={c} onClick={() => toggleChannel(c)}
                className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                  channelSel.has(c)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
                {c}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400 ml-1">{channelSel.size === 0 ? '(전체)' : `${channelSel.size}개`}</span>
        </div>

        {/* 지역 */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 w-12 shrink-0 pt-0.5">지역</span>
          <div className="flex gap-1 flex-wrap flex-1 items-center">
            <input
              type="text"
              value={areaQuery}
              onChange={e => setAreaQuery(e.target.value)}
              placeholder="지역명 검색"
              className="text-[11px] border border-surface-border rounded px-2 py-0.5 w-32"
            />
            {areaOptions.length === 0 ? (
              <span className="text-[10px] text-gray-300">데이터 없음</span>
            ) : areaOptions.map(a => (
              <button key={a} onClick={() => toggleArea(a)}
                className={cn('text-[11px] px-2 py-0.5 rounded-full border',
                  areaSel.has(a)
                    ? 'bg-purple-50 border-purple-300 text-purple-700'
                    : 'border-surface-border text-gray-500 hover:bg-surface-subtle')}>
                {a}
              </button>
            ))}
            {(areaSel.size > 0 || areaQuery) && (
              <button onClick={() => { setAreaSel(new Set()); setAreaQuery('') }}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline ml-1">
                해제
              </button>
            )}
          </div>
          <span className="text-[10px] text-gray-400 ml-1">{areaSel.size === 0 && !areaQuery ? '(전체)' : `${areaSel.size}개${areaQuery ? ' + 검색' : ''}`}</span>
        </div>
      </div>

      {/* KPI */}
      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-7 gap-3">
          {([
            { title: '매장수', value: `${kpi.shopCount}개` },
            { title: '매출', value: `${fmtM(kpi.rev)}백만` },
            { title: '수량', value: kpi.qty.toLocaleString() },
            { title: '객단가', value: `${kpi.atv.toLocaleString()}원` },
            { title: '평균 DC%', value: `${kpi.avgDc}%` },
            { title: '매출원가율', value: `${kpi.avgCogs}%` },
            { title: 'ACH%', value: kpi.target > 0 ? `${kpi.ach}%` : '—',
              color: kpi.target > 0 ? (kpi.ach >= 100 ? 'text-emerald-600' : kpi.ach >= 80 ? 'text-amber-500' : 'text-red-500') : undefined },
          ] as { title: string; value: string; color?: string }[]).map(k => (
            <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
              <p className="text-[10px] text-gray-400 uppercase">{k.title}</p>
              <p className={cn('text-lg font-bold mt-0.5', k.color || 'text-gray-900')}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700">매장 리스트</h3>
          <span className="text-[10px] text-gray-400">{loading ? '조회 중…' : `${rows.length}개`}</span>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length:12}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">조건에 맞는 매장이 없습니다.</div>
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                  <SortTh k="shopNm" label="매장명" sort={sort} align="left" />
                  <th className="text-left px-2 py-1.5">브랜드</th>
                  <SortTh k="channel" label="채널" sort={sort} align="left" />
                  <SortTh k="area" label="지역" sort={sort} align="left" />
                  <SortTh k="rev" label="매출" sort={sort} />
                  <SortTh k="lyRev" label="전년" sort={sort} />
                  <SortTh k="yoyAmt" label="전년대비액" sort={sort} />
                  <SortTh k="yoyPct" label="전년비" sort={sort} />
                  <SortTh k="normRev" label="정상매출" sort={sort} />
                  <SortTh k="coRev" label="이월매출" sort={sort} />
                  <SortTh k="promoRev" label="기타매출" sort={sort} />
                  <SortTh k="qty" label="수량" sort={sort} />
                  <SortTh k="atv" label="객단가" sort={sort} />
                  <SortTh k="dcRate" label="DC%" sort={sort} />
                  <SortTh k="cogsRate" label="원가율" sort={sort} />
                  <SortTh k="target" label="목표" sort={sort} />
                  <SortTh k="ach" label="ACH%" sort={sort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r: any, i: number) => (
                  <tr key={`${r.shopCd}-${r.brandcd}-${r.channel}-${i}`}
                    className={cn('border-b border-surface-border/50',
                      i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                    <td className="px-2 py-1.5 font-medium truncate max-w-[180px]">
                      <button onClick={() => router.push(`/sales/shops/${encodeURIComponent(r.shopCd)}?from=${ymdToCompact(from)}&to=${ymdToCompact(to)}`)}
                        className="text-blue-600 hover:text-blue-800 hover:underline text-left">
                        {r.shopNm}
                      </button>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-px rounded-full text-[9px] font-bold text-white"
                        style={{ background: BRAND_COLORS[r.brandcd] ?? '#999' }}>
                        {BRAND_NAMES[r.brandcd] ?? r.brandcd}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-600">{r.channel || '—'}</td>
                    <td className="px-2 py-1.5 text-gray-500 truncate max-w-[100px]">{r.area || '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-600">{fmtM(r.rev)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">{r.lyRev > 0 ? fmtM(r.lyRev) : '—'}</td>
                    <td className={cn('px-2 py-1.5 text-right font-mono',
                      r.lyRev === 0 ? 'text-gray-300' : r.yoyAmt > 0 ? 'text-red-500' : r.yoyAmt < 0 ? 'text-blue-500' : 'text-gray-400')}>
                      {r.lyRev > 0 ? `${r.yoyAmt > 0 ? '+' : ''}${fmtM(r.yoyAmt)}` : '—'}
                    </td>
                    <td className={cn('px-2 py-1.5 text-right font-mono font-semibold',
                      r.yoyPct == null ? 'text-gray-300' : r.yoyPct > 0 ? 'text-red-500' : r.yoyPct < 0 ? 'text-blue-500' : 'text-gray-400')}>
                      {r.yoyPct != null ? `${r.yoyPct > 0 ? '+' : ''}${r.yoyPct}%` : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{fmtM(r.normRev)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-700">{fmtM(r.coRev)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-purple-700">{r.promoRev > 0 ? fmtM(r.promoRev) : '—'}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.qty.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.atv.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.dcRate}%</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">{r.cogsRate}%</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-400">{r.target > 0 ? fmtM(r.target) : '—'}</td>
                    <td className={cn('px-2 py-1.5 text-right font-mono font-semibold',
                      r.target === 0 ? 'text-gray-300' : r.ach >= 100 ? 'text-emerald-600' : r.ach >= 80 ? 'text-amber-500' : 'text-red-500')}>
                      {r.target > 0 ? `${r.ach}%` : '—'}
                    </td>
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
