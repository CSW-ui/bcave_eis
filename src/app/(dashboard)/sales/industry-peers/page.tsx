'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { fmtW } from '@/lib/formatters'
import { BRAND_NAMES } from '@/lib/constants'

type ScopeT = 'all' | 'offline'
type GranT = 'week' | 'month'
type ZoneT = 'adult' | 'kids'
interface Building { bld: string; ourAmt: number; total: number; share: number | null; bestRank: number | null; topBrand: string; topIsOurs: boolean; compCnt: number; ours: Record<string, number> }
interface MatrixRow { brand: string; isOurs: boolean; bucket: string; amt: number }
interface ApiData { buildings: Building[]; marketTrend: MatrixRow[] }

const OUR_CODE = new Set(['CO', 'LE', 'WA', 'CK', 'LK'])
const nm = (b: string) => OUR_CODE.has(b) ? (BRAND_NAMES[b] ?? b) : b
const bucketLabel = (b: string) => b.length === 6 ? `${Number(b.slice(4, 6))}월` : b.length === 8 ? `${Number(b.slice(4, 6))}/${Number(b.slice(6, 8))}` : b
const cellTxt = (v: number) => v <= 0 ? '' : v < 1e6 ? fmtW(v) : Math.round(v / 1e6).toLocaleString()
const rankCls = (r: number | null) => r == null ? 'text-gray-300' : r === 1 ? 'text-emerald-600' : r <= 3 ? 'text-amber-600' : 'text-gray-600'

function buildPeriods() {
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth() + 1
  const today = `${y}${String(m).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const out = [{ label: `${y} YTD`, from: `${y}0101`, to: today }]
  for (let i = 0; i < 6; i++) { let mm = m - i, yy = y; while (mm <= 0) { mm += 12; yy -= 1 }; const last = new Date(yy, mm, 0).getDate(); out.push({ label: `${yy}-${String(mm).padStart(2, '0')}`, from: `${yy}${String(mm).padStart(2, '0')}01`, to: `${yy}${String(mm).padStart(2, '0')}${String(last).padStart(2, '0')}` }) }
  out.push({ label: `${y - 1} 전체`, from: `${y - 1}0101`, to: `${y - 1}1231` })
  return out
}

export default function IndustryPeersPage() {
  const periods = useMemo(buildPeriods, [])
  const [pIdx, setPIdx] = useState(0)
  const [scope, setScope] = useState<ScopeT>('offline')
  const [gran, setGran] = useState<GranT>('week')
  const [zone, setZone] = useState<ZoneT>('adult')
  const [ch, setCh] = useState<'all' | 'dept' | 'outlet' | 'mall' | 'duty' | 'direct'>('all')
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ k: 'shop' | 'our' | 'share' | 'rank'; dir: 'asc' | 'desc' }>({ k: 'our', dir: 'desc' })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<MatrixRow[] | null>(null)
  const [mLoading, setMLoading] = useState(false)

  const period = periods[pIdx]
  const zoneCodes = zone === 'kids' ? ['CK', 'LK'] : ['CO', 'LE', 'WA']
  const base = `/api/sales/industry-peers?from=${period.from}&to=${period.to}&scope=${scope}&gran=${gran}&zone=${zone}${ch !== 'all' ? `&ch=${ch}` : ''}`

  const fetchData = useCallback(async () => {
    setLoading(true); setExpanded(null); setMatrix(null)
    try { setData(await (await fetch(base)).json()) } catch { setData(null) }
    finally { setLoading(false) }
  }, [base])
  useEffect(() => { fetchData() }, [fetchData])

  const openBld = async (bld: string) => {
    if (expanded === bld) { setExpanded(null); setMatrix(null); return }
    setExpanded(bld); setMatrix(null); setMLoading(true)
    try { const j = await (await fetch(`${base}&building=${encodeURIComponent(bld)}`)).json(); setMatrix(j.matrix ?? []) }
    catch { setMatrix([]) } finally { setMLoading(false) }
  }

  const rows = useMemo(() => {
    const list = data?.buildings ?? []
    const { k, dir } = sort
    return [...list].sort((a, b) => {
      const r = k === 'shop' ? a.bld.localeCompare(b.bld) : k === 'rank' ? ((a.bestRank ?? 99) - (b.bestRank ?? 99)) : ((a[k === 'our' ? 'ourAmt' : 'share'] ?? 0) as number) - ((b[k === 'our' ? 'ourAmt' : 'share'] ?? 0) as number)
      return dir === 'asc' ? r : -r
    })
  }, [data, sort])
  const toggle = (k: typeof sort.k) => setSort(s => s.k === k ? { k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { k, dir: k === 'shop' || k === 'rank' ? 'asc' : 'desc' })
  const arrow = (k: typeof sort.k) => sort.k === k ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  // 펼친 매장 매트릭스 피벗 (마감된 주/월만 — 진행 중인 당주·당월 제외)
  const mx = useMemo(() => {
    const r = matrix ?? []
    const now = new Date()
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const cutW = `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`
    const cutM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const closed = (b: string) => gran === 'month' ? b < cutM : b < cutW
    const rows = r.filter(x => closed(x.bucket))
    const buckets = Array.from(new Set(rows.map(x => x.bucket))).sort()
    const byBrand = new Map<string, { brand: string; isOurs: boolean; wk: Record<string, number>; total: number }>()
    for (const x of rows) { let e = byBrand.get(x.brand); if (!e) { e = { brand: x.brand, isOurs: x.isOurs, wk: {}, total: 0 }; byBrand.set(x.brand, e) } e.wk[x.bucket] = (e.wk[x.bucket] ?? 0) + x.amt; e.total += x.amt }
    const brands = Array.from(byBrand.values()).sort((a, b) => b.total - a.total)
    const maxCell = Math.max(1, ...brands.flatMap(b => buckets.map(w => b.wk[w] ?? 0)))
    return { buckets, brands, maxCell }
  }, [matrix, gran])
  const colSpan = 2 + zoneCodes.length + 4

  // 최상단 시장 요약: 우리 + 주요 경쟁사 주간/월간 추이 + WoW (마감 버킷만, 최근 8)
  const mkt = useMemo(() => {
    const r = data?.marketTrend ?? []
    const now = new Date()
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    const cutW = `${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`
    const cutM = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const closed = (b: string) => gran === 'month' ? b < cutM : b < cutW
    const rows = r.filter(x => closed(x.bucket))
    const allBuckets = Array.from(new Set(rows.map(x => x.bucket))).sort()
    const buckets = allBuckets.slice(-8)
    const byBrand = new Map<string, { brand: string; isOurs: boolean; wk: Record<string, number>; total: number }>()
    for (const x of rows) { let e = byBrand.get(x.brand); if (!e) { e = { brand: x.brand, isOurs: x.isOurs, wk: {}, total: 0 }; byBrand.set(x.brand, e) } e.wk[x.bucket] = (e.wk[x.bucket] ?? 0) + x.amt; e.total += x.amt }
    const brands = Array.from(byBrand.values()).sort((a, b) => b.total - a.total).slice(0, 14)
    const maxCell = Math.max(1, ...brands.flatMap(b => buckets.map(w => b.wk[w] ?? 0)))
    const lastWk = allBuckets[allBuckets.length - 1], prevWk = allBuckets[allBuckets.length - 2]
    return { buckets, brands, maxCell, lastWk, prevWk }
  }, [data, gran])

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">동업계 비교 <span className="text-sm font-normal text-gray-400">(백화점·아울렛·쇼핑몰)</span></h1>
          <p className="text-sm text-gray-500 mt-0.5">전 매장 우리 브랜드 vs 동업계 · 행 클릭 시 {gran === 'month' ? '월간' : '주간'} 매트릭스 · 경쟁사 중복제거</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-[11px]">
            {([['adult', '성인'], ['kids', '키즈']] as [ZoneT, string][]).map(([v, l]) => <button key={v} onClick={() => setZone(v)} className={cn('px-3 py-1 rounded-md font-medium transition-all', zone === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>{l}</button>)}
          </div>
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-[11px]">
            {([['all', '전체'], ['dept', '백화점'], ['outlet', '아울렛'], ['mall', '쇼핑몰'], ['duty', '면세점'], ['direct', '직영점']] as ['all' | 'dept' | 'outlet' | 'mall' | 'duty' | 'direct', string][]).map(([v, l]) => <button key={v} onClick={() => setCh(v)} className={cn('px-2.5 py-1 rounded-md font-medium transition-all', ch === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>{l}</button>)}
          </div>
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-[11px]">
            {([['week', '주간'], ['month', '월간']] as [GranT, string][]).map(([v, l]) => <button key={v} onClick={() => setGran(v)} className={cn('px-2.5 py-1 rounded-md font-medium transition-all', gran === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>{l}</button>)}
          </div>
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-[11px]">
            {([['offline', '오프라인'], ['all', '전체']] as [ScopeT, string][]).map(([v, l]) => <button key={v} onClick={() => setScope(v)} className={cn('px-2.5 py-1 rounded-md font-medium transition-all', scope === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>{l}</button>)}
          </div>
          <select value={pIdx} onChange={e => setPIdx(Number(e.target.value))} className="text-sm border border-surface-border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-accent">
            {periods.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* 최상단 시장 요약 — 우리 vs 주요 동업계 추이 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">시장 요약 <span className="font-normal text-gray-400">· 우리+주요 동업계 {gran === 'month' ? '월간' : '주간'} 추이 (최근 {mkt.buckets.length}) · {zone === 'kids' ? '키즈' : '성인'} · 전 매장 합산 · 단위 백만</span></h3>
        {loading ? <div className="h-56 bg-surface-subtle animate-pulse rounded-lg" /> : mkt.buckets.length === 0 ? <div className="h-20 flex items-center justify-center text-xs text-gray-300">데이터 없음</div> : (
          <div className="overflow-x-auto">
            <table className="text-[10px] border-collapse w-full">
              <thead><tr className="text-gray-400 font-semibold border-b border-gray-200">
                <th className="sticky left-0 bg-white text-left py-1.5 pr-2 z-10 min-w-[110px]">브랜드</th>
                {mkt.buckets.map(b => <th key={b} className="px-1.5 py-1.5 text-right min-w-[42px] whitespace-nowrap">{bucketLabel(b)}</th>)}
                <th className="px-2 py-1.5 text-right border-l border-gray-200 bg-gray-50/50">합계</th>
                <th className="px-2 py-1.5 text-right bg-gray-50/50">전주비</th>
              </tr></thead>
              <tbody>
                {mkt.brands.map(b => {
                  const cur = b.wk[mkt.lastWk] ?? 0, prev = b.wk[mkt.prevWk] ?? 0
                  const wow = prev > 0 ? (cur / prev - 1) * 100 : null
                  return (
                    <tr key={b.brand} className={cn('border-b border-gray-50', b.isOurs ? 'bg-brand-accent/5' : 'hover:bg-gray-50/40')}>
                      <td className={cn('sticky left-0 text-left py-1 pr-2 z-10 truncate max-w-[120px] font-medium', b.isOurs ? 'bg-pink-50 text-brand-accent font-bold' : 'bg-white text-gray-700')} title={nm(b.brand)}>{b.isOurs ? `${nm(b.brand)} ★` : b.brand}</td>
                      {mkt.buckets.map(w => { const v = b.wk[w] ?? 0; const op = v > 0 ? 0.06 + 0.5 * (v / mkt.maxCell) : 0; return <td key={w} className="px-1.5 py-1 text-right font-mono text-gray-700 whitespace-nowrap" style={{ background: v > 0 ? `rgba(236,72,153,${op.toFixed(3)})` : undefined }}>{cellTxt(v)}</td> })}
                      <td className="px-2 py-1 text-right font-mono font-semibold text-gray-900 border-l border-gray-200 whitespace-nowrap">{cellTxt(b.total)}</td>
                      <td className={cn('px-2 py-1 text-right font-mono font-medium whitespace-nowrap', wow == null ? 'text-gray-300' : wow >= 0 ? 'text-red-500' : 'text-blue-500')}>{wow == null ? '—' : `${wow >= 0 ? '▲' : '▼'}${Math.abs(Math.round(wow))}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2">전주비 = 최근 마감주 vs 직전주 · ★=우리 · 경쟁사는 건물당 중복제거 후 전 매장 합산 · 채널 토글로 백화점/아울렛/쇼핑몰 구분</p>
      </div>

      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h3 className="text-xs font-semibold text-gray-700 mb-2">전 매장 ({(data?.buildings ?? []).length}) <span className="font-normal text-gray-400">· {zone === 'kids' ? '키즈' : '성인'} 조닝 · 단위 백만원 · 헤더 정렬 · 행 클릭 시 펼침</span></h3>
        {loading ? <div className="h-96 bg-surface-subtle animate-pulse rounded-lg" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-200 text-gray-400 font-semibold text-right select-none">
                  <th onClick={() => toggle('shop')} className="text-left py-1.5 px-2 cursor-pointer hover:text-gray-600">매장{arrow('shop')}</th>
                  {zoneCodes.map(c => <th key={c} className="py-1.5 px-2">{nm(c)}</th>)}
                  <th onClick={() => toggle('our')} className="py-1.5 px-2 cursor-pointer hover:text-gray-600 border-l border-gray-100">우리합{arrow('our')}</th>
                  <th onClick={() => toggle('share')} className="py-1.5 px-2 cursor-pointer hover:text-gray-600">점유{arrow('share')}</th>
                  <th onClick={() => toggle('rank')} className="py-1.5 px-2 cursor-pointer hover:text-gray-600">최고순위{arrow('rank')}</th>
                  <th className="py-1.5 pl-2 text-left">매장 1위</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(b => {
                  const exp = expanded === b.bld
                  return [
                    <tr key={b.bld} onClick={() => openBld(b.bld)} className={cn('border-b border-gray-50 text-right cursor-pointer', exp ? 'bg-brand-accent/10' : 'hover:bg-gray-50/50')}>
                      <td className={cn('text-left py-1 px-2 truncate max-w-[150px]', exp ? 'text-brand-accent font-semibold' : 'text-gray-700')} title={b.bld}>{exp ? '▼ ' : '▸ '}{b.bld}</td>
                      {zoneCodes.map(c => <td key={c} className="py-1 px-2 font-mono text-gray-600">{b.ours[c] ? fmtW(b.ours[c]) : '—'}</td>)}
                      <td className="py-1 px-2 font-mono font-semibold text-gray-900 border-l border-gray-100">{fmtW(b.ourAmt)}</td>
                      <td className="py-1 px-2 font-mono text-gray-600">{b.share != null ? `${b.share}%` : '—'}</td>
                      <td className={cn('py-1 px-2 font-mono font-bold', rankCls(b.bestRank))}>{b.bestRank ?? '—'}</td>
                      <td className={cn('py-1 pl-2 text-left truncate max-w-[120px]', b.topIsOurs ? 'text-emerald-600 font-semibold' : 'text-gray-500')}>{b.topIsOurs ? `우리 1위 (${nm(b.topBrand)})` : nm(b.topBrand)}</td>
                    </tr>,
                    exp ? (
                      <tr key={b.bld + '_x'} className="bg-gray-50/40">
                        <td colSpan={colSpan} className="px-3 py-2">
                          {mLoading ? <div className="text-[10px] text-gray-400 py-2">로딩…</div> : mx.buckets.length === 0 ? <div className="text-[10px] text-gray-400 py-2">데이터 없음</div> : (
                            <div className="overflow-x-auto">
                              <table className="text-[10px] border-collapse">
                                <thead><tr className="text-gray-400 font-semibold border-b border-gray-200">
                                  <th className="sticky left-0 bg-gray-50 text-left py-1 pr-2 z-10 min-w-[110px]">브랜드</th>
                                  {mx.buckets.map(w => <th key={w} className="px-1.5 py-1 text-right min-w-[40px] whitespace-nowrap">{bucketLabel(w)}</th>)}
                                  <th className="px-2 py-1 text-right border-l border-gray-200">합계</th>
                                </tr></thead>
                                <tbody>
                                  {mx.brands.map(br => (
                                    <tr key={br.brand} className={cn('border-b border-gray-100', br.isOurs && 'bg-brand-accent/5')}>
                                      <td className={cn('sticky left-0 text-left py-1 pr-2 z-10 truncate max-w-[120px] font-medium', br.isOurs ? 'bg-pink-50 text-brand-accent font-bold' : 'bg-gray-50 text-gray-700')} title={nm(br.brand)}>{br.isOurs ? `${nm(br.brand)} ★` : br.brand}</td>
                                      {mx.buckets.map(w => { const v = br.wk[w] ?? 0; const op = v > 0 ? 0.06 + 0.5 * (v / mx.maxCell) : 0; return <td key={w} className="px-1.5 py-1 text-right font-mono text-gray-700 whitespace-nowrap" style={{ background: v > 0 ? `rgba(236,72,153,${op.toFixed(3)})` : undefined }}>{cellTxt(v)}</td> })}
                                      <td className="px-2 py-1 text-right font-mono font-semibold text-gray-900 border-l border-gray-200 whitespace-nowrap">{cellTxt(br.total)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null,
                  ]
                })}
                {rows.length === 0 && <tr><td colSpan={colSpan} className="text-center py-8 text-gray-400">데이터 없음</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-gray-400 mt-2">점유·순위는 동업계(경쟁사) 입력 있는 매장만 의미. 경쟁사는 매니저 수기입력이라 건물당 중복제거(최댓값) 적용. 와릿이즌=와키윌리는 경쟁사 제외.</p>
      </div>
    </div>
  )
}
