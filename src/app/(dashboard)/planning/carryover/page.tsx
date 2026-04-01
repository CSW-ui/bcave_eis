'use client'

import { useState, useEffect, useCallback } from 'react'
// useRouter removed – was unused
import { RefreshCw, ArrowUpDown, Download, Bot, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_TABS } from '@/lib/constants'
import { fmtM, fmtW } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

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
    <th className={cn('px-1 py-2 cursor-pointer hover:text-gray-900 whitespace-nowrap', align === 'left' ? 'text-left px-2' : 'text-right')}
      onClick={() => sort.toggle(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        <ArrowUpDown size={8} className={cn(sort.key === k ? 'opacity-100 text-brand-accent' : 'opacity-20')} />
      </span>
    </th>
  )
}

export default function CarryoverPage() {
  const { allowedBrands } = useAuth()
  const [brand, setBrand] = useState('all')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selItem, setSelItem] = useState<string | null>(null)
  const [channels, setChannels] = useState<any[]>([])
  const [years, setYears] = useState<any[]>([])
  const [_aiAdvice, setAiAdvice] = useState<string>('')
  const [_aiLoading, setAiLoading] = useState(false)
  const [selYear, setSelYear] = useState<string | null>(null)
  const [staleMinInvAmt, setStaleMinInvAmt] = useState(0)
  const [staleMinTotalInv, setStaleMinTotalInv] = useState(0)
  const [staleMinInvWeeks, setStaleMinInvWeeks] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string; content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const itemSort = useSortable('totalInv')
  const styleSort = useSortable('invAmt')
  const chSort = useSortable('totalRev')
  const yrSort = useSortable('year')

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/planning/carryover?brand=${brand}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json)
      setChannels(json.channels ?? [])
      setYears(json.years ?? [])
      setAllYears(json.years ?? [])
      setFilteredItems(json.items ?? [])
      setFilteredStaleStyles(json.staleStyles ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [brand])

  useEffect(() => { setSelItem(null); setSelYear(null); fetchData() }, [fetchData])

  // 필터 re-fetch — 품목 테이블은 유지, 채널/연도/적체만 업데이트
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [filteredStaleStyles, setFilteredStaleStyles] = useState<any[]>([])
  const [allYears, setAllYears] = useState<any[]>([])

  const refetchFiltered = async (item: string | null, year: string | null) => {
    const params = new URLSearchParams({ brand })
    if (item) params.set('item', item)
    if (year) params.set('yearcd', year)
    try {
      const res = await fetch(`/api/planning/carryover?${params}`)
      const json = await res.json()
      if (res.ok) {
        setChannels(json.channels ?? [])
        setFilteredStaleStyles(json.staleStyles ?? [])
        // 품목: 연도 필터 시 업데이트, 품목 클릭 시에는 유지
        if (!item) setFilteredItems(json.items ?? [])
        // 연도: 품목 필터 시 업데이트, 연도 클릭 시에는 유지
        if (!year) setAllYears(json.years ?? [])
      }
    } catch {}
  }

  const handleItemClick = (item: string) => {
    const next = selItem === item ? null : item
    setSelItem(next)
    refetchFiltered(next, selYear)
  }

  const handleYearClick = (year: string) => {
    const next = selYear === year ? null : year
    setSelYear(next)
    refetchFiltered(selItem, next)
  }

  // AI 이월재고 제안 (서버 API 경유)
  const _fetchAiAdvice = async () => {
    setAiLoading(true)
    try {
      const topStale = (data?.staleStyles ?? []).slice(0, 10).map((s: any) => `${s.stylenm}(${s.yearcd}) 재고${s.totalInv} 판매율${s.sellThrough}%`)
      const chInfo = channels.map((c: any) => `${c.channel}: 전주${Math.round(c.cwRev/1e6)}백만 비중${c.share}%`)
      const yrInfo = years.map((y: any) => `20${y.year}: 재고${y.totalInv} 판매율${y.sellThrough}%`)
      const res = await fetch('/api/planning/carryover-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staleStyles: topStale, channels: chInfo, years: yrInfo, brand }),
      })
      const json = await res.json()
      setAiAdvice(json.advice ?? '')
    } catch { setAiAdvice('AI 분석 실패') }
    finally { setAiLoading(false) }
  }

  const downloadExcel = () => {
    if (!data?.staleStyles) return
    const rows = data.staleStyles.map((s: any) => ({
      '상품코드': s.stylecd, '상품명': s.stylenm, '브랜드': s.brandcd,
      '품목': s.item, '시즌': s.yearcd, '정가': s.tagPrice,
      '매장재고': s.shopInv, '창고재고': s.whAvail, '총재고': s.totalInv,
      '재고금액': s.invAmt, '판매수량': s.saleQty, '매출': s.saleAmt,
      '전주매출': s.cwRev, '판매율': `${s.sellThrough}%`,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '이월재고')
    XLSX.writeFile(wb, `이월재고_${brand}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    const newMsgs = [...chatMessages, { role: 'user', content: userMsg }]
    setChatMessages(newMsgs)
    setChatLoading(true)
    try {
      const context = {
        staleStyles: (data?.staleStyles ?? []).slice(0, 15).map((s: any) => `${s.stylenm}(${s.yearcd}) 재고${s.totalInv} 판매율${s.sellThrough}%`),
        channels: channels.map((c: any) => `${c.channel}: 전주${Math.round(c.cwRev/1e6)}백만 비중${c.share}%`),
        years: years.map((y: any) => `20${y.year}: 재고${y.totalInv} 판매율${y.sellThrough}%`),
        brand, question: userMsg,
        history: newMsgs.slice(-6),
      }
      const res = await fetch('/api/planning/carryover-advice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      })
      const json = await res.json()
      setChatMessages([...newMsgs, { role: 'assistant', content: json.advice ?? 'AI 응답 실패' }])
    } catch { setChatMessages([...newMsgs, { role: 'assistant', content: '오류가 발생했습니다.' }]) }
    finally { setChatLoading(false) }
  }

  const rawStyles = (selItem || selYear) ? filteredStaleStyles : (data?.staleStyles ?? [])
  const filteredStyles = rawStyles.filter((s: any) => {
    if (staleMinInvAmt > 0 && s.invAmt < staleMinInvAmt) return false
    if (staleMinTotalInv > 0 && s.totalInv < staleMinTotalInv) return false
    if (staleMinInvWeeks > 0 && s.invWeeks < staleMinInvWeeks) return false
    return true
  })

  return (
    <div className="flex flex-col gap-3 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">이월재고 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">이월 상품 재고·매출·판매율 분석 · 적체 상품 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {visibleBrands.map(b => (
              <button key={b.value} onClick={() => setBrand(b.value)}
                className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                {b.value !== 'all' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 mb-px" style={{ background: BRAND_COLORS[b.value] }} />}
                {b.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading} className="text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={downloadExcel} className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* 필터 뱃지 */}
      {(selItem || selYear) && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">필터:</span>
          {selItem && (
            <button onClick={() => { setSelItem(null); refetchFiltered(null, selYear) }}
              className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {selItem} ✕
            </button>
          )}
          {selYear && (
            <button onClick={() => { setSelYear(null); refetchFiltered(selItem, null) }}
              className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              20{selYear} ✕
            </button>
          )}
          <button onClick={() => { setSelItem(null); setSelYear(null); refetchFiltered(null, null) }}
            className="text-[10px] text-gray-400 hover:text-gray-600 underline">전체 해제</button>
        </div>
      )}

      {/* KPI */}
      {!loading && data && (
        <div className="grid grid-cols-6 gap-3">
          {([
            { title: '이월 품목수', value: `${data.kpi.itemCount}개`, color: '' },
            { title: '총 재고수량', value: data.kpi.totalInv.toLocaleString(), color: '' },
            { title: '재고금액(TAG)', value: fmtW(data.kpi.totalInvAmt), color: '' },
            { title: '전주 매출', value: fmtW(data.kpi.totalCwRev), color: '' },
            { title: '재고주수(평균)', value: `${data.kpi.avgInvWeeks}주`, color: data.kpi.avgInvWeeks >= 20 ? 'text-red-600' : data.kpi.avgInvWeeks >= 10 ? 'text-amber-600' : '' },
            { title: '적체 상품', value: `${data.kpi.staleCount}개`, color: data.kpi.staleCount > 0 ? 'text-red-600' : '' },
          ]).map(k => (
            <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase">{k.title}</p>
              <p className={cn('text-xl font-bold mt-1', k.color || 'text-gray-900')}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3컬럼 레이아웃 */}
      <div className="flex gap-3" style={{ height: 700 }}>

        {/* 품목별 이월 현황 */}
        <div className="flex-[3] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">품목별 이월 현황 <span className="font-normal text-gray-400 ml-1">클릭 시 상품 필터</span></h3>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-4 space-y-2">{Array.from({length:10}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div> : (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <SortTh k="item" label="품목" sort={itemSort} align="left" />
                    <SortTh k="styleCnt" label="스타일" sort={itemSort} />
                    <SortTh k="totalInv" label="재고" sort={itemSort} />
                    <SortTh k="invAmt" label="재고금액" sort={itemSort} />
                    <SortTh k="cwRev" label="전주매출" sort={itemSort} />
                    <SortTh k="wow" label="WoW" sort={itemSort} />
                    <SortTh k="sellThrough" label="판매율" sort={itemSort} />
                    <SortTh k="invWeeks" label="재고주수" sort={itemSort} />
                    <SortTh k="whRatio" label="창고비중" sort={itemSort} />
                  </tr>
                </thead>
                <tbody>
                  {itemSort.sort(selYear ? filteredItems : (data?.items ?? [])).map((item: any, i: number) => (
                    <tr key={item.item} onClick={() => handleItemClick(item.item)}
                      className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                        selItem === item.item ? 'bg-emerald-50' : i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                      <td className="px-2 py-2 font-medium text-gray-800">{item.item}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-700">{item.styleCnt}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-700">{item.totalInv.toLocaleString()}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-600">{fmtW(item.invAmt)}</td>
                      <td className="px-1 py-2 text-right font-mono text-purple-700 font-semibold">{fmtM(item.cwRev)}</td>
                      <td className={cn('px-1 py-2 text-right font-mono', item.wow >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {item.pwRev > 0 ? `${item.wow >= 0 ? '+' : ''}${item.wow}%` : '—'}
                      </td>
                      <td className="px-1 py-2 text-right">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                          item.sellThrough >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          item.sellThrough >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {item.sellThrough}%
                        </span>
                      </td>
                      <td className="px-1 py-2 text-right">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                          item.invWeeks >= 20 ? 'bg-red-100 text-red-700' :
                          item.invWeeks >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                          {item.invWeeks >= 999 ? '—' : `${item.invWeeks}주`}
                        </span>
                      </td>
                      <td className="px-1 py-2 text-right">
                        <span className={cn('font-mono text-[10px]', item.whRatio >= 70 ? 'text-red-600 font-bold' : 'text-gray-500')}>
                          {item.whRatio}%
                        </span>
                        {item.whRatio >= 70 && <span className="ml-0.5 text-[8px] text-red-500" title="매장배분필요">!</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 채널별 이월 판매 */}
        <div className="flex-[2] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">채널별 이월 판매</h3>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-2 space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-6 bg-surface-subtle animate-pulse rounded"/>)}</div> : (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <SortTh k="channel" label="채널" sort={chSort} align="left" />
                    <SortTh k="cwRev" label="전주" sort={chSort} />
                    <SortTh k="wow" label="WoW" sort={chSort} />
                    <SortTh k="share" label="비중" sort={chSort} />
                  </tr>
                </thead>
                <tbody>
                  {chSort.sort(channels).map((ch: any, i: number) => (
                    <tr key={ch.channel} className={cn('border-b border-surface-border/50', i%2===0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <td className="px-2 py-2 text-gray-800 font-medium truncate max-w-[100px]">{ch.channel}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-700">{fmtM(ch.cwRev)}</td>
                      <td className={cn('px-1 py-2 text-right font-mono', ch.wow >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {ch.pwRev > 0 ? `${ch.wow >= 0 ? '+' : ''}${ch.wow}%` : '—'}
                      </td>
                      <td className="px-1 py-2 text-right text-gray-500">{ch.share}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 연도별 + AI 제안 */}
        <div className="flex-[2] flex flex-col gap-3 min-w-0">
          {/* 연도별 재고 */}
          <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col" style={{maxHeight:300}}>
            <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
              <h3 className="text-xs font-semibold text-gray-700">연도별 이월 재고</h3>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <SortTh k="year" label="시즌" sort={yrSort} align="left" />
                    <SortTh k="styleCnt" label="스타일" sort={yrSort} />
                    <SortTh k="totalInv" label="재고" sort={yrSort} />
                    <SortTh k="cwRev" label="전주매출" sort={yrSort} />
                    <SortTh k="sellThrough" label="판매율" sort={yrSort} />
                  </tr>
                </thead>
                <tbody>
                  {yrSort.sort(allYears).map((y: any, i: number) => (
                    <tr key={y.year} onClick={() => handleYearClick(y.year)}
                      className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                        selYear === y.year ? 'bg-blue-50' : i%2===0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                      <td className="px-2 py-2 font-semibold text-gray-800">20{y.year}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-700">{y.styleCnt}</td>
                      <td className="px-1 py-2 text-right font-mono text-gray-700">{y.totalInv.toLocaleString()}</td>
                      <td className="px-1 py-2 text-right font-mono text-purple-700">{fmtM(y.cwRev)}</td>
                      <td className="px-2 py-2 text-right">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                          y.sellThrough >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          y.sellThrough >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {y.sellThrough}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 적체 상품 TOP 30 */}
        <div className="flex-[4] bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-surface-border bg-surface-subtle shrink-0">
            <h3 className="text-xs font-semibold text-gray-700">
              {selItem ? `${selItem} 이월 상품` : '적체 상품 (재고금액 높은 순)'}
              <span className="font-normal text-gray-400 ml-1">{filteredStyles.length}개</span>
            </h3>
          </div>
          <div className="px-3 py-1.5 flex gap-2 items-center border-b border-surface-border">
            <span className="text-[10px] text-gray-400">필터:</span>
            <select value={staleMinInvAmt} onChange={e => setStaleMinInvAmt(Number(e.target.value))}
              className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
              <option value={0}>재고금액 전체</option>
              <option value={500000000}>5억 이상</option>
              <option value={1000000000}>10억 이상</option>
              <option value={2000000000}>20억 이상</option>
            </select>
            <select value={staleMinTotalInv} onChange={e => setStaleMinTotalInv(Number(e.target.value))}
              className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
              <option value={0}>재고수량 전체</option>
              <option value={1000}>1,000장 이상</option>
              <option value={3000}>3,000장 이상</option>
              <option value={5000}>5,000장 이상</option>
            </select>
            <select value={staleMinInvWeeks} onChange={e => setStaleMinInvWeeks(Number(e.target.value))}
              className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
              <option value={0}>재고주수 전체</option>
              <option value={10}>10주 이상</option>
              <option value={20}>20주 이상</option>
              <option value={30}>30주 이상</option>
            </select>
          </div>
          <div className="overflow-auto flex-1">
            {loading ? <div className="p-3 space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-7 bg-surface-subtle animate-pulse rounded"/>)}</div> : filteredStyles.length > 0 ? (
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-400 font-semibold">
                    <SortTh k="stylecd" label="코드" sort={styleSort} align="left" />
                    <SortTh k="stylenm" label="상품명" sort={styleSort} align="left" />
                    <th className="text-center px-1 py-2">브랜드</th>
                    <SortTh k="yearcd" label="시즌" sort={styleSort} />
                    <SortTh k="totalInv" label="재고" sort={styleSort} />
                    <SortTh k="invAmt" label="재고금액" sort={styleSort} />
                    <SortTh k="saleQty" label="판매" sort={styleSort} />
                    <SortTh k="cwRev" label="전주" sort={styleSort} />
                    <SortTh k="sellThrough" label="판매율" sort={styleSort} />
                    <SortTh k="invWeeks" label="재고주수" sort={styleSort} />
                    <SortTh k="whRatio" label="창고비중" sort={styleSort} />
                  </tr>
                </thead>
                <tbody>
                  {styleSort.sort(filteredStyles).map((s: any, i: number) => (
                    <tr key={s.stylecd} className={cn('border-b border-surface-border/50',
                      s.sellThrough < 10 ? 'bg-red-50/30' : i%2===0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <td className="px-2 py-1.5 font-mono text-gray-400 text-[9px]">{s.stylecd}</td>
                      <td className="px-1 py-1.5 font-medium text-gray-800 truncate max-w-[140px]">{s.stylenm}</td>
                      <td className="px-1 py-1.5 text-center">
                        <span className="px-1 py-px rounded-full text-[8px] font-bold text-white" style={{ background: BRAND_COLORS[s.brandcd] ?? '#999' }}>{s.brandcd}</span>
                      </td>
                      <td className="px-1 py-1.5 text-right text-gray-500">{s.yearcd}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-700 font-semibold">{s.totalInv.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-600">{fmtW(s.invAmt)}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-gray-600">{s.saleQty.toLocaleString()}</td>
                      <td className="px-1 py-1.5 text-right font-mono text-purple-700">{s.cwRev > 0 ? fmtM(s.cwRev) : '—'}</td>
                      <td className="px-1 py-1.5 text-right">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                          s.sellThrough >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          s.sellThrough >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {s.sellThrough}%
                        </span>
                      </td>
                      <td className="px-1 py-1.5 text-right">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-semibold',
                          s.invWeeks >= 20 ? 'bg-red-100 text-red-700' :
                          s.invWeeks >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>
                          {s.invWeeks >= 999 ? '—' : `${s.invWeeks}주`}
                        </span>
                      </td>
                      <td className="px-1 py-1.5 text-right">
                        <span className={cn('font-mono text-[10px]', s.whRatio >= 70 ? 'text-red-600 font-bold' : 'text-gray-500')}>
                          {s.whRatio}%
                        </span>
                        {s.whRatio >= 70 && <span className="ml-0.5 px-1 py-px rounded bg-red-100 text-red-600 text-[8px] font-semibold">매장배분필요</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="py-8 text-center text-xs text-gray-400">데이터 없음</div>}
          </div>
        </div>
      </div>

      {/* AI 채팅 플로팅 버튼 */}
      <button onClick={() => setChatOpen(!chatOpen)}
        className={cn('fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50',
          chatOpen ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700')}>
        {chatOpen ? <X size={24} className="text-white" /> : <Bot size={24} className="text-white" />}
      </button>

      {/* AI 채팅 패널 */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border border-surface-border flex flex-col z-50 overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white shrink-0">
            <h3 className="text-sm font-bold flex items-center gap-2"><Bot size={16} /> 이월재고 AI 에이전트</h3>
            <p className="text-[10px] text-blue-200 mt-0.5">이월재고에 대해 무엇이든 물어보세요</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Bot size={32} className="text-blue-200 mx-auto mb-3" />
                <p className="text-xs text-gray-400 mb-3">이월재고 관련 질문을 해보세요</p>
                <div className="space-y-1.5">
                  {['후드티 이월 어떻게 처리해?', '아울렛에 어떤 상품 보내야 해?', '23년도 재고 할인 전략 알려줘'].map(q => (
                    <button key={q} onClick={() => {
                      const newMsgs = [...chatMessages, { role: 'user', content: q }]
                      setChatMessages(newMsgs)
                      setChatLoading(true)
                      const context = {
                        staleStyles: (data?.staleStyles ?? []).slice(0, 15).map((s: any) => `${s.stylenm}(${s.yearcd}) 재고${s.totalInv} 판매율${s.sellThrough}%`),
                        channels: channels.map((c: any) => `${c.channel}: 전주${Math.round(c.cwRev/1e6)}백만 비중${c.share}%`),
                        years: allYears.map((y: any) => `20${y.year}: 재고${y.totalInv} 판매율${y.sellThrough}%`),
                        brand, question: q, history: newMsgs,
                      }
                      fetch('/api/planning/carryover-advice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(context) })
                        .then(r => r.json()).then(j => setChatMessages([...newMsgs, { role: 'assistant', content: j.advice ?? 'AI 응답 실패' }]))
                        .catch(() => setChatMessages([...newMsgs, { role: 'assistant', content: '오류 발생' }]))
                        .finally(() => setChatLoading(false))
                    }}
                      className="block w-full text-left text-[11px] text-blue-600 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-[11px] leading-relaxed',
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] text-gray-400 animate-pulse">AI가 분석 중...</div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-surface-border shrink-0">
            <div className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="질문을 입력하세요..."
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                className="bg-blue-600 text-white rounded-xl px-3 py-2 hover:bg-blue-700 disabled:opacity-50">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
