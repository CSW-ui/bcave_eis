'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, ChevronLeft, ChevronRight, Download, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES } from '@/lib/constants'

type Vin = 'N' | 'C'
interface ShopRow {
  shopCd: string; shopNm: string; brandcd: string; channel: string; vin: Vin
  cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number
  lyRev: number; lyQty: number; lyTag: number
}
interface ItemRow {
  brandcd: string; item: string; channel: string; vin: Vin
  cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number; lyRev: number; lyTag: number
}
interface StyleRow {
  brandcd: string; stylecd: string; channel: string; styleNm: string; item: string; season: string; year: string
  cyRev: number; cyQty: number; cyTag: number; prevRev: number; lyRev: number; lyQty: number; lyTag: number; shopInv: number; whAvail: number
}

// 정상/이월(N/C) 분리 집계 — 금주·전주·전년 각각
interface Agg {
  cyRev: number; cyQty: number; cyTag: number; prevRev: number; prevTag: number; lyRev: number; lyQty: number; lyTag: number
  cyRevN: number; cyRevC: number; cyTagN: number; cyTagC: number
  prevRevN: number; prevRevC: number; prevTagN: number; prevTagC: number
  lyRevN: number; lyRevC: number; lyTagN: number; lyTagC: number
}
const ADULT = ['CO', 'LE', 'WA']
const zero = (): Agg => ({
  cyRev: 0, cyQty: 0, cyTag: 0, prevRev: 0, prevTag: 0, lyRev: 0, lyQty: 0, lyTag: 0,
  cyRevN: 0, cyRevC: 0, cyTagN: 0, cyTagC: 0,
  prevRevN: 0, prevRevC: 0, prevTagN: 0, prevTagC: 0,
  lyRevN: 0, lyRevC: 0, lyTagN: 0, lyTagC: 0,
})
// 채널 그룹 & 고정 순서 (오프라인 → 온라인 → 해외)
const CHANNEL_GROUPS: { group: string; channels: string[] }[] = [
  { group: '오프라인', channels: ['백화점', '아울렛', '면세점', '직영점', '쇼핑몰', '대리점', '오프라인 위탁', '오프라인 사입', '팝업', '본사매장'] },
  { group: '온라인', channels: ['온라인(무신사)', '온라인(위탁몰)', '온라인(자사몰)', '온라인B2B'] },
  { group: '해외', channels: ['해외 위탁', '해외 사입'] },
]
const MAPPED_CHANNELS = new Set(CHANNEL_GROUPS.flatMap(g => g.channels))

type Addable = { vin: Vin; cyRev: number; cyQty?: number; cyTag: number; prevRev: number; prevTag: number; lyRev: number; lyQty?: number; lyTag: number }
const add = (a: Agg, s: Addable) => {
  a.cyRev += s.cyRev; a.cyQty += s.cyQty ?? 0; a.cyTag += s.cyTag; a.prevRev += s.prevRev; a.prevTag += s.prevTag
  a.lyRev += s.lyRev; a.lyQty += s.lyQty ?? 0; a.lyTag += s.lyTag
  if (s.vin === 'N') {
    a.cyRevN += s.cyRev; a.cyTagN += s.cyTag; a.prevRevN += s.prevRev; a.prevTagN += s.prevTag; a.lyRevN += s.lyRev; a.lyTagN += s.lyTag
  } else {
    a.cyRevC += s.cyRev; a.cyTagC += s.cyTag; a.prevRevC += s.prevRev; a.prevTagC += s.prevTag; a.lyRevC += s.lyRev; a.lyTagC += s.lyTag
  }
}
const addAgg = (a: Agg, b: Agg) => { (Object.keys(a) as (keyof Agg)[]).forEach(k => { a[k] += b[k] }) }
const discOf = (rev: number, tag: number) => tag > 0 ? (1 - rev / tag) * 100 : null

const M = (v: number) => Math.round(v / 1e6).toLocaleString()
const EOK = (v: number) => (v / 1e8).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (cur: number, base: number) => base > 0 ? (cur / base - 1) * 100 : null
const pctTxt = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const gapTxt = (v: number) => `${v >= 0 ? '+' : ''}${M(v)}`
const chgCls =(v: number | null) => v == null ? 'text-gray-400' : v >= 0 ? 'text-red-600' : 'text-blue-600'
const ptTxt = (d: number | null) => d == null ? '' : `${d >= 0 ? '+' : ''}${d.toFixed(1)}pt`
// 증감 셀: 매출 %+gap (윗줄) + 할인율 Δpt (아랫줄, 회색)
function ChgDiscCell({ rev, base, tag, baseTag, pad = 'px-2' }: { rev: number; base: number; tag: number; baseTag: number; pad?: string }) {
  const p = pct(rev, base), g = rev - base
  const dc = discOf(rev, tag), db = discOf(base, baseTag)
  const dPt = dc != null && db != null ? dc - db : null
  return (
    <td className={cn('text-right py-1.5 font-mono whitespace-nowrap align-top', pad, chgCls(p))}>
      <div>{pctTxt(p)}{g !== 0 && <span className="ml-1 text-[9px]">({gapTxt(g)})</span>}</div>
      {dPt != null && <div className="text-[9px] text-gray-400">할인{ptTxt(dPt)}</div>}
    </td>
  )
}

const fmtDate = (ymd: string) => `${Number(ymd.slice(4, 6))}/${Number(ymd.slice(6, 8))}`
const shiftYmd = (ymd: string, days: number) => {
  const d = new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)))
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

// 총/정상/이월 그룹 헤더 한줄 표 (채널·품목 공용) — 행 클릭 시 필터
type SortKey = 'cy' | 'cyN' | 'cyC'
function GroupTable({ firstLabel, rows, selKey, onPick, sort }: {
  firstLabel: string; rows: { key: string; name: string; a: Agg; group?: boolean; indent?: boolean }[]; selKey: string | null; onPick: (k: string) => void
  sort?: { key: SortKey; dir: 'asc' | 'desc'; onPick: (k: SortKey) => void }
}) {
  const gh = 'text-right px-2 py-1 font-medium'
  const bl = 'border-l border-surface-border'
  const denom = rows.filter(r => !r.group).reduce((s, r) => s + r.a.cyRev, 0)  // 총 비중 분모(그룹행 제외)
  const sortTh = (k: SortKey) => (
    <th className={cn(gh, bl, sort && 'cursor-pointer hover:text-gray-700 select-none')} onClick={sort ? () => sort.onPick(k) : undefined}>
      매출{sort && sort.key === k ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ''}
    </th>
  )
  const grp = (rev: number, tag: number, pRev: number, pTag: number, lRev: number, lTag: number, share: string | null, cls: string) => (
    <>
      <td className={cn('text-right px-2 py-1.5 font-mono', cls, bl)}>{rev > 0 ? M(rev) : '—'}</td>
      <td className="text-right px-2 py-1.5 font-mono text-gray-400 text-[10px]">{share ?? '—'}</td>
      <ChgDiscCell rev={rev} base={pRev} tag={tag} baseTag={pTag} />
      <ChgDiscCell rev={rev} base={lRev} tag={tag} baseTag={lTag} />
      <td className="text-right px-2 py-1.5 font-mono text-gray-500 align-top">{discOf(rev, tag) == null ? '—' : `${discOf(rev, tag)!.toFixed(1)}%`}</td>
    </>
  )
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border">
      <table className="w-full text-[11px] border-collapse whitespace-nowrap">
        <thead className="bg-gray-50 text-gray-500 text-[10px]">
          <tr>
            <th rowSpan={2} className="text-left px-3 py-1.5 align-bottom">{firstLabel}</th>
            <th colSpan={5} className={cn('text-center px-2 py-1', bl)}>총</th>
            <th colSpan={5} className={cn('text-center px-2 py-1 text-emerald-600', bl)}>정상</th>
            <th colSpan={5} className={cn('text-center px-2 py-1 text-amber-600', bl)}>이월</th>
          </tr>
          <tr>
            {sortTh('cy')}<th className={gh}>비중</th><th className={gh}>전주비</th><th className={gh}>전년비</th><th className={gh}>할인율</th>
            {sortTh('cyN')}<th className={gh}>비중</th><th className={gh}>전주비</th><th className={gh}>전년비</th><th className={gh}>할인율</th>
            {sortTh('cyC')}<th className={gh}>비중</th><th className={gh}>전주비</th><th className={gh}>전년비</th><th className="text-right px-3 py-1 font-medium">할인율</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, name, a, group, indent }) => {
            const sel = selKey === key
            const shT = denom > 0 ? `${(a.cyRev / denom * 100).toFixed(1)}%` : '—'
            const shN = a.cyRev > 0 ? `${(a.cyRevN / a.cyRev * 100).toFixed(0)}%` : '—'
            const shC = a.cyRev > 0 ? `${(a.cyRevC / a.cyRev * 100).toFixed(0)}%` : '—'
            return (
              <tr key={key} onClick={() => onPick(key)}
                className={cn('border-t cursor-pointer hover:bg-surface-subtle',
                  group ? 'border-surface-border bg-gray-100/70 font-semibold' : 'border-surface-border/50',
                  sel && 'bg-brand-accent/10 ring-1 ring-inset ring-brand-accent/30')}>
                <td className={cn('text-left py-1.5 text-gray-800', indent ? 'pl-6 pr-3' : 'px-3')}>{sel && <span className="text-brand-accent mr-1">▸</span>}{name || '기타'}</td>
                {grp(a.cyRev, a.cyTag, a.prevRev, a.prevTag, a.lyRev, a.lyTag, shT, 'text-gray-900 font-semibold')}
                {grp(a.cyRevN, a.cyTagN, a.prevRevN, a.prevTagN, a.lyRevN, a.lyTagN, shN, 'text-emerald-700')}
                {grp(a.cyRevC, a.cyTagC, a.prevRevC, a.prevTagC, a.lyRevC, a.lyTagC, shC, 'text-amber-700')}
              </tr>
            )
          })}
          {rows.length === 0 && <tr><td colSpan={16} className="py-6 text-center text-gray-400">데이터 없음</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default function WeeklyReportPage() {
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const [shops, setShops] = useState<ShopRow[]>([])
  const [items, setItems] = useState<ItemRow[]>([])
  const [styles, setStyles] = useState<StyleRow[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selBrand, setSelBrand] = useState<string>('all')
  const [selChannel, setSelChannel] = useState<string | null>(null)
  const [selItem, setSelItem] = useState<string | null>(null)
  const [itemSort, setItemSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'cy', dir: 'desc' })  // §3 품목 매출 정렬(총/정상/이월)
  const pickItemSort = (k: SortKey) => setItemSort(s => s.key === k ? { key: k, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' })
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

  const yy = meta?.yy ?? ''
  const lyYy = yy ? String(Number(yy) - 1).padStart(2, '0') : ''
  const halfSeasons: string[] = meta?.halfSeasons ?? []
  const inHalf = (season: string) => halfSeasons.length === 0 || halfSeasons.includes(season)
  // 정상 = 당해 연차 + 그 주 시즌(반기) / 전년 정상 = 전년 연차 + 같은 시즌
  const vinOfStyle = (s: StyleRow): Vin => (s.year === yy && inHalf(s.season) ? 'N' : 'C')
  const vinLyOfStyle = (s: StyleRow): Vin => (s.year === lyYy && inHalf(s.season) ? 'N' : 'C')

  // 채널(개별 또는 grp:그룹) 매칭 — 필터 없으면 전부 true
  const chMatch = (ch: string) => {
    if (!selChannel) return true
    if (selChannel.startsWith('grp:')) {
      const g = selChannel.slice(4)
      if (g === '기타') return !MAPPED_CHANNELS.has(ch)
      return (CHANNEL_GROUPS.find(x => x.group === g)?.channels ?? []).includes(ch)
    }
    return ch === selChannel
  }

  // ①·헤드라인은 채널/품목 필터를 반영 (채널·품목은 상호배타)
  const byBrand = useMemo(() => {
    const m = new Map<string, Agg>()
    const bump = (brand: string, r: Addable) => { if (!m.has(brand)) m.set(brand, zero()); add(m.get(brand)!, r) }
    if (selChannel) { for (const s of shops) if (chMatch(s.channel || '기타')) bump(s.brandcd, s) }
    else if (selItem) { for (const it of items) if (it.item === selItem) bump(it.brandcd, it) }
    else { for (const s of shops) bump(s.brandcd, s) }
    return m
  }, [shops, items, selChannel, selItem])
  const all = useMemo(() => {
    const a = zero()
    if (selChannel) { for (const s of shops) if (chMatch(s.channel || '기타')) add(a, s) }
    else if (selItem) { for (const it of items) if (it.item === selItem) add(a, it) }
    else { for (const s of shops) add(a, s) }
    return a
  }, [shops, items, selChannel, selItem])
  const brandOrder = useMemo(() => {
    const present = Array.from(byBrand.keys())
    return [...ADULT.filter(b => present.includes(b)), ...present.filter(b => !ADULT.includes(b))]
  }, [byBrand])

  const pickBrand = (code: string) => { setSelBrand(code); setSelChannel(null); setSelItem(null) }
  const pickChannel = (k: string) => { setSelChannel(prev => prev === k ? null : k); setSelItem(null) }
  const pickItem = (k: string) => { setSelItem(prev => prev === k ? null : k); setSelChannel(null) }

  // ── 선택 브랜드 기준 ──
  const selItemsRaw = useMemo(() => selBrand === 'all' ? items : items.filter(i => i.brandcd === selBrand), [items, selBrand])
  const selStyles = useMemo(() => selBrand === 'all' ? styles : styles.filter(s => s.brandcd === selBrand), [styles, selBrand])

  // ② 채널: 오프라인/온라인/해외 그룹 소계 + 채널(고정 순서). 품목 선택 시 그 품목 기준
  const channelRows = useMemo(() => {
    const src = selItem ? selItemsRaw.filter(i => i.item === selItem) : selItemsRaw
    const byCh = new Map<string, Agg>()
    for (const it of src) { const ch = it.channel || '기타'; if (!byCh.has(ch)) byCh.set(ch, zero()); add(byCh.get(ch)!, it) }
    const has = (ch: string) => { const a = byCh.get(ch); return !!a && (a.cyRev > 0 || a.lyRev > 0) }
    const out: { key: string; name: string; a: Agg; group?: boolean; indent?: boolean }[] = []
    const emit = (groupName: string, chans: string[]) => {
      const present = chans.filter(has)
      if (present.length === 0) return
      const g = zero(); present.forEach(ch => addAgg(g, byCh.get(ch)!))
      out.push({ key: `grp:${groupName}`, name: groupName, a: g, group: true })
      present.forEach(ch => out.push({ key: ch, name: ch, a: byCh.get(ch)!, indent: true }))
    }
    for (const { group, channels } of CHANNEL_GROUPS) emit(group, channels)
    const others = Array.from(byCh.keys()).filter(ch => !MAPPED_CHANNELS.has(ch) && has(ch))
    if (others.length) emit('기타', others)
    return out
  }, [selItemsRaw, selItem])

  // ③ 품목: 채널(또는 그룹) 선택 시 그 채널의 품목 분포로 필터
  const itemRows = useMemo(() => {
    const src = selChannel ? selItemsRaw.filter(i => chMatch(i.channel || '기타')) : selItemsRaw
    const m = new Map<string, Agg>()
    for (const it of src) { if (!m.has(it.item)) m.set(it.item, zero()); add(m.get(it.item)!, it) }
    const val = (a: Agg) => itemSort.key === 'cy' ? a.cyRev : itemSort.key === 'cyN' ? a.cyRevN : a.cyRevC
    const rows = Array.from(m.entries()).map(([item, a]) => ({ key: item, name: item, a }))
      .filter(x => x.a.cyRev > 0 || x.a.lyRev > 0)
    // 총 매출 상위 15개(베스트 15)만, 선택한 정렬로 재배치
    const top15 = [...rows].sort((x, y) => y.a.cyRev - x.a.cyRev).slice(0, 15)
    return top15.sort((x, y) => (val(y.a) - val(x.a)) * (itemSort.dir === 'desc' ? 1 : -1))
  }, [selItemsRaw, selChannel, itemSort])

  // 베스트: 채널·품목 필터 반영 → 스타일 단위 집계 → 정상/이월 각 Top10
  const best = useMemo(() => {
    let rows = selStyles
    if (selChannel) rows = rows.filter(s => chMatch(s.channel || '기타'))
    if (selItem) rows = rows.filter(s => s.item === selItem)
    const m = new Map<string, StyleRow>()
    for (const s of rows) {
      const e = m.get(s.stylecd)
      if (!e) m.set(s.stylecd, { ...s })
      else { e.cyRev += s.cyRev; e.cyQty += s.cyQty; e.cyTag += s.cyTag; e.prevRev += s.prevRev; e.lyRev += s.lyRev; e.lyQty += s.lyQty; e.lyTag += s.lyTag; e.shopInv = Math.max(e.shopInv, s.shopInv); e.whAvail = Math.max(e.whAvail, s.whAvail) }
    }
    const list = Array.from(m.values())
    return {
      N: list.filter(s => vinOfStyle(s) === 'N' && s.cyRev > 0).sort((a, b) => b.cyRev - a.cyRev).slice(0, 10),
      C: list.filter(s => vinOfStyle(s) === 'C' && s.cyRev > 0).sort((a, b) => b.cyRev - a.cyRev).slice(0, 10),
      lyN: list.filter(s => vinLyOfStyle(s) === 'N' && s.lyRev > 0).sort((a, b) => b.lyRev - a.lyRev).slice(0, 10),
      lyC: list.filter(s => vinLyOfStyle(s) === 'C' && s.lyRev > 0).sort((a, b) => b.lyRev - a.lyRev).slice(0, 10),
    }
  }, [selStyles, selChannel, selItem, yy, lyYy])

  const wowA = pct(all.cyRev, all.prevRev)
  const yoyA = pct(all.cyRev, all.lyRev)
  const label = meta ? `${fmtDate(meta.weekStart)}~${fmtDate(meta.weekEnd)}` : ''
  const selName = selBrand === 'all' ? '전사' : (BRAND_NAMES[selBrand] ?? selBrand)

  const exportHtml = () => {
    const root = reportRef.current
    if (!root) return
    let css = ''
    for (const sheet of Array.from(document.styleSheets)) {
      try { for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + '\n' } catch { /* cross-origin 무시 */ }
    }
    const clone = root.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-noexport]').forEach(el => el.remove())
    clone.style.maxWidth = '1760px'; clone.style.margin = '0 auto'
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>주간 보고 ${label}</title><style>${css}</style></head><body style="margin:0;background:#fff;">${clone.outerHTML}</body></html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `주간보고_${meta?.weekStart ?? ''}.html`; a.click()
    URL.revokeObjectURL(url)
  }
  const canNext = meta && weekStart && shiftYmd(weekStart, 7) <= (() => { const n = new Date(); const mon = new Date(n); mon.setDate(n.getDate() - ((n.getDay() + 6) % 7)); return `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}` })()

  // mode 'cy' = 금주(매출·할인·전주·재고), 'ly' = 전년동주(매출·할인·재고, 전주 없음)
  const BestTable = ({ title, list, accent, mode }: { title: string; list: StyleRow[]; accent: string; mode: 'cy' | 'ly' }) => {
    const rev = (s: StyleRow) => mode === 'cy' ? s.cyRev : s.lyRev
    const qty = (s: StyleRow) => mode === 'cy' ? s.cyQty : s.lyQty
    const tag = (s: StyleRow) => mode === 'cy' ? s.cyTag : s.lyTag
    return (
      <div className="rounded-xl border border-surface-border overflow-hidden">
        <div className={cn('px-3 py-2 text-sm font-bold flex items-center justify-between', accent)}>
          <span>{title}</span><span className="text-[10px] font-normal text-gray-500">Top {list.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[9px] text-gray-400 border-b border-surface-border/60 bg-gray-50/60">
                <th className="px-3 py-1 text-left font-medium">상품(시즌)</th>
                <th className="px-2 py-1 text-right font-medium">매출</th>
                <th className="px-2 py-1 text-right font-medium">판매</th>
                <th className="px-2 py-1 text-right font-medium">TAG</th>
                <th className="px-2 py-1 text-right font-medium">할인</th>
                {mode === 'cy' && <th className="px-2 py-1 text-right font-medium">전주</th>}
                <th className="px-2 py-1 text-right font-medium">매장</th>
                <th className="px-2 py-1 text-right font-medium">창고</th>
                <th className="px-3 py-1 text-right font-medium">재고계</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => {
                const sdc = discOf(rev(s), tag(s)); const inv = s.shopInv + s.whAvail
                return (
                  <tr key={s.stylecd} className="border-t border-surface-border/50">
                    <td className="px-3 py-1 text-gray-600 truncate max-w-[210px]" title={`${s.styleNm} · ${s.item} · ${s.year} ${s.season}`}>
                      <span className="text-gray-300 mr-1">{i + 1}</span>
                      {selBrand === 'all' && <span className="text-gray-400 mr-1">{BRAND_NAMES[s.brandcd] ?? s.brandcd}</span>}
                      {s.styleNm} <span className="text-gray-400">{s.year}{s.season}</span>
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-gray-900">{M(rev(s))}</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-700">{qty(s).toLocaleString()}</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-500">{M(tag(s))}</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-500">{sdc == null ? '—' : `${sdc.toFixed(0)}%`}</td>
                    {mode === 'cy' && (
                      <td className="px-2 py-1 text-right font-mono whitespace-nowrap">
                        <span className={chgCls(pct(s.cyRev, s.prevRev))}>{pctTxt(pct(s.cyRev, s.prevRev))}</span>
                      </td>
                    )}
                    <td className={cn('px-2 py-1 text-right font-mono', s.shopInv === 0 ? 'text-red-500 font-semibold' : 'text-gray-700')}>{s.shopInv.toLocaleString()}</td>
                    <td className="px-2 py-1 text-right font-mono text-gray-500">{s.whAvail.toLocaleString()}</td>
                    <td className={cn('px-3 py-1 text-right font-mono font-semibold', inv === 0 ? 'text-red-500' : 'text-gray-800')}>{inv.toLocaleString()}</td>
                  </tr>
                )
              })}
              {list.length === 0 && <tr><td colSpan={mode === 'cy' ? 9 : 8} className="py-6 text-center text-gray-400">데이터 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div ref={reportRef} className="eis-page flex flex-col gap-4 p-5 min-h-0 max-w-[1760px] mx-auto print:p-0">
      {/* 헤더 */}
      <div className="eis-page-header flex items-center justify-between flex-wrap gap-2 border-b border-surface-border pb-3">
        <div>
          <h1 className="eis-page-title text-xl font-bold text-gray-900 flex items-center gap-2"><FileText size={20} className="text-brand-accent" />전사 주간 현황 보고</h1>
          <p className="text-sm text-gray-500 mt-1">기준주 <b className="text-gray-800">{label}</b> · 전 브랜드(성인·키즈) · 전채널 VAT제외 · 전년비=동요일(52주 전) · 정상=<b className="text-gray-700">{yy} {meta?.half === 'SS' ? 'S/S' : 'F/W'}</b>(당해 시즌), 전년=<b className="text-gray-700">{lyYy} {meta?.half === 'SS' ? 'S/S' : 'F/W'}</b> · 단위 백만원</p>
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
              <p className="text-[11px] text-gray-500 mt-1">정상 <b className="text-emerald-600">{M(all.cyRevN)}</b> · 이월 <b className="text-amber-600">{M(all.cyRevC)}</b> 백만</p>
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

          {/* 1. 실적 현황 (브랜드 선택기) */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-2">1. 실적 현황 <span className="font-normal text-gray-400">· 행 클릭 시 아래 전체가 해당 브랜드로 전환 · 정상/이월 구분</span></h2>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">브랜드</th>
                    <th className="text-right px-3 py-2">주매출</th>
                    <th className="text-right px-3 py-2 text-emerald-600">정상</th>
                    <th className="text-right px-3 py-2 text-amber-600">이월</th>
                    <th className="text-right px-3 py-2">전주비</th>
                    <th className="text-right px-3 py-2">전년동주비</th>
                    <th className="text-right px-3 py-2">실질할인율</th>
                    <th className="text-right px-3 py-2">수량</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const rowFor = (code: string, name: string, a: Agg) => {
                      const sel = selBrand === code
                      return (
                        <tr key={code} onClick={() => pickBrand(code)}
                          className={cn('border-t border-surface-border/60 cursor-pointer hover:bg-surface-subtle', sel && 'bg-brand-accent/10 font-semibold ring-1 ring-inset ring-brand-accent/30')}>
                          <td className="text-left px-3 py-1.5 text-gray-800">{sel && <span className="text-brand-accent mr-1">▸</span>}{name}</td>
                          <td className="text-right px-3 py-1.5 font-mono font-semibold text-gray-900">{M(a.cyRev)}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-emerald-700">{M(a.cyRevN)}<span className="ml-1 text-[9px] text-gray-400">{a.cyRev > 0 ? (a.cyRevN / a.cyRev * 100).toFixed(0) : 0}%</span></td>
                          <td className="text-right px-3 py-1.5 font-mono text-amber-700">{M(a.cyRevC)}<span className="ml-1 text-[9px] text-gray-400">{a.cyRev > 0 ? (a.cyRevC / a.cyRev * 100).toFixed(0) : 0}%</span></td>
                          <ChgDiscCell rev={a.cyRev} base={a.prevRev} tag={a.cyTag} baseTag={a.prevTag} pad="px-3" />
                          <ChgDiscCell rev={a.cyRev} base={a.lyRev} tag={a.cyTag} baseTag={a.lyTag} pad="px-3" />
                          <td className="text-right px-3 py-1.5 font-mono text-gray-600 align-top">{discOf(a.cyRev, a.cyTag) == null ? '—' : `${discOf(a.cyRev, a.cyTag)!.toFixed(1)}%`}</td>
                          <td className="text-right px-3 py-1.5 font-mono text-gray-600 align-top">{a.cyQty.toLocaleString()}</td>
                        </tr>
                      )
                    }
                    return [
                      rowFor('all', '전체 합계', all),
                      ...brandOrder.map(b => rowFor(b, BRAND_NAMES[b] ?? b, byBrand.get(b)!)),
                    ]
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. 유통 채널 믹스 */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-2">
              2. 유통 채널 믹스 · <span className="text-brand-accent">{selName}</span>
              <span className="font-normal text-gray-400"> · 총/정상/이월 · 채널 클릭 시 베스트 필터</span>
            </h2>
            <GroupTable firstLabel="채널" rows={channelRows} selKey={selChannel} onPick={pickChannel} />
          </section>

          {/* 3. 품목별 주간 */}
          <section>
            <h2 className="text-sm font-bold text-gray-800 mb-2">
              3. 품목별 주간 · <span className="text-brand-accent">{selName}</span>
              <span className="font-normal text-gray-400"> · 총/정상/이월 · 품목 클릭 시 베스트 필터</span>
            </h2>
            <GroupTable firstLabel="품목" rows={itemRows} selKey={selItem} onPick={pickItem} sort={{ key: itemSort.key, dir: itemSort.dir, onPick: pickItemSort }} />
          </section>

          {/* 4. 금주 베스트 (정상 / 이월) */}
          <section>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-sm font-bold text-gray-800">4. 금주 베스트 · <span className="text-brand-accent">{selName}</span></h2>
              {selChannel && <button onClick={() => setSelChannel(null)} className="flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">채널: {selChannel.startsWith('grp:') ? selChannel.slice(4) : selChannel} <X size={10} /></button>}
              {selItem && <button onClick={() => setSelItem(null)} className="flex items-center gap-1 text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">품목: {selItem} <X size={10} /></button>}
              <span className="text-[11px] font-normal text-gray-400">금주·전년동주 각 정상/이월 Top10 · 재고현황 (매장 0 = 빨강)</span>
            </div>
            <div className="text-[11px] font-semibold text-gray-500 mb-1">금주</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BestTable title="금주 정상 베스트" list={best.N} accent="bg-emerald-50 text-emerald-800" mode="cy" />
              <BestTable title="금주 이월 베스트" list={best.C} accent="bg-amber-50 text-amber-800" mode="cy" />
            </div>
            <div className="text-[11px] font-semibold text-gray-500 mt-3 mb-1">전년 동주</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <BestTable title="전년동주 정상 베스트" list={best.lyN} accent="bg-emerald-50/60 text-emerald-700" mode="ly" />
              <BestTable title="전년동주 이월 베스트" list={best.lyC} accent="bg-amber-50/60 text-amber-700" mode="ly" />
            </div>
          </section>

          <p className="text-[10px] text-gray-400">※ 정상=그 주 시즌(반기)의 당해 연차 상품 / 이월=그 외(전년·직전 시즌 등). 전년 비교는 동일 시즌(예: 26 F/W ↔ 25 F/W). 재고=현재 매장+창고 스냅샷. 베스트는 채널·품목 클릭으로 필터.</p>
        </>
      )}
    </div>
  )
}
