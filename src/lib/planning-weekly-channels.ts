import { reportWeeks, validReportDate, WEEKLY_BRANDS } from './planning-weekly-report'

export interface WeeklyChannel {
  channel: string; revenue: number; qty: number; revenueShare: number | null; discountRate: number | null
  weekRevenue: number; weekQty: number; previousRevenue: number; wow: number | null
  weeks: { revenue: number; qty: number }[]
}
export interface WeeklyChannelData {
  brand: string; style: string; asOf: string; weekStart: string; channels: WeeklyChannel[]
  weeks: { start: string; end: string; label: string }[]
}
export function weeklyChannelQuery(brand: string, style: string, asOf: string) {
  if (!(WEEKLY_BRANDS as readonly string[]).includes(brand)) throw new Error('Invalid brand')
  if (!/^[A-Z0-9_-]{6,30}$/.test(style) || !style.startsWith(brand)) throw new Error('Invalid style')
  if (!validReportDate(asOf) || asOf < '2025-01-05' || new Date(asOf).getUTCDay() !== 0) throw new Error('Invalid closing date')
  const weeks = reportWeeks(asOf)
  return `SELECT COALESCE(NULLIF(TRIM(v.SHOPTYPENM),''),'미분류') CHANNEL,
    SUM(v.SALEAMT_VAT_EX) REVENUE,SUM(v.SALEQTY) QTY,
    SUM(v.TAGPRICE*v.SALEQTY) TAG_AMOUNT,
    COUNT_IF(v.SALEQTY <> 0 AND (v.TAGPRICE IS NULL OR v.TAGPRICE <= 0)) TAG_MISSING_COUNT,
    ${weeks.map((w,i) => `SUM(CASE WHEN v.SALEDT BETWEEN '${w.start.replaceAll('-','')}' AND '${w.end.replaceAll('-','')}' THEN v.SALEAMT_VAT_EX ELSE 0 END) W${i}_REVENUE,
    SUM(CASE WHEN v.SALEDT BETWEEN '${w.start.replaceAll('-','')}' AND '${w.end.replaceAll('-','')}' THEN v.SALEQTY ELSE 0 END) W${i}_QTY`).join(',\n    ')}
    FROM BCAVE.SEWON.VW_SALES_VAT v
    WHERE v.BRANDCD='${brand}' AND v.STYLECD='${style}'
      AND v.SALEDT BETWEEN '20250101' AND '${asOf.replaceAll('-','')}'
      AND v.SHOPCD NOT IN ('B6055','B6057','B6063')
    GROUP BY COALESCE(NULLIF(TRIM(v.SHOPTYPENM),''),'미분류')
    ORDER BY REVENUE DESC,CHANNEL`
}
export function toWeeklyChannels(rows: Record<string, unknown>[]): WeeklyChannel[] {
  const total = rows.reduce((a,r) => a+Number(r.REVENUE ?? 0),0)
  return rows.map(r => {
    const n=(key:string)=>Number(r[key]??0), revenue=n('REVENUE'),qty=n('QTY'),tag=n('TAG_AMOUNT')
    const weeks=Array.from({length:12},(_,i)=>({revenue:n(`W${i}_REVENUE`),qty:n(`W${i}_QTY`)}))
    const weekRevenue=weeks[11].revenue,previousRevenue=weeks[10].revenue
    return {channel:String(r.CHANNEL??'미분류'),revenue,qty,revenueShare:total>0?revenue/total:null,
      discountRate:qty>0&&tag>0&&n('TAG_MISSING_COUNT')===0?1-revenue*1.1/tag:null,
      weekRevenue,weekQty:weeks[11].qty,previousRevenue,wow:previousRevenue>0?(weekRevenue-previousRevenue)/previousRevenue:null,weeks}
  })
}
