'use client'

import { useState } from 'react'
import { ArrowUpDown, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { fmtM } from '@/lib/formatters'
import { CATEGORY_COLORS } from '@/lib/constants'

interface PlanningItem {
  item: string; category: string; styleCnt: number; skuCnt: number
  avgTag: number; avgCost: number
  ordQty: number; ordTagAmt: number; ordCostAmt: number
  inQty: number; inAmt: number; inboundRate: number
  saleQty: number; saleAmt: number; tagAmt: number; salePriceAmt: number; costAmt: number
  dcRate: number; cogsRate: number; salesRate: number
  cwAmt: number; pwAmt: number; cwQty: number; cwCost: number; cwCogsRate: number; wow: number
  monthAmt: number; monthQty: number
  shopInv: number; whAvail: number; totalInv: number
  invTagAmt: number; invCostAmt: number
  sellThrough: number
  diagnosis?: 'hero' | 'normal' | 'rising' | 'slow' | 'dead'
}

const DIAG_BADGE: Record<string, { label: string; cls: string }> = {
  hero:   { label: 'Hero',    cls: 'bg-emerald-100 text-emerald-700' },
  normal: { label: 'Normal',  cls: 'bg-blue-100 text-blue-700' },
  rising: { label: 'Rising',  cls: 'bg-violet-100 text-violet-700' },
  slow:   { label: 'Slow',    cls: 'bg-amber-100 text-amber-700' },
  dead:   { label: 'Dead',    cls: 'bg-red-100 text-red-700' },
}

function yoy(c: number, p: number) { return p ? `${((c-p)/p*100)>=0?'+':''}${((c-p)/p*100).toFixed(0)}%` : null }
function yC(c: number, p: number) { return !p ? 'text-gray-300' : c >= p ? 'text-emerald-600' : 'text-red-500' }

export function PlanningItemTable({ items, compItems, loading, selectedItem, onItemClick }: {
  items: PlanningItem[]; compItems?: PlanningItem[]; loading: boolean
  selectedItem?: string | null; onItemClick?: (item: string) => void
}) {
  const [sK, setSK] = useState<string>('saleAmt')
  const [sD, setSD] = useState<'asc'|'desc'>('desc')
  const tog = (k: string) => { if(sK===k) setSD(d=>d==='asc'?'desc':'asc'); else{setSK(k);setSD('desc')} }
  const cm = new Map((compItems??[]).map(c=>[c.item,c]))
  const sorted = [...items].sort((a,b) => {
    const av=(a as unknown as Record<string, number|string>)[sK]??0,bv=(b as unknown as Record<string, number|string>)[sK]??0
    return typeof av==='number'&&typeof bv==='number'?(sD==='asc'?av-bv:bv-av):(sD==='asc'?String(av).localeCompare(String(bv)):String(bv).localeCompare(String(av)))
  })

  // 합계 계산
  const s = (arr:PlanningItem[]) => arr.reduce((a,i) => ({
    sc:a.sc+i.styleCnt,sk:a.sk+i.skuCnt,oq:a.oq+i.ordQty,ot:a.ot+i.ordTagAmt,oc:a.oc+i.ordCostAmt,
    iq:a.iq+i.inQty,ia:a.ia+i.inAmt,
    sq:a.sq+i.saleQty,sa:a.sa+i.saleAmt,
    ta:a.ta+i.tagAmt,sp:a.sp+i.salePriceAmt,ca:a.ca+i.costAmt,
    cw:a.cw+i.cwAmt,pw:a.pw+i.pwAmt,cc:a.cc+i.cwCost,
    ma:a.ma+i.monthAmt,mq:a.mq+i.monthQty,
    si:a.si+i.shopInv,wh:a.wh+i.whAvail,ti:a.ti+i.totalInv,
    it:a.it+i.invTagAmt,ic:a.ic+i.invCostAmt,
  }),{sc:0,sk:0,oq:0,ot:0,oc:0,iq:0,ia:0,sq:0,sa:0,ta:0,sp:0,ca:0,cw:0,pw:0,cc:0,ma:0,mq:0,si:0,wh:0,ti:0,it:0,ic:0})
  const t=s(items),ct=s(compItems??[])
  const tSR=t.iq>0?Math.round(t.sq/t.iq*1000)/10:0
  const tIR=t.oq>0?Math.round(t.iq/t.oq*1000)/10:0
  const tDC=t.ta>0?Math.round((1-t.sp/t.ta)*1000)/10:0
  const _tCG=t.sa>0?Math.round(t.ca/t.sa*1000)/10:0
  const tWow=t.pw>0?Math.round((t.cw-t.pw)/t.pw*1000)/10:0
  const _tCwCg=t.cw>0?Math.round(t.cc/t.cw*1000)/10:0
  const tOcR=t.ot>0?Math.round(t.oc/t.ot*1000)/10:0
  const ctSR=ct.iq>0?Math.round(ct.sq/ct.iq*1000)/10:0

  const downloadExcel = () => {
    const rows = sorted.map(r => {
      const p = cm.get(r.item)
      const ocR = r.ordTagAmt > 0 ? Math.round(r.ordCostAmt / r.ordTagAmt * 1000) / 10 : 0
      return {
        '카테고리': r.category,
        '품목': r.item,
        '진단': r.diagnosis ? DIAG_BADGE[r.diagnosis]?.label : '',
        '스타일수': r.styleCnt,
        'SKU수': r.skuCnt,
        '발주수량': r.ordQty,
        '발주금액(택가)': r.ordTagAmt,
        '발주원가': r.ordCostAmt,
        '발주원가율': `${ocR}%`,
        '입고수량': r.inQty,
        '입고율': `${r.inboundRate}%`,
        '누적매출': r.saleAmt,
        '매출YoY': p?.saleAmt ? `${((r.saleAmt-p.saleAmt)/p.saleAmt*100).toFixed(0)}%` : '',
        '매출GAP': p?.saleAmt ? r.saleAmt - p.saleAmt : '',
        '판매수량': r.saleQty,
        '할인율': `${r.dcRate}%`,
        '원가율': `${r.cogsRate}%`,
        '판매율': `${r.salesRate}%`,
        '당월매출': r.monthAmt,
        '당월수량': r.monthQty,
        '전주매출': r.cwAmt,
        'WoW': r.pwAmt > 0 ? `${r.wow}%` : '',
        '전주수량': r.cwQty ?? 0,
        '전주원가율': `${(r.cwCogsRate ?? 0).toFixed(1)}%`,
        '총재고': r.totalInv,
        '재고금액(TAG)': r.invTagAmt,
        '재고원가': r.invCostAmt,
        '매장재고': r.shopInv,
        '창고재고': r.whAvail,
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '기획현황')
    XLSX.writeFile(wb, `기획현황판_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if(loading) return <div className="space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-8 bg-gray-100 rounded animate-pulse"/>)}</div>

  const H=({k,l}:{k:string;l:string})=>(
    <th className="py-1.5 px-1 text-right text-[11px] font-medium text-gray-500 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={()=>tog(k)}>
      <span className="inline-flex items-center gap-px">{l}<ArrowUpDown size={8} className={cn(sK===k?'opacity-100 text-brand-accent':'opacity-20')}/></span>
    </th>
  )
  const Y=({c,p}:{c:number;p?:number})=><td className={cn('py-1.5 px-0.5 text-right text-[10px] font-mono',yC(c,p??0))}>{yoy(c,p??0)??'—'}</td>
  const G=({c,p}:{c:number;p?:number})=><td className={cn('py-1.5 px-0.5 text-right text-[10px] font-mono',!p?'text-gray-300':c>=p?'text-emerald-600':'text-red-500')}>{p?`${c>=p?'+':''}${fmtM(c-p)}`:'—'}</td>

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={downloadExcel}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-subtle transition-colors">
          <Download size={13} /> Excel 다운로드
        </button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse" style={{minWidth:1800}}>
        <thead>
          <tr className="bg-gray-800 border-b-2 border-gray-900">
            <th colSpan={4} className="text-center text-[11px] text-gray-200 font-bold py-1.5">상품</th>
            <th colSpan={5} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-600">발주·입고</th>
            <th colSpan={5} className="text-center text-[11px] text-blue-300 font-bold py-1.5 border-l border-gray-600">누적 매출</th>
            <th colSpan={2} className="text-center text-[11px] text-cyan-300 font-bold py-1.5 border-l border-gray-600">당월</th>
            <th colSpan={3} className="text-center text-[11px] text-purple-300 font-bold py-1.5 border-l border-gray-600">주간 실적</th>
            <th colSpan={5} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-600">재고</th>
          </tr>
          <tr className="border-b border-surface-border bg-gray-50">
            <th className="py-1.5 px-1 text-left text-[11px] font-medium text-gray-500">카테고리</th>
            <th className="py-1.5 px-1 text-left text-[11px] font-medium text-gray-500 cursor-pointer" onClick={()=>tog('item')}>품목</th>
            <H k="styleCnt" l="ST"/>
            <H k="skuCnt" l="SKU"/>
            {/* 발주·입고 */}
            <H k="ordTagAmt" l="발주금액"/>
            <H k="ordCostAmt" l="원가"/>
            <th className="py-1.5 px-0.5 text-right text-[10px] text-gray-400">원가율</th>
            <H k="inQty" l="입고수량"/>
            <H k="inboundRate" l="입고율"/>
            {/* 누적 매출 */}
            <H k="saleAmt" l="매출"/>
            <th className="py-1.5 px-0.5 text-right text-[10px] text-gray-400">YoY</th>
            <th className="py-1.5 px-0.5 text-right text-[10px] text-gray-400">GAP</th>
            <H k="dcRate" l="할인율"/>
            <H k="salesRate" l="판매율"/>
            <th className="py-1.5 px-0.5 text-right text-[10px] text-gray-400">전년비</th>
            {/* 당월 */}
            <H k="monthAmt" l="매출"/>
            <H k="monthQty" l="수량"/>
            {/* 주간 */}
            <H k="cwAmt" l="매출"/>
            <th className="py-1.5 px-0.5 text-right text-[10px] text-gray-400">WoW</th>
            <th className="py-1.5 px-1 text-right text-[11px] text-gray-500">수량</th>
            {/* 재고 */}
            <H k="totalInv" l="총"/>
            <H k="invTagAmt" l="TAG"/>
            <H k="invCostAmt" l="원가"/>
            <H k="shopInv" l="매장"/>
            <th className="py-1.5 px-1 text-right text-[11px] font-medium text-gray-500">진단</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r,i)=>{
            const p=cm.get(r.item)
            const ocR=r.ordTagAmt>0?Math.round(r.ordCostAmt/r.ordTagAmt*1000)/10:0
            const sel=selectedItem===r.item
            const catColor = CATEGORY_COLORS[r.category]
            const diag = r.diagnosis ? DIAG_BADGE[r.diagnosis] : null
            return(
              <tr key={r.item} onClick={()=>onItemClick?.(r.item)}
                className={cn('border-b border-surface-border/50 transition-colors cursor-pointer',
                  sel?'bg-blue-50/60 hover:bg-blue-100/40':i%2===0?'bg-white hover:bg-surface-subtle':'bg-surface-subtle/30 hover:bg-surface-subtle')}>
                {/* 카테고리 */}
                <td className="py-1.5 px-1">
                  {catColor && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                      style={{ background: catColor.bg, color: catColor.text }}>{r.category}</span>
                  )}
                </td>
                <td className="py-1.5 px-1 font-semibold text-gray-900 whitespace-nowrap">{r.item}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-700">{r.styleCnt}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-500">{r.skuCnt}</td>
                {/* 발주·입고 */}
                <td className="py-1.5 px-1 text-right font-mono text-gray-700">{fmtM(r.ordTagAmt)}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-600">{fmtM(r.ordCostAmt)}</td>
                <td className="py-1.5 px-0.5 text-right text-gray-500 text-[10px]">{ocR}%</td>
                <td className="py-1.5 px-1 text-right font-mono text-green-700">{r.inQty.toLocaleString()}</td>
                <td className="py-1.5 px-1 text-right">
                  <span className={cn('px-1 py-px rounded-full text-[10px] font-semibold',
                    r.inboundRate>=90?'bg-green-100 text-green-700':r.inboundRate>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700')}>
                    {r.inboundRate}%
                  </span>
                </td>
                {/* 누적 매출 */}
                <td className="py-1.5 px-1 text-right font-mono font-semibold text-blue-600">{fmtM(r.saleAmt)}</td>
                <Y c={r.saleAmt} p={p?.saleAmt}/>
                <G c={r.saleAmt} p={p?.saleAmt}/>
                <td className="py-1.5 px-1 text-right text-gray-600 text-[10px]">{r.dcRate.toFixed(1)}%</td>
                <td className="py-1.5 px-1 text-right">
                  <span className={cn('px-1 py-px rounded-full text-[10px] font-semibold',
                    r.salesRate>=70?'bg-green-100 text-green-700':r.salesRate>=40?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700')}>
                    {r.salesRate}%
                  </span>
                </td>
                <td className="py-1.5 px-0.5 text-right text-[10px]">
                  {p?.salesRate != null ? (() => {
                    const diff = Math.round((r.salesRate - p.salesRate) * 10) / 10
                    return diff === 0 ? <span className="text-gray-400">0p</span> : <span className={cn('font-semibold', diff > 0 ? 'text-red-500' : 'text-blue-500')}>{diff > 0 ? '+' : ''}{diff}p</span>
                  })() : '—'}
                </td>
                {/* 당월 */}
                <td className="py-1.5 px-1 text-right font-mono text-cyan-700 font-semibold">{fmtM(r.monthAmt)}</td>
                <td className="py-1.5 px-1 text-right font-mono text-cyan-600">{r.monthQty.toLocaleString()}</td>
                {/* 주간 */}
                <td className="py-1.5 px-1 text-right font-mono text-purple-700 font-semibold">{fmtM(r.cwAmt)}</td>
                <td className={cn('py-1.5 px-0.5 text-right font-mono text-[10px]',r.wow>=0?'text-emerald-600':'text-red-500')}>{r.pwAmt>0?`${r.wow>=0?'+':''}${r.wow}%`:'—'}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-600">{(r.cwQty??0).toLocaleString()}</td>
                {/* 재고 */}
                <td className="py-1.5 px-1 text-right font-mono text-gray-700">{r.totalInv.toLocaleString()}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-600">{fmtM(r.invTagAmt)}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-500">{fmtM(r.invCostAmt)}</td>
                <td className="py-1.5 px-1 text-right font-mono text-gray-500">{r.shopInv.toLocaleString()}</td>
                {/* 진단 */}
                <td className="py-1.5 px-1 text-right">
                  {diag && (
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', diag.cls)}>{diag.label}</span>
                  )}
                </td>
              </tr>
            )
          })}
          {/* 합계 행 */}
          <tr className="bg-gray-50 font-semibold border-t-2 border-gray-300">
            <td className="py-1.5 px-1" />
            <td className="py-1.5 px-1 text-gray-900">합계</td>
            <td className="py-1.5 px-1 text-right">{t.sc}</td>
            <td className="py-1.5 px-1 text-right">{t.sk}</td>
            {/* 발주·입고 */}
            <td className="py-1.5 px-1 text-right">{fmtM(t.ot)}</td>
            <td className="py-1.5 px-1 text-right text-gray-700">{fmtM(t.oc)}</td>
            <td className="py-1.5 px-0.5 text-right text-gray-500 text-[10px]">{tOcR}%</td>
            <td className="py-1.5 px-1 text-right text-green-700">{t.iq.toLocaleString()}</td>
            <td className="py-1.5 px-1 text-right"><span className="px-1 py-px rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{tIR}%</span></td>
            {/* 누적 매출 */}
            <td className="py-1.5 px-1 text-right text-blue-700">{fmtM(t.sa)}</td>
            <Y c={t.sa} p={ct.sa}/>
            <G c={t.sa} p={ct.sa}/>
            <td className="py-1.5 px-1 text-right text-gray-700 text-[10px]">{tDC}%</td>
            <td className="py-1.5 px-1 text-right"><span className="px-1 py-px rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">{tSR}%</span></td>
            <td className="py-1.5 px-0.5 text-right text-[10px]">
              {ctSR > 0 ? (() => {
                const diff = Math.round((tSR - ctSR) * 10) / 10
                return diff === 0 ? <span className="text-gray-400">0p</span> : <span className={cn('font-semibold', diff > 0 ? 'text-red-500' : 'text-blue-500')}>{diff > 0 ? '+' : ''}{diff}p</span>
              })() : '—'}
            </td>
            {/* 당월 */}
            <td className="py-1.5 px-1 text-right text-cyan-700">{fmtM(t.ma)}</td>
            <td className="py-1.5 px-1 text-right">{t.mq.toLocaleString()}</td>
            {/* 주간 */}
            <td className="py-1.5 px-1 text-right text-purple-700">{fmtM(t.cw)}</td>
            <td className={cn('py-1.5 px-0.5 text-right font-mono text-[10px]',tWow>=0?'text-emerald-600':'text-red-500')}>{t.pw>0?`${tWow>=0?'+':''}${tWow}%`:'—'}</td>
            <td className="py-1.5 px-1 text-right">{items.reduce((s,i)=>s+(i.cwQty??0),0).toLocaleString()}</td>
            <td className="py-1.5 px-1 text-right">{t.ti.toLocaleString()}</td>
            <td className="py-1.5 px-1 text-right text-gray-700">{fmtM(t.it)}</td>
            <td className="py-1.5 px-1 text-right text-gray-700">{fmtM(t.ic)}</td>
            <td className="py-1.5 px-1 text-right text-gray-700">{t.si.toLocaleString()}</td>
            <td className="py-1.5 px-1" />
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  )
}
