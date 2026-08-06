'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES } from '@/lib/constants'

interface ShopRow {
  shopCd: string; shopNm: string; brandcd: string; channel: string
  cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number
  lyRev: number; lyQty: number; lyTag: number
}
interface ItemRow { brandcd: string; item: string; cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number; lyRev: number; lyTag: number }
interface StyleRow { brandcd: string; stylecd: string; styleNm: string; item: string; season: string; year: string; cyRev: number; cyTag: number; prevRev: number }
interface Agg { cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number; lyRev: number; lyQty: number; lyTag: number }
const ADULT = ['CO', 'LE', 'WA']
const zero = (): Agg => ({ cyRev: 0, cyQty: 0, cyTag: 0, prevRev: 0, prevTag: 0, lyRev: 0, lyQty: 0, lyTag: 0 })
const add = (a: Agg, s: ShopRow) => { a.cyRev += s.cyRev; a.cyQty += s.cyQty; a.cyTag += s.cyTag; a.prevRev += s.prevRev; a.prevTag += s.prevTag; a.lyRev += s.lyRev; a.lyQty += s.lyQty; a.lyTag += s.lyTag }
const discOf = (rev: number, tag: number) => tag > 0 ? (1 - rev / tag) * 100 : null
const dptTxt = (cur: number, curT: number, base: number, baseT: number) => {
  const a = discOf(cur, curT), b = discOf(base, baseT)
  if (a == null || b == null) return ''
  const d = a - b
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pt`
}

const M = (v: number) => Math.round(v / 1e6).toLocaleString()          // 백만원
const EOK = (v: number) => (v / 1e8).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) // 억
const pct = (cur: number, base: number) => base > 0 ? (cur / base - 1) * 100 : null
const pctTxt = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const gapTxt = (v: number) => `${v >= 0 ? '+' : ''}${M(v)}`
const disc = (a: Agg) => a.cyTag > 0 ? (1 - a.cyRev / a.cyTag) * 100 : null
const chgCls = (v: number | null) => v == null ? 'text-gray-400' : v >= 0 ? 'text-red-600' : 'text-blue-600'

const fmtDate = (ymd: string) => `${Number(ymd.slice(4, 6))}/${Number(ymd.slice(6, 8))}`
const shiftYmd = (ymd: string, days: number) => {
  const d = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)))
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

export default function WeeklyReportPage() {
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [shops, setShops] = useState<ShopRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [styles, setStyles] = useState<StyleRow[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async (ws: string | null) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/sales/weekly-report${ws ? `?weekStart=${ws}` : ''}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setShops(json.shops ?? [])
      setItems(json.items ?? [])
      setStyles(json.styles ?? [])
      setMeta(json.meta ?? null)
      if (!ws && json.meta?.weekStart) setWeekStart(json.meta.weekStart)
    } catch (e) { setError(String(e)); setShops([]); setItems([]); setStyles([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(weekStart) }, [weekStart, fetchData])

  // 집계
  const byBrand = useMemo(() => {
    const m = new Map<string, Agg>()
    for (const s of shops) { if (!m.has(s.brandcd)) m.set(s.brandcd, zero()); add(m.get(s.brandcd)!, s) }
    return m
  }, [shops])

  const all = useMemo(() => { const a = zero(); for (const s of shops) add(a, s); return a }, [shops])

  const brandOrder = useMemo(() => {
    const present = Array.from(byBrand.keys())
    return [...ADULT.filter(b => present.includes(b)), ...present.filter(b => !ADULT.includes(b))]
  }, [byBrand])

  // 브랜드별 채널 breakdown
  const channelsByBrand = useMemo(() => {
    const m = new Map<string, Map<string, Agg>>()
    for (const s of shops) {
      if (!m.has(s.brandcd)) m.set(s.brandcd, new Map())
      const cm = m.get(s.brandcd)!
      if (!cm.has(s.channel)) cm.set(s.channel, zero())
      add(cm.get(s.channel)!, s)
    }
    return m
  }, [shops])

  // 브랜드별 주요 품목 (금주 매출 상위 6)
  const itemsByBrand = useMemo(() => {
    const m = new Map<string, ItemRow[]>()
    for (const it of items) { if (!m.has(it.brandcd)) m.set(it.brandcd, []); m.get(it.brandcd)!.push(it) }
    for (const [k, list] of m) m.set(k, list.filter(i => i.cyRev > 0).sort((a, b) => b.cyRev - a.cyRev).slice(0, 6))
    return m
  }, [items])

  // 브랜드별 주요 변화: 전주 대비 급증/급감 Top2 (매장은 사입 등 제외)
  const topBoth = <T extends { gap: number }>(list: T[], n: number) => ({
    up: [...list].filter(x => x.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, n),
    down: [...list].filter(x => x.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, n),
  })
  const shopMoversByBrand = useMemo(() => {
    const m = new Map<string, ReturnType<typeof topBoth<ShopRow & { gap: number }>>>()
    for (const b of Array.from(byBrand.keys())) {
      const list = shops.filter(s => s.brandcd === b && (s.cyRev > 0 || s.prevRev > 0) && !/사입/.test(s.channel)).map(s => ({ ...s, gap: s.cyRev - s.prevRev }))
      m.set(b, topBoth(list, 5))
    }
    return m
  }, [shops, byBrand])
  const styleMoversByBrand = useMemo(() => {
    const m = new Map<string, ReturnType<typeof topBoth<StyleRow & { gap: number }>>>()
    for (const b of Array.from(new Set(styles.map(s => s.brandcd)))) {
      const list = styles.filter(s => s.brandcd === b && (s.cyRev > 0 || s.prevRev > 0)).map(s => ({ ...s, gap: s.cyRev - s.prevRev }))
      m.set(b, topBoth(list, 5))
    }
    return m
  }, [styles])
  // 브랜드별 금주 베스트 상품 (매출 상위 6)
  const bestStylesByBrand = useMemo(() => {
    const m = new Map<string, StyleRow[]>()
    for (const b of Array.from(new Set(styles.map(s => s.brandcd)))) {
      m.set(b, styles.filter(s => s.brandcd === b && s.cyRev > 0).sort((a, c) => c.cyRev - a.cyRev).slice(0, 6))
    }
    return m
  }, [styles])

  const wowA = pct(all.cyRev, all.prevRev)
  const yoyA = pct(all.cyRev, all.lyRev)

  const label = meta ? `${fmtDate(meta.weekStart)}~${fmtDate(meta.weekEnd)}` : ''

  // 웹(HTML) 스냅샷 다운로드 — 앱 CSS를 통째로 포함해 화면 그대로 저장 (공유용)
  const exportHtml = () => {
    const root = reportRef.current
    if (!root) return
    // 문서의 모든 CSS 규칙 수집 (Tailwind 포함, 동일 출처만 접근 가능)
    let css = ''
    for (const sheet of Array.from(document.styleSheets)) {
      try { for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n' } catch { /* cross-origin 무시 */ }
    }
    const clone = root.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-noexport]').forEach(el => el.remove())
    clone.style.maxWidth = '1200px'; clone.style.margin = '0 auto'
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>주간 보고 ${label}</title><style>${css}</style></head><body style="margin:0;background:#fff;">${clone.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `주간보고_${meta?.weekStart ?? ''}.html`
    a.click()
    URL.revokeObjectURL(url)
  }
  const canNext = meta && weekStart && shiftYmd(weekStart, 7) <= (() => { const n = new Date(); const mon = new Date(n); mon.setDate(n.getDate() - ((n.getDay() + 6) % 7)); return `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}` })()

  // 원인분해 (전년동주 대비): 수량효과 = ΔQ×ASP_ly, 단가효과 = Q_cy×ΔASP
  // 증감 셀: 윗줄 매출 %+gap(백만) / 아랫줄 할인율 Δpt
  const ChgTd = (curRev: number, baseRev: number, curTag: number, baseTag: number, padR = 'px-2') => {
    const p = pct(curRev, baseRev), g = curRev - baseRev
    const dpt = dptTxt(curRev, curTag, baseRev, baseTag)
    return (
      <td className={cn('py-1 text-right font-mono whitespace-nowrap align-top', padR)}>
        <div><span className={chgCls(p)}>{pctTxt(p)}</span>{g !== 0 && <span className={cn('ml-1 text-[9px]', chgCls(g))}>({gapTxt(g)})</span>}</div>
        {dpt && <div className="text-[9px] text-gray-400">할인 {dpt}</div>}
      </td>
    )
  }

  return (
    <div ref={reportRef} className="flex flex-col gap-4 p-5 min-h-0 max-w-[1200px] mx-auto print:p-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-surface-border pb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><FileText size={20} className="text-brand-accent" />성인 영업본부 주간 현황 보고</h1>
          <p className="text-sm text-gray-500 mt-1">기준주 <b className="text-gray-800">{label}</b> · 전채널 VAT제외 · 전년비=동요일(52주 전) · 단위 백만원</p>
        </div>
        <div data-noexport className="flex items-center gap-1.5 print:hidden">
          <button onClick={() => weekStart && setWeekStart(shiftYmd(weekStart, -7))} className="p-1.5 border border-surface-border rounded-lg text-gray-500 hover:bg-surface-subtle"><ChevronLeft size={15} /></button>
          <button onClick={() => canNext && weekStart && setWeekStart(shiftYmd(weekStart, 7))} disabled={!canNext} className="p-1.5 border border-surface-border rounded-lg text-gray-500 hover:bg-surface-subtle disabled:opacity-30"><ChevronRight size={15} /></button>
          <button onClick={() => fetchData(weekStart)} disabled={loading} className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회</button>
          <button onClick={exportHtml} disabled={loading || shops.length === 0} className="flex items-center gap-1 text-xs text-white bg-brand-accent rounded-lg px-2.5 py-1.5 disabled:opacity-40"><Download size={12} /> 웹 다운로드</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-surface-subtle animate-pulse rounded-xl" />)}</div>
      ) : (
        <>
          {/* 0. 헤드라인 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-brand-accent/10 to-transparent rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">전체 주매출 (전 브랜드)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{EOK(all.cyRev)}<span className="text-base font-medium text-gray-400 ml-1">억</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">전주 대비</p>
              <p className={cn('text-3xl font-bold mt-1', chgCls(wowA))}>{pctTxt(wowA)}</p>
              <p className={cn('text-xs mt-0.5', chgCls(all.cyRev - all.prevRev))}>{gapTxt(all.cyRev - all.prevRev)}백만 · 전주 {EOK(all.prevRev)}억</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">전년 동주 대비</p>
              <p className={cn('text-3xl font-bold mt-1', chgCls(yoyA))}>{pctTxt(yoyA)}</p>
              <p className={cn('text-xs mt-0.5', chgCls(all.cyRev - all.lyRev))}>{gapTxt(all.cyRev - all.lyRev)}백만 · 전년 {EOK(all.lyRev)}억</p>
            </div>
          </div>

          {/* 1. 실적 현황 */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-2">1. 실적 현황</h2>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">브랜드</th>
                    <th className="text-right px-3 py-2">주매출(백만)</th>
                    <th className="text-right px-3 py-2">전주비</th>
                    <th className="text-right px-3 py-2">gap</th>
                    <th className="text-right px-3 py-2">전년동주비</th>
                    <th className="text-right px-3 py-2">gap</th>
                    <th className="text-right px-3 py-2">실질할인율</th>
                    <th className="text-right px-3 py-2">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rowFor = (name: string, a: Agg, strong = false) => {
                      const wow = pct(a.cyRev, a.prevRev), yoy = pct(a.cyRev, a.lyRev), d = disc(a)
                      return (
                        <tr key={name} className={cn('border-t border-surface-border/60', strong ? 'bg-brand-accent/5 font-semibold' : '')}>
                          <td className="text-left px-3 py-1.5 text-gray-800">{name}</td>
                          <td className="text-right px-3 py-1.5 font-mono font-semibold text-gray-900">{M(a.cyRev)}</td>
                          <td className={cn('text-right px-3 py-1.5 font-mono', chgCls(wow))}>{pctTxt(wow)}</td>
                          <td className={cn('text-right px-3 py-1.5 font-mono text-[11px]', chgCls(a.cyRev - a.prevRev))}>{gapTxt(a.cyRev - a.prevRev)}</td>
                          <td className={cn('text-right px-3 py-1.5 font-mono', chgCls(yoy))}>{pctTxt(yoy)}</td>
                          <td className={cn('text-right px-3 py-1.5 font-mono text-[11px]', chgCls(a.cyRev - a.lyRev))}>{gapTxt(a.cyRev - a.lyRev)}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-gray-600">{d == null ? '—' : `${d.toFixed(1)}%`}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-gray-600">{a.cyQty.toLocaleString()}</td>
                        </tr>
                      )
                    }
                    return [
                      rowFor('전체 합계', all, true),
                      ...brandOrder.map(b => rowFor(BRAND_NAMES[b] ?? b, byBrand.get(b)!)),
                    ]
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. 브랜드별 채널 + 주요 품목 + 주요 변화 */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-2">2. 브랜드별 채널 · 주요 품목 · 주요 변화 <span className="font-normal text-gray-400">· 주매출(백만) · 할인율 · 전주비 · 전년비 (증감 아래 = 할인 Δpt, () = 백만 gap)</span></h2>
            <div className="space-y-3">
              {brandOrder.map(b => {
                const cm = channelsByBrand.get(b)
                const chList = cm ? Array.from(cm.entries()).map(([ch, a]) => ({ ch, a })).filter(x => x.a.cyRev > 0 || x.a.lyRev > 0).sort((x, y) => y.a.cyRev - x.a.cyRev) : []
                const itList = itemsByBrand.get(b) ?? []
                if (chList.length === 0 && itList.length === 0) return null
                const ba = byBrand.get(b)!
                const HdrRow = ({ first }: { first: string }) => (
                  <tr className="text-[9px] text-gray-400 border-b border-surface-border/60">
                    <th className="px-3 py-1 text-left font-medium">{first}</th>
                    <th className="px-2 py-1 text-right font-medium">매출</th>
                    <th className="px-2 py-1 text-right font-medium">할인</th>
                    <th className="px-2 py-1 text-right font-medium">전주</th>
                    <th className="px-3 py-1 text-right font-medium">전년</th>
                  </tr>
                )
                return (
                  <div key={b} className="rounded-xl border border-surface-border overflow-hidden break-inside-avoid">
                    <div className="px-3 py-2 bg-gray-100 flex items-center justify-between flex-wrap gap-1">
                      <span className="text-sm font-bold text-gray-800">{BRAND_NAMES[b] ?? b}</span>
                      <span className="text-[11px] font-mono text-gray-600">
                        주 {M(ba.cyRev)}백만 · 할인 {disc(ba) == null ? '—' : `${disc(ba)!.toFixed(1)}%`} <span className="text-gray-400">(전주 {dptTxt(ba.cyRev, ba.cyTag, ba.prevRev, ba.prevTag) || '—'}·전년 {dptTxt(ba.cyRev, ba.cyTag, ba.lyRev, ba.lyTag) || '—'})</span>
                        {' '}· 전주 <b className={chgCls(pct(ba.cyRev, ba.prevRev))}>{pctTxt(pct(ba.cyRev, ba.prevRev))}({gapTxt(ba.cyRev - ba.prevRev)})</b>
                        {' '}· 전년 <b className={chgCls(pct(ba.cyRev, ba.lyRev))}>{pctTxt(pct(ba.cyRev, ba.lyRev))}({gapTxt(ba.cyRev - ba.lyRev)})</b>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-border">
                      {/* 채널 */}
                      <div>
                        <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50/60">채널</div>
                        <table className="w-full text-[11px]">
                          <thead><HdrRow first="채널" /></thead>
                          <tbody>
                            {chList.map(({ ch, a }) => (
                              <tr key={ch} className="border-t border-surface-border/50">
                                <td className="px-3 py-1 text-gray-600 whitespace-nowrap">{ch || '—'}</td>
                                <td className="px-2 py-1 text-right font-mono text-gray-900">{M(a.cyRev)}</td>
                                <td className="px-2 py-1 text-right font-mono text-gray-500 align-top">{disc(a) == null ? '—' : `${disc(a)!.toFixed(0)}%`}</td>
                                {ChgTd(a.cyRev, a.prevRev, a.cyTag, a.prevTag)}
                                {ChgTd(a.cyRev, a.lyRev, a.cyTag, a.lyTag, 'px-3')}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* 주요 품목 */}
                      <div>
                        <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50/60">주요 품목 (금주 상위)</div>
                        <table className="w-full text-[11px]">
                          <thead><HdrRow first="품목" /></thead>
                          <tbody>
                            {itList.map((it, i) => {
                              const idc = it.cyTag > 0 ? (1 - it.cyRev / it.cyTag) * 100 : null
                              return (
                                <tr key={i} className="border-t border-surface-border/50">
                                  <td className="px-3 py-1 text-gray-600 truncate max-w-[120px]" title={it.item}>{it.item}</td>
                                  <td className="px-2 py-1 text-right font-mono text-gray-900">{M(it.cyRev)}</td>
                                  <td className="px-2 py-1 text-right font-mono text-gray-500 align-top">{idc == null ? '—' : `${idc.toFixed(0)}%`}</td>
                                  {ChgTd(it.cyRev, it.prevRev, it.cyTag, it.prevTag)}
                                  {ChgTd(it.cyRev, it.lyRev, it.cyTag, it.lyTag, 'px-3')}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                        {/* 금주 베스트 상품 */}
                        {(bestStylesByBrand.get(b)?.length ?? 0) > 0 && (
                          <>
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400 bg-gray-50/60 border-t border-surface-border">금주 베스트 상품 (매출 상위)</div>
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="text-[9px] text-gray-400 border-b border-surface-border/60">
                                  <th className="px-3 py-1 text-left font-medium">상품(시즌)</th>
                                  <th className="px-2 py-1 text-right font-medium">매출</th>
                                  <th className="px-2 py-1 text-right font-medium">할인</th>
                                  <th className="px-3 py-1 text-right font-medium">전주</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bestStylesByBrand.get(b)!.map((s, i) => {
                                  const sdc = discOf(s.cyRev, s.cyTag)
                                  return (
                                    <tr key={i} className="border-t border-surface-border/50">
                                      <td className="px-3 py-1 text-gray-600 truncate max-w-[150px]" title={`${s.styleNm} · ${s.item} · ${s.year} ${s.season}`}>{s.styleNm} <span className="text-gray-400">{s.year}{s.season}</span></td>
                                      <td className="px-2 py-1 text-right font-mono text-gray-900">{M(s.cyRev)}</td>
                                      <td className="px-2 py-1 text-right font-mono text-gray-500">{sdc == null ? '—' : `${sdc.toFixed(0)}%`}</td>
                                      <td className="px-3 py-1 text-right font-mono whitespace-nowrap">
                                        <span className={chgCls(pct(s.cyRev, s.prevRev))}>{pctTxt(pct(s.cyRev, s.prevRev))}</span>
                                        {s.cyRev - s.prevRev !== 0 && <span className={cn('ml-1 text-[9px]', chgCls(s.cyRev - s.prevRev))}>({gapTxt(s.cyRev - s.prevRev)})</span>}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </>
                        )}
                      </div>
                    </div>
                    {/* 주요 변화 (전주 대비) */}
                    {(() => {
                      const sm = shopMoversByBrand.get(b); const stm = styleMoversByBrand.get(b)
                      const smList = sm ? [...sm.up, ...sm.down] : []
                      const stmList = stm ? [...stm.up, ...stm.down] : []
                      if (smList.length === 0 && stmList.length === 0) return null
                      const moverRows = (rows: any[], lab: (x: any) => string, up: number, season: boolean) => rows.map((x, i) => {
                        const d = discOf(x.cyRev, x.cyTag)
                        return (
                          <tr key={i} className={cn('border-t border-surface-border/40', i === up && 'border-t border-gray-200')}>
                            <td className="px-3 py-0.5 text-gray-600 truncate max-w-[160px]" title={lab(x)}>
                              <span className={cn('mr-1', x.gap >= 0 ? 'text-red-500' : 'text-blue-500')}>{x.gap >= 0 ? '▲' : '▼'}</span>{lab(x)}
                              {season && (x.year || x.season) && <span className="ml-1 text-[9px] text-gray-400">{x.year}{x.season}</span>}
                            </td>
                            <td className="px-2 py-0.5 text-right font-mono text-gray-400 text-[10px]">{d == null ? '' : `${d.toFixed(0)}%`}</td>
                            <td className={cn('px-3 py-0.5 text-right font-mono', chgCls(x.gap))}>{gapTxt(x.gap)}</td>
                          </tr>
                        )
                      })
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-border border-t border-surface-border bg-amber-50/20">
                          <div>
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400">주요 변화 · 매장 <span className="font-normal">(전주 대비, 사입 제외)</span></div>
                            <table className="w-full text-[11px]">
                              <thead><tr className="text-[9px] text-gray-400 border-b border-surface-border/60"><th className="px-3 py-1 text-left font-medium">매장(채널)</th><th className="px-2 py-1 text-right font-medium">할인</th><th className="px-3 py-1 text-right font-medium">전주증감</th></tr></thead>
                              <tbody>{moverRows(smList, (x) => `${x.shopNm} · ${x.channel}`, sm?.up.length ?? 0, false)}</tbody>
                            </table>
                          </div>
                          <div>
                            <div className="px-3 py-1 text-[10px] font-semibold text-gray-400">주요 변화 · 상품 <span className="font-normal">(전주 대비 스타일)</span></div>
                            <table className="w-full text-[11px]">
                              <thead><tr className="text-[9px] text-gray-400 border-b border-surface-border/60"><th className="px-3 py-1 text-left font-medium">상품(품목·시즌)</th><th className="px-2 py-1 text-right font-medium">할인</th><th className="px-3 py-1 text-right font-medium">전주증감</th></tr></thead>
                              <tbody>{moverRows(stmList, (x) => `${x.styleNm} · ${x.item}`, stm?.up.length ?? 0, true)}</tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </section>

          <p className="text-[10px] text-gray-400">※ 동업계 비교는 별도 [동업계 비교] 메뉴 참조 (일부 매장 이중 입력 등 신뢰도 주의). 목표 진도율은 다음 단계 반영 예정.</p>
        </>
      )}
    </div>
  )
}
