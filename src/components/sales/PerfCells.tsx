'use client'

import { cn } from '@/lib/utils'
import { fmtM, fmtPctF, fmtPctI, fmtPctS } from '@/lib/formatters'
import type { PerfMetrics } from '@/lib/sales-types'

// 영업 현황 테이블의 각 열 셀 렌더링
export function PerfCells({ m }: { m: PerfMetrics }) {
  return (
    <>
      <td className="px-1 py-2 text-right font-mono text-gray-500">{m.target != null ? fmtM(m.target) : '—'}</td>
      <td className="px-1 py-2 text-right font-mono font-semibold text-gray-800">{fmtM(m.mtdRev)}</td>
      <td className={cn('px-2 py-2 text-right font-semibold',
        m.achPct == null ? 'text-gray-300' :
        m.achPct >= 100 ? 'text-emerald-600' :
        m.achPct >= 80 ? 'text-amber-500' : 'text-red-500')}>
        {fmtPctI(m.achPct)}
      </td>
      <td className="px-1 py-2 text-right text-gray-600">{fmtPctF(m.mtdDc)}</td>
      <td className="px-1 py-2 text-right text-gray-600">{fmtPctF(m.mtdCogs)}</td>
      <td className="px-1 py-2 text-right font-mono text-gray-600 border-l border-gray-100">{fmtM(m.cwRev)}</td>
      <td className={cn('px-2 py-2 text-right font-mono', m.wow >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtM(m.wow)}</td>
      <td className={cn('px-2 py-2 text-right', m.wowPct == null ? 'text-gray-300' : m.wowPct >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtPctI(m.wowPct)}</td>
      <td className={cn('px-2 py-2 text-right font-mono', m.cwYoy >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtM(m.cwYoy)}</td>
      <td className={cn('px-2 py-2 text-right', m.cwYoyPct == null ? 'text-gray-300' : m.cwYoyPct >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtPctI(m.cwYoyPct)}</td>
      <td className="px-1 py-2 text-right text-gray-600">{fmtPctF(m.cwDc)}</td>
      <td className="px-1 py-2 text-right text-gray-600">{fmtPctF(m.cwCogs)}</td>
      <td className={cn('px-2 py-2 text-right font-mono border-l border-gray-100', m.yoy >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtM(m.yoy)}</td>
      <td className={cn('px-2 py-2 text-right', m.yoyPct == null ? 'text-gray-300' : m.yoyPct >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtPctI(m.yoyPct)}</td>
      <td className={cn('px-2 py-2 text-right', m.dcChg >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtPctS(m.dcChg)}</td>
      <td className={cn('px-2 py-2 text-right', m.cogsChg >= 0 ? 'text-red-500' : 'text-blue-500')}>{fmtPctS(m.cogsChg)}</td>
      {(() => {
        const grossProfit = m.mtdRev - (m.mtdRev * m.mtdCogs / 100)
        const grossProfitRate = m.mtdRev > 0 ? Math.round((1 - m.mtdCogs / 100) * 1000) / 10 : 0
        const lyCogs = m.mtdCogs - m.cogsChg
        const lyGrossProfit = m.lyMtdRev - (m.lyMtdRev * lyCogs / 100)
        const gap = grossProfit - lyGrossProfit
        return (<>
          <td className="px-1 py-2 text-right font-mono font-semibold text-gray-800 border-l border-gray-100">{fmtM(grossProfit)}</td>
          <td className={cn('px-1 py-2 text-right font-semibold', grossProfitRate >= 70 ? 'text-emerald-600' : grossProfitRate >= 60 ? 'text-amber-500' : 'text-red-500')}>
            {grossProfitRate.toFixed(1)}%
          </td>
          <td className={cn('px-1 py-2 text-right font-mono', m.lyMtdRev > 0 ? (gap >= 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-300')}>
            {m.lyMtdRev > 0 ? `${gap >= 0 ? '+' : ''}${fmtM(gap)}` : '—'}
          </td>
        </>)
      })()}
    </>
  )
}

export const PERF_GROUP_HEADER = (
  <tr className="bg-gray-100 border-b border-gray-200 text-[10px] text-gray-500 font-bold uppercase">
    <th className="sticky left-0 bg-gray-100 z-30"></th>
    <th colSpan={5} className="text-center py-1">월 누적</th>
    <th colSpan={7} className="text-center py-1 border-l border-gray-200">주간 실적</th>
    <th colSpan={4} className="text-center py-1 border-l border-gray-200">전년대비 (월 누적)</th>
    <th colSpan={3} className="text-center py-1 border-l border-gray-200">매출이익 (월 누적)</th>
  </tr>
)

export const PERF_HEADER_COLS = (
  <>
    <th className="text-right px-1 py-2 w-[62px]">목표</th>
    <th className="text-right px-1 py-2 w-[62px]">실적</th>
    <th className="text-right px-1 py-2 w-[42px]">ACH%</th>
    <th className="text-right px-1 py-2 w-[40px]">할인율</th>
    <th className="text-right px-1 py-2 w-[48px]">원가율</th>
    <th className="text-right px-1 py-2 w-[62px] border-l border-gray-200">주간실적</th>
    <th className="text-right px-1 py-2 w-[52px]">WoW</th>
    <th className="text-right px-1 py-2 w-[44px]">WoW%</th>
    <th className="text-right px-1 py-2 w-[52px]">YoY</th>
    <th className="text-right px-1 py-2 w-[44px]">YoY%</th>
    <th className="text-right px-1 py-2 w-[40px]">할인율</th>
    <th className="text-right px-1 py-2 w-[48px]">원가율</th>
    <th className="text-right px-1 py-2 w-[52px] border-l border-gray-200">YoY</th>
    <th className="text-right px-1 py-2 w-[44px]">YoY%</th>
    <th className="text-right px-1 py-2 w-[44px]">할인율±</th>
    <th className="text-right px-1 py-2 w-[48px]">원가율±</th>
    <th className="text-right px-1 py-2 w-[52px] border-l border-gray-200">매출이익</th>
    <th className="text-right px-1 py-2 w-[48px]">이익률</th>
    <th className="text-right px-1 py-2 w-[48px]">YoY GAP</th>
  </>
)
