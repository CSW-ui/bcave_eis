'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Download, GitCompare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from 'recharts'
import { cn } from '@/lib/utils'
import { BRAND_NAMES, BRAND_TABS, ITEM_GROUPS, ITEM_GROUP_MAP, ITEM_CATEGORY_MAP, SEASON_OPTIONS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

interface Style {
  brandcd: string; stylecd: string; styleNm: string; item: string; season: string; year: string; gender: string
  ordQty: number; cumQty: number
  cyRev: number; cyQty: number; cyTag: number; cyCost: number
  lyRev: number; lyQty: number; lyTag: number; lyCost: number
}
type Metric = 'amt' | 'qty'
type Side = 'cy' | 'ly'

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const compact = (s: string) => s.replace(/-/g, '')
const M = (v: number) => Math.round(v / 1e6).toLocaleString()
const disc = (rev: number, tag: number) => tag > 0 ? (1 - rev / tag) * 100 : null
const cogs = (cost: number, rev: number) => rev > 0 ? cost / rev * 100 : null
const pctI = (v: number | null) => v == null ? '—' : `${v.toFixed(0)}%`
// 성별: 여성/키즈여자 = 우먼, 그 외 = 유니
const isWomen = (g: string) => g === '여성' || g === '키즈여자'
const genLabel = (g: string) => isWomen(g) ? '우먼' : '유니'
// 품목(ITEMNM) → 그룹(어패럴/용품)
const grpOf = (item: string) => ITEM_GROUP_MAP[ITEM_CATEGORY_MAP[item] ?? '기타'] ?? '용품'

export default function BestComparePage() {
  const { allowedBrands } = useAuth()
  const [brand, setBrand] = useState('all')
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  useEffect(() => { if (allowedBrands?.length === 1) setBrand(allowedBrands[0]) }, [allowedBrands])

  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo] = useState(toYmd(now))
  const [metric, setMetric] = useState<Metric>('amt')
  const [topN, setTopN] = useState(20)
  const [group, setGroup] = useState<string>('전체')
  // 시즌: 기본 '전체'(연차 무관 기간비교). 특정 시즌 선택 시 금년=해당연차 vs 전년=−1연차 정렬 비교
  const [seasonIdx, setSeasonIdx] = useState(() => { const i = SEASON_OPTIONS.findIndex(o => o.year === ''); return i >= 0 ? i : 0 })
  const season = SEASON_OPTIONS[seasonIdx]
  const [selItem, setSelItem] = useState<string | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [items, setItems] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const brandTabs = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []), ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const sp = new URLSearchParams({ brand: apiBrand, from: compact(from), to: compact(to) })
      if (season.year) { sp.set('year', season.year); sp.set('seasons', season.season) }
      const res = await fetch(`/api/planning/best-compare?${sp}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setStyles(json.styles ?? [])
      setItems(json.items ?? [])
      setMeta(json.meta ?? null)
      setSelItem(null)
    } catch (e) { setError(String(e)); setStyles([]); setItems([]) }
    finally { setLoading(false) }
  }, [apiBrand, from, to, season.year, season.season])
  useEffect(() => { fetchData() }, [fetchData])

  const preset = (kind: string) => {
    const y = now.getFullYear()
    if (kind === 'ytd') { setFrom(`${y}-01-01`); setTo(toYmd(now)) }
    else if (kind === 'lastMonth') {
      setFrom(toYmd(new Date(y, now.getMonth() - 1, 1)))
      setTo(toYmd(new Date(y, now.getMonth(), 0)))  // 전월 말일
    }
    else if (kind === 'thisMonth') { setFrom(`${y}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setTo(toYmd(now)) }
    else if (kind === 'lastWeek') {
      const thisMon = new Date(now); thisMon.setDate(now.getDate() - ((now.getDay() + 6) % 7))  // 이번주 월
      const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7)                  // 지난주 월
      const lastSun = new Date(lastMon); lastSun.setDate(lastMon.getDate() + 6)                  // 지난주 일
      setFrom(toYmd(lastMon)); setTo(toYmd(lastSun))
    }
  }

  const cyVal = (s: Style) => metric === 'amt' ? s.cyRev : s.cyQty
  const lyVal = (s: Style) => metric === 'amt' ? s.lyRev : s.lyQty

  // 품목 클릭 필터 적용된 베스트
  const { cyTop, lyTop } = useMemo(() => {
    const base = styles.filter(s =>
      (group === '전체' || grpOf(s.item) === group) &&
      (!selItem || s.item === selItem))
    return {
      cyTop: base.filter(s => cyVal(s) > 0).sort((a, b) => cyVal(b) - cyVal(a)).slice(0, topN),
      lyTop: base.filter(s => lyVal(s) > 0).sort((a, b) => lyVal(b) - lyVal(a)).slice(0, topN),
    }
  }, [styles, metric, topN, selItem, group])

  // 품목별 금년/전년 × 유니/우먼 (스택 그래프) — API items(전체집계) 사용
  const itemChart = useMemo(() => {
    const div = metric === 'amt' ? 1e6 : 1
    const cyU = (it: any) => metric === 'amt' ? it.cyUAmt : it.cyUQty
    const cyW = (it: any) => metric === 'amt' ? it.cyWAmt : it.cyWQty
    const lyU = (it: any) => metric === 'amt' ? it.lyUAmt : it.lyUQty
    const lyW = (it: any) => metric === 'amt' ? it.lyWAmt : it.lyWQty
    return items
      .filter(it => group === '전체' || grpOf(it.item) === group)
      .map(it => ({
        item: it.item || '기타',
        '금년 유니': Math.round(cyU(it) / div), '금년 우먼': Math.round(cyW(it) / div),
        '전년 유니': Math.round(lyU(it) / div), '전년 우먼': Math.round(lyW(it) / div),
        _cy: cyU(it) + cyW(it),
      }))
      .filter(d => d['금년 유니'] > 0 || d['금년 우먼'] > 0)  // 금년 실적 있는 품목만
      .sort((a, b) => b._cy - a._cy)
  }, [items, metric, group])

  // 금년 막대 위에 유니·여성 전년비(YoY%) 나란히 표기 (세그먼트 크기 무관)
  const stackYoyLabel = (props: any) => {
    const { x, y, width, index } = props
    const d = itemChart[index] as any
    if (!d || width == null) return null
    const yoy = (g: string) => { const cy = d[`금년 ${g}`], ly = d[`전년 ${g}`]; return cy && ly > 0 ? Math.round((cy / ly - 1) * 100) : null }
    const u = yoy('유니'), w = yoy('우먼')
    const cx = x + width / 2
    const txt = (v: number) => `${v >= 0 ? '+' : ''}${v}%`
    return (
      <g>
        {u != null && <text x={cx} y={y - 13} fill="#9d174d" fontSize={8.5} fontWeight={700} textAnchor="middle">유 {txt(u)}</text>}
        {w != null && <text x={cx} y={y - 3} fill="#db2777" fontSize={8.5} fontWeight={700} textAnchor="middle">여 {txt(w)}</text>}
      </g>
    )
  }

  const downloadExcel = () => {
    const rows = cyTop.map((s, i) => ({
      순번: i + 1, 상품: s.styleNm, 성별: genLabel(s.gender), 연시즌: `${s.year}${s.season}`, 품목: s.item,
      '금년매출(백만)': Math.round(s.cyRev / 1e6), 금년수량: s.cyQty, 발주: s.ordQty, 누적판매: s.cumQty,
      '금년할인율%': disc(s.cyRev, s.cyTag), '금년원가율%': cogs(s.cyCost, s.cyRev),
      '전년매출(백만)': Math.round(s.lyRev / 1e6), 전년수량: s.lyQty,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '베스트비교')
    XLSX.writeFile(wb, `베스트비교_${compact(from)}-${compact(to)}.xlsx`)
  }

  const Col = ({ title, list, side }: { title: string; list: Style[]; side: Side }) => {
    const rev = (s: Style) => side === 'cy' ? s.cyRev : s.lyRev
    const qty = (s: Style) => side === 'cy' ? s.cyQty : s.lyQty
    const tag = (s: Style) => side === 'cy' ? s.cyTag : s.lyTag
    const cost = (s: Style) => side === 'cy' ? s.cyCost : s.lyCost
    return (
      <div className="flex-1 min-w-0 bg-white rounded-xl border border-surface-border overflow-hidden">
        <div className="px-3 py-2 bg-gray-100 text-xs font-bold text-gray-800">{title}</div>
        <div className="overflow-auto max-h-[64vh]">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 text-[9px] text-gray-400">
              <tr>
                <th className="px-2 py-1.5 text-left w-6">#</th>
                <th className="px-2 py-1.5 text-left">상품 (성별·연·시즌)</th>
                <th className="px-2 py-1.5 text-right">매출</th>
                <th className="px-2 py-1.5 text-right">수량</th>
                <th className="px-2 py-1.5 text-right">발주</th>
                <th className="px-2 py-1.5 text-right">누적판매</th>
                <th className="px-2 py-1.5 text-right">할인율</th>
                <th className="px-3 py-1.5 text-right">원가율</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.stylecd} className="border-t border-surface-border/50 hover:bg-amber-50/30">
                  <td className="px-2 py-1 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-1 text-gray-700 truncate max-w-[210px]" title={`${s.styleNm} · ${genLabel(s.gender)} · ${s.item} · ${s.year}${s.season}`}>
                    <span className={cn('mr-1 px-1 rounded text-[8px] font-bold', isWomen(s.gender) ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600')}>{genLabel(s.gender)}</span>
                    {s.styleNm} <span className="text-gray-400">{s.year}{s.season}</span>
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-semibold text-gray-900">{M(rev(s))}</td>
                  <td className="px-2 py-1 text-right font-mono text-gray-700">{qty(s).toLocaleString()}</td>
                  <td className="px-2 py-1 text-right font-mono text-gray-500">{s.ordQty ? s.ordQty.toLocaleString() : '—'}</td>
                  <td className="px-2 py-1 text-right font-mono text-gray-600">{s.cumQty ? s.cumQty.toLocaleString() : '—'}</td>
                  <td className="px-2 py-1 text-right font-mono text-gray-500">{pctI(disc(rev(s), tag(s)))}</td>
                  <td className="px-3 py-1 text-right font-mono text-gray-500">{pctI(cogs(cost(s), rev(s)))}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">데이터 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={18} className="text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">베스트 상품 비교 (금년 vs 전년동기)</h1>
          <span className="text-xs text-gray-400">기간 설정 · 부가세 제외 · 매출 백만원</span>
        </div>
        <button onClick={downloadExcel} disabled={cyTop.length === 0}
          className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5 disabled:opacity-40">
          <Download size={12} /> Excel
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {brandTabs.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{b.label}</button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {ITEM_GROUPS.map(g => (
            <button key={g} onClick={() => { setGroup(g); setSelItem(null) }}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                group === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{g}</button>
          ))}
        </div>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="text-xs border border-surface-border rounded px-2 py-1" />
        <span className="text-xs text-gray-400">~</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="text-xs border border-surface-border rounded px-2 py-1" />
        <div className="flex gap-1">
          {([['ytd', '올해'], ['lastMonth', '지난달'], ['thisMonth', '이번달'], ['lastWeek', '지난주']] as [string, string][]).map(([k, l]) => (
            <button key={k} onClick={() => preset(k)} className="text-[10px] text-gray-500 hover:text-gray-800 border border-surface-border rounded px-1.5 py-0.5">{l}</button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-1">시즌</span>
        <select value={seasonIdx} onChange={e => setSeasonIdx(Number(e.target.value))}
          title="특정 시즌 선택 시 금년=해당 연차, 전년동기=−1 연차 상품으로 정렬 비교"
          className="text-xs border border-surface-border rounded px-2 py-1">
          {SEASON_OPTIONS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-1">기준</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {([['amt', '금액'], ['qty', '수량']] as [Metric, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setMetric(v)}
              className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                metric === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{l}</button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {[10, 20, 30, 50].map(n => (
            <button key={n} onClick={() => setTopN(n)}
              className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                topN === n ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>Top{n}</button>
          ))}
        </div>
        <button onClick={fetchData} disabled={loading} className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
        </button>
      </div>

      {meta && <p className="text-[11px] text-gray-400">금년 {meta.from}~{meta.to} · 전년동기 {meta.lyFrom}~{meta.lyTo}{season.year ? ` · 시즌: ${season.label} vs ${meta.lyYear} ${season.label.split(' ')[1] ?? ''}` : ' · 시즌: 전체'} · 기준: {metric === 'amt' ? '매출' : '수량'} · 막대 클릭 시 해당 품목으로 필터</p>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>}

      {/* 품목별 금년/전년 × 유니·우먼 그래프 */}
      <div className="bg-white rounded-xl border border-surface-border p-3">
        <h3 className="text-xs font-semibold text-gray-700 mb-1">
          품목별 {metric === 'amt' ? '매출(백만)' : '수량'} · 금년(좌) vs 전년(우) · 유니/우먼 비중
          <span className="ml-2 font-normal text-gray-400">금년 막대 위 유/여 %=전년비 · 막대 클릭 = 품목 필터</span>
        </h3>
        <div className="overflow-x-auto">
          {itemChart.length === 0 ? (
            <div className="h-[275px] flex items-center justify-center text-xs text-gray-400">데이터 없음</div>
          ) : (
            <div style={{ minWidth: Math.max(itemChart.length * 72, 640), height: 275 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemChart} margin={{ top: 26, right: 8, left: 0, bottom: 4 }}
                onClick={(e: any) => { const it = e?.activeLabel; if (it) setSelItem(prev => prev === it ? null : it) }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
                <XAxis dataKey="item" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={44} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => Number(v).toLocaleString()} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="금년 유니" stackId="cy" fill="#e91e63" radius={[0, 0, 0, 0]} cursor="pointer" />
                <Bar dataKey="금년 우먼" stackId="cy" fill="#f9a8d4" radius={[3, 3, 0, 0]} cursor="pointer">
                  <LabelList content={stackYoyLabel} />
                </Bar>
                <Bar dataKey="전년 유니" stackId="ly" fill="#94a3b8" radius={[0, 0, 0, 0]} cursor="pointer" />
                <Bar dataKey="전년 우먼" stackId="ly" fill="#d7dde5" radius={[3, 3, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {selItem && (
        <div className="flex items-center gap-2 -mt-1">
          <span className="text-[11px] text-gray-500">품목 필터:</span>
          <button onClick={() => setSelItem(null)} className="flex items-center gap-1 text-[11px] bg-brand-accent-light text-brand-accent border border-brand-accent/30 rounded-full px-2 py-0.5">
            {selItem} <span className="text-[9px]">✕</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-96 bg-surface-subtle animate-pulse rounded-xl" />)}</div>
      ) : (
        <div className="flex gap-3 flex-col lg:flex-row">
          <Col title={`금년 베스트 (${season.year ? season.label : meta?.from?.slice(0, 4) ?? ''})${selItem ? ` · ${selItem}` : ''}`} list={cyTop} side="cy" />
          <Col title={`전년동기 베스트 (${season.year ? `${meta?.lyYear ?? ''} ${season.label.split(' ')[1] ?? ''}` : meta?.lyFrom?.slice(0, 4) ?? ''})${selItem ? ` · ${selItem}` : ''}`} list={lyTop} side="ly" />
        </div>
      )}
    </div>
  )
}
