'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ArrowLeft, RefreshCw, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_TABS } from '@/lib/constants'
import { fmtW, fmtDelta, fmtDeltaPt } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'

const CH_COLORS = ['#e91e63', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1']
const M_TICKS = [1, 5, 9, 13, 18, 22, 26, 31, 35, 40, 44, 48]
const M_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { allowedBrands } = useAuth()
  const itemName = decodeURIComponent(params.item as string)

  const [brand, setBrand] = useState('all')
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  const year = searchParams.get('year') || '26'
  const season = searchParams.get('season') || '봄,여름,상반기,스탠다드'
  const compYear = String(Number(year) - 1)
  const seasonLabel = season.includes(',') ? `${year} S/S` : `${year} ${season}`

  // 크로스 필터 상태
  const [selWeek, setSelWeek] = useState<number | null>(null)
  const [selStyle, setSelStyle] = useState<{ code: string; name: string } | null>(null)
  const [selChannel, setSelChannel] = useState<string | null>(null)

  const [styles, setStyles] = useState<any[]>([])
  const [lyStyles, setLyStyles] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [weeks, setWeeks] = useState<any[]>([])
  const [weekMeta, setWeekMeta] = useState<{ cyTotal: number; lyTotal: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  // 차트 데이터 fetch (stylecd, channel 필터 반영)
  const fetchWeekly = useCallback(async () => {
    const sp = new URLSearchParams({ brand: apiBrand, year, season, item: itemName })
    if (selStyle) sp.set('stylecd', selStyle.code)
    if (selChannel) sp.set('channel', selChannel)
    const res = await fetch(`/api/planning/item-weekly?${sp}`)
    const json = await res.json()
    setWeeks(json.weeks ?? [])
    setWeekMeta(json.meta ?? null)
  }, [apiBrand, year, season, itemName, selStyle, selChannel])

  // 스타일 테이블 + 채널 fetch (weekNum, channel, stylecd 필터 반영)
  const fetchStyles = useCallback(async () => {
    const sp = new URLSearchParams({ brand: apiBrand, year, season, item: itemName, compareYear: compYear })
    if (selWeek) sp.set('weekNum', String(selWeek))
    if (selChannel) sp.set('channel', selChannel)
    if (selStyle) sp.set('stylecd', selStyle.code)
    const res = await fetch(`/api/planning/styles?${sp}`)
    const json = await res.json()
    setStyles(json.styles ?? [])
    setLyStyles(json.lyStyles ?? [])
    setChannels(json.channels ?? [])
  }, [apiBrand, year, season, itemName, compYear, selWeek, selChannel, selStyle])

  // 초기 로드
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchWeekly(), fetchStyles()]).finally(() => setLoading(false))
  }, [brand])

  // 필터 변경 시 re-fetch
  useEffect(() => { fetchWeekly() }, [selStyle, selChannel])
  useEffect(() => { fetchStyles() }, [selWeek, selChannel, selStyle])

  // 전주까지만 표시 (금년 데이터가 있는 마지막 주)
  const maxCyWeek = useMemo(() => {
    let max = 0
    for (const w of weeks) { if (w.cy != null && w.cy > 0) max = w.weekNum }
    return max
  }, [weeks])

  const trimmedWeeks = useMemo(() =>
    weeks.map(w => ({ ...w, cy: w.weekNum <= maxCyWeek ? w.cy : null }))
  , [weeks, maxCyWeek])

  // KPI — 매출 비교는 주간 차트 데이터로 동기간 대비
  const kpi = useMemo(() => {
    const s = (a: any[]) => ({
      n: a.length,
      oq: a.reduce((s:number,r:any)=>s+(r.ordQty||0),0),
      ot: a.reduce((s:number,r:any)=>s+(r.ordTagAmt||0),0),
      iq: a.reduce((s:number,r:any)=>s+(r.inQty||0),0),
      ia: a.reduce((s:number,r:any)=>s+(r.inAmt||0),0),
      sa: a.reduce((s:number,r:any)=>s+r.saleAmt,0),
      sq: a.reduce((s:number,r:any)=>s+r.saleQty,0),
      ca: a.reduce((s:number,r:any)=>s+r.costAmt,0),
    })
    const cy = s(styles); const ly = s(lyStyles)
    const st = cy.iq>0 ? Math.round(cy.sq/cy.iq*1000)/10 : 0
    const lst = ly.iq>0 ? Math.round(ly.sq/ly.iq*1000)/10 : 0
    const ir = cy.oq>0 ? Math.round(cy.iq/cy.oq*1000)/10 : 0
    const lir = ly.oq>0 ? Math.round(ly.iq/ly.oq*1000)/10 : 0
    const dc = styles.length ? Math.round(styles.reduce((s:number,r:any)=>s+r.dcRate,0)/styles.length*10)/10 : 0
    const ldc = lyStyles.length ? Math.round(lyStyles.reduce((s:number,r:any)=>s+r.dcRate,0)/lyStyles.length*10)/10 : 0
    const cg = cy.sa>0 ? Math.round(cy.ca/cy.sa*1000)/10 : 0
    const lcg = ly.sa>0 ? Math.round(ly.ca/ly.sa*1000)/10 : 0
    const cyWeekTotal = weekMeta?.cyTotal ?? 0
    const lyWeekMatch = weeks.filter(w => w.weekNum <= maxCyWeek).reduce((s, w) => s + (w.ly ?? 0), 0)
    return [
      { t:'스타일수', v:`${cy.n}개`, d:fmtDelta(cy.n,ly.n) },
      { t:'발주금액', v:fmtW(cy.ot), d:fmtDelta(cy.ot,ly.ot) },
      { t:'입고금액', v:fmtW(cy.ia), d:fmtDelta(cy.ia,ly.ia) },
      { t:'입고율', v:`${ir}%`, d:fmtDeltaPt(ir,lir) },
      { t:'매출', v:fmtW(cy.sa), d:fmtDelta(cy.sa, ly.sa) },
      { t:'판매율', v:`${st}%`, d:fmtDeltaPt(st,lst) },
      { t:'할인율', v:`${dc}%`, d:fmtDeltaPt(dc,ldc) },
      { t:'매출원가율', v:`${cg}%`, d:fmtDeltaPt(cg,lcg) },
    ]
  }, [styles, lyStyles, weeks, maxCyWeek, weekMeta])

  const chTotal = channels.reduce((s:number, c:any) => s + c.amt, 0)
  const hasFilter = selWeek || selStyle || selChannel

  const clearFilters = () => { setSelWeek(null); setSelStyle(null); setSelChannel(null) }

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/planning')}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle">
            <ArrowLeft size={12} /> 기획현황판
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-gray-400" />{itemName}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{seasonLabel} vs {compYear} 동시즌</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {visibleBrands.map(b => (
              <button key={b.value} onClick={() => { setBrand(b.value); clearFilters() }}
                className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{b.label}</button>
            ))}
          </div>
          <button onClick={() => { clearFilters(); fetchWeekly(); fetchStyles() }} disabled={loading}
            className="text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 활성 필터 뱃지 */}
      {hasFilter && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-gray-400">필터:</span>
          {selWeek && (
            <button onClick={() => setSelWeek(null)} className="flex items-center gap-1 text-[10px] bg-brand-accent text-white px-2 py-0.5 rounded-full">
              W{selWeek} <X size={10} />
            </button>
          )}
          {selStyle && (
            <button onClick={() => setSelStyle(null)} className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {selStyle.name} <X size={10} />
            </button>
          )}
          {selChannel && (
            <button onClick={() => setSelChannel(null)} className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {selChannel} <X size={10} />
            </button>
          )}
          <button onClick={clearFilters} className="text-[10px] text-gray-400 hover:text-gray-600 underline">전체 해제</button>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-8 gap-3">
        {loading ? Array.from({length:8}).map((_,i) => <div key={i} className="h-20 bg-surface-subtle animate-pulse rounded-xl" />) :
        kpi.map(k => (
          <div key={k.t} className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{k.t}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{k.v}</p>
            <span className={cn('text-[10px] font-medium', k.d.pos===null?'text-gray-300':k.d.pos?'text-emerald-600':'text-red-500')}>{k.d.t}</span>
          </div>
        ))}
      </div>

      {/* 차트 + 채널 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-white rounded-xl border border-surface-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">
              주간 매출 추이
              {selStyle && <span className="ml-2 font-normal text-purple-500">· {selStyle.name}</span>}
              {selChannel && <span className="ml-2 font-normal text-blue-500">· {selChannel}</span>}
            </h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-brand-accent" />금년 {fmtW(weekMeta?.cyTotal??0)}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-300" />전년 {fmtW(weekMeta?.lyTotal??0)}</span>
              {selWeek && <button onClick={() => setSelWeek(null)} className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">W{selWeek} 해제</button>}
            </div>
          </div>
          {loading ? <div className="h-64 bg-surface-subtle animate-pulse rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trimmedWeeks} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                onClick={(state: any) => { if (state?.activePayload?.length) { const w = state.activePayload[0].payload.weekNum; setSelWeek(prev => prev === w ? null : w) } }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="weekNum" type="number" domain={[1, Math.max(maxCyWeek + 2, 52)]}
                  ticks={M_TICKS} tickFormatter={w => M_LABELS[M_TICKS.indexOf(w)]??''}
                  tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtW(v)} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => fmtW(Number(v))} labelFormatter={(l) => `W${l}`} />
                {selWeek && <ReferenceLine x={selWeek} stroke="#e91e63" strokeDasharray="3 3" strokeWidth={1.5} />}
                <Line type="monotone" dataKey="ly" name="전년" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="cy" name="금년" stroke="#e91e63" strokeWidth={2.5} connectNulls={false}
                  dot={(props:any) => {
                    const { cx, cy: cyY, payload } = props
                    if (payload.cy == null) return <g key={props.key} />
                    if (payload.weekNum === selWeek) return <circle key={props.key} cx={cx} cy={cyY} r={5} fill="#e91e63" stroke="white" strokeWidth={2} />
                    return <circle key={props.key} cx={cx} cy={cyY} r={2} fill="#e91e63" />
                  }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 채널별 (클릭 가능) */}
        <div className="col-span-1 bg-white rounded-xl border border-surface-border shadow-sm p-4 flex flex-col">
          <h3 className="text-xs font-semibold text-gray-700 mb-2 shrink-0">유통채널별 판매</h3>
          {loading ? <div className="h-64 bg-surface-subtle animate-pulse rounded-lg" /> :
          channels.length > 0 ? (
            <div className="space-y-2 mt-1 overflow-y-auto" style={{ maxHeight: 260 }}>
              {channels.map((c:any,i:number) => {
                const pct = chTotal > 0 ? (c.amt/chTotal)*100 : 0
                const isSel = selChannel === c.channel
                return (
                  <div key={c.channel}
                    onClick={() => setSelChannel(prev => prev === c.channel ? null : c.channel)}
                    className={cn('space-y-0.5 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 transition-colors',
                      isSel ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50')}>
                    <div className="flex justify-between text-[10px]">
                      <span className={cn('truncate max-w-[120px]', isSel ? 'text-blue-700 font-semibold' : 'text-gray-600')}>{c.channel}</span>
                      <span className="font-mono text-gray-700">{fmtW(c.amt)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CH_COLORS[i%CH_COLORS.length] }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <div className="h-64 flex items-center justify-center text-xs text-gray-300">데이터 없음</div>}
        </div>
      </div>



      {/* 전체 상품 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-surface-border bg-surface-subtle">
          <h3 className="text-xs font-semibold text-gray-700">
            전체 상품 상세 <span className="font-normal text-gray-400 ml-1">{styles.length}개</span>
            {selWeek && <span className="ml-2 font-normal text-brand-accent">· W{selWeek}</span>}
            {selChannel && <span className="ml-2 font-normal text-blue-500">· {selChannel}</span>}
          </h3>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 500 }}>
          {styles.length > 0 ? (
            <table className="w-full text-[10px] border-collapse" style={{minWidth:1350}}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-800 border-b-2 border-gray-900">
                  <th colSpan={6} className="text-center text-[10px] text-gray-200 font-bold py-1 border-r border-gray-600">상품 정보</th>
                  <th colSpan={3} className="text-center text-[10px] text-gray-200 font-bold py-1 border-r border-gray-600">발주/입고</th>
                  <th colSpan={5} className="text-center text-[10px] text-blue-300 font-bold py-1 border-r border-gray-600">매출 (백만원)</th>
                  <th colSpan={3} className="text-center text-[10px] text-purple-300 font-bold py-1 border-r border-gray-600">전주</th>
                  <th colSpan={3} className="text-center text-[10px] text-gray-200 font-bold py-1">재고</th>
                </tr>
                <tr className="bg-gray-50 border-b border-surface-border text-gray-400 font-semibold">
                  <th className="text-left px-3 py-2">코드</th>
                  <th className="text-left px-2 py-2">상품명</th>
                  <th className="text-center px-1 py-2">BR</th>
                  <th className="text-right px-1 py-2">정가</th>
                  <th className="text-right px-1 py-2">제조원가</th>
                  <th className="text-right px-1 py-2">제조원가율</th>
                  <th className="text-right px-1 py-2 border-l border-gray-200">발주수량</th>
                  <th className="text-right px-1 py-2">입고수량</th>
                  <th className="text-right px-1 py-2">입고율</th>
                  <th className="text-right px-1 py-2 border-l border-gray-200">판매수량</th>
                  <th className="text-right px-1 py-2">매출</th>
                  <th className="text-right px-1 py-2">매출원가율</th>
                  <th className="text-right px-1 py-2">할인율</th>
                  <th className="text-right px-1 py-2">판매율</th>
                  <th className="text-right px-1 py-2 border-l border-gray-200">매출</th>
                  <th className="text-right px-1 py-2">수량</th>
                  <th className="text-right px-1 py-2">WoW</th>
                  <th className="text-right px-1 py-2 border-l border-gray-200">매장</th>
                  <th className="text-right px-1 py-2">창고</th>
                  <th className="text-right px-2 py-2">합계</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((s:any,i:number) => {
                  const isSel = selStyle?.code === s.stylecd
                  return (
                    <tr key={s.stylecd}
                      onClick={() => setSelStyle(prev => prev?.code === s.stylecd ? null : { code: s.stylecd, name: s.stylenm })}
                      className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                        isSel ? 'bg-purple-50' : i%2!==0 ? 'bg-gray-50/30 hover:bg-gray-50' : 'hover:bg-gray-50')}>
                      <td className="px-3 py-1.5 font-mono text-gray-400 text-[9px]">{s.stylecd}</td>
                      <td className={cn('px-2 py-1.5 font-medium truncate max-w-[160px]', isSel ? 'text-purple-700' : 'text-gray-800')}>{s.stylenm}</td>
                      <td className="px-1 py-1.5 text-center"><span className="px-1 py-px rounded-full text-[8px] font-bold text-white" style={{ background: BRAND_COLORS[s.brandcd]??'#999' }}>{s.brandcd}</span></td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-600">₩{Math.round(s.tagPrice).toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-500">₩{Math.round(s.prodCost||0).toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right text-gray-500">{s.tagPrice > 0 ? `${Math.round((s.prodCost||0) / s.tagPrice * 1000) / 10}%` : '—'}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-700 border-l border-gray-100">{(s.ordQty||0).toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-green-700">{(s.inQty||0).toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right">
                        {s.ordQty > 0 ? (
                          <span className={cn('px-1 py-px rounded-full text-[9px] font-semibold',
                            (s.inboundRate||0)>=90?'bg-green-100 text-green-700':(s.inboundRate||0)>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700')}>{s.inboundRate||0}%</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-700 border-l border-gray-100">{s.saleQty.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono font-semibold text-blue-700">{Math.round(s.saleAmt / 1e6).toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right text-gray-600">{s.cogsRate}%</td>
                      <td className="px-1 py-1.5 text-right text-gray-600">{s.dcRate}%</td>
                      <td className="px-1 py-1.5 text-right">
                        <span className={cn('px-1 py-px rounded-full text-[9px] font-semibold',
                          s.sellThrough>=70?'bg-emerald-100 text-emerald-700':s.sellThrough>=40?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700')}>{s.sellThrough}%</span>
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono text-purple-700 font-semibold border-l border-gray-100">{s.cwAmt ? Math.round(s.cwAmt / 1e6).toLocaleString() : '—'}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-purple-600">{s.cwQty ? s.cwQty.toLocaleString() : '—'}</td>
                      <td className={cn('px-1 py-1.5 text-right font-mono text-[9px]', (s.wow??0) >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {s.pwAmt > 0 ? `${s.wow >= 0 ? '+' : ''}${s.wow}%` : '—'}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-500 border-l border-gray-100">{s.shopInv.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-500">{s.whAvail.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-700">{s.totalInv.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>}
        </div>
      </div>
    </div>
  )
}
