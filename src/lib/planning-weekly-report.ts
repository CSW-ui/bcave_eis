export const WEEKLY_BRANDS = ['CO', 'LE', 'WA', 'CK', 'LK'] as const
export const WEEKLY_SEASONS = ['봄', '여름', '상반기', '가을', '겨울', '하반기', '스탠다드']
export interface ReportColor { code: string; name: string; orderQty: number }
export interface PlanningWeeklyProduct {
  brand: string; style: string; name: string; gender: string; item: string; season: string
  price: number; order: number; mainIn: number; reorderIn: number; inbound: number
  upcoming: number; sales: number; revenue: number; stock: number; transfer: number
  netInbound: number; orderAmount: number; inboundAmount: number; stockAmount: number
  mainInAmount: number; reorderInAmount: number; upcomingAmount: number
  sellThrough: number | null; weeks: number[]; colors: ReportColor[]
  trend: 'up' | 'down' | 'flat'; woh: number | null; poor: boolean
}
export interface PlanningWeeklyData {
  products: PlanningWeeklyProduct[]; weeks: { start: string; end: string; label: string }[]
  asOf: string; fetchedAt: string; inventoryBasis: string
}
export function koreaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function shiftDay(day: string, delta: number) {
  const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10)
}
export function lastClosedSunday(now = new Date()) {
  const today = koreaToday(now); const dow = new Date(today + 'T00:00:00Z').getUTCDay()
  return shiftDay(today, -(dow || 7))
}
export function validReportDate(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day
}
export function reportWeeks(asOf: string) {
  return Array.from({ length: 12 }, (_, i) => {
    const end = shiftDay(asOf, -(11 - i) * 7), start = shiftDay(end, -6)
    return { start, end, label: end.slice(5).replace('-', '/') }
  })
}
export function weeklyQuery(brands: string[], year: string, seasons: string[], asOf: string) {
  if (!brands.length || brands.some(b => !(WEEKLY_BRANDS as readonly string[]).includes(b))) throw new Error('브랜드 확인 필요')
  if (!/^\d{2}$/.test(year) || Number(year) < 25 || Number(year) > 99) throw new Error('연도 확인 필요')
  if (!seasons.length || seasons.some(s => !WEEKLY_SEASONS.includes(s))) throw new Error('시즌 확인 필요')
  if (!validReportDate(asOf) || asOf < '2025-01-01') throw new Error('기준일 확인 필요')
  const cutoff = asOf.replaceAll('-', ''), weeks = reportWeeks(asOf)
  const brandSQL = brands.map(b => `'${b}'`).join(','), seasonSQL = seasons.map(s => `'${s}'`).join(',')
  return `WITH eligible AS (
    SELECT STYLECD, MAX(BRANDCD) BRANDCD, MAX(STYLENM) STYLENM, MAX(GENDERNM) GENDERNM,
      MAX(ITEMNM) ITEMNM, MAX(SEASONNM) SEASONNM, MAX(TAGPRICE) TAGPRICE
    FROM BCAVE.SEWON.SW_STYLEINFO
    WHERE BRANDCD IN (${brandSQL}) AND YEARCD='${year}' AND SEASONNM IN (${seasonSQL})
    GROUP BY STYLECD
  ), orders_by_batch AS (
    SELECT d.STYLECD, d.COLORCD, d.CHASU, MAX(d.COLORNM) COLORNM, SUM(d.ORDQTY) ORD_QTY,
      SUM(d.ORDQTY*d.TAGPRICE/1.1) ORD_AMT
    FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d JOIN eligible e ON e.STYLECD=d.STYLECD AND e.BRANDCD=d.BRANDCD
    WHERE d.ORDDT <= '${cutoff}' GROUP BY d.STYLECD, d.COLORCD, d.CHASU
  ), inbound_by_batch AS (
    SELECT w.STYLECD, w.COLORCD, w.CHASU, SUM(w.INQTY) IN_QTY
    FROM BCAVE.SEWON.SW_WHININFO w JOIN eligible e ON e.STYLECD=w.STYLECD
    WHERE w.WHINDT <= '${cutoff}' GROUP BY w.STYLECD,w.COLORCD,w.CHASU
  ), order_totals AS (
    SELECT o.STYLECD, SUM(o.ORD_QTY) ORD_QTY, SUM(o.ORD_AMT) ORD_AMT,
      SUM(CASE WHEN o.CHASU <> '01' THEN GREATEST(o.ORD_QTY-COALESCE(i.IN_QTY,0),0) ELSE 0 END) UPCOMING
    FROM orders_by_batch o LEFT JOIN inbound_by_batch i
      ON o.STYLECD=i.STYLECD AND o.COLORCD=i.COLORCD AND o.CHASU=i.CHASU GROUP BY o.STYLECD
  ), color_totals AS (
    SELECT STYLECD,COLORCD,MAX(COLORNM) COLORNM,SUM(ORD_QTY) ORD_QTY FROM orders_by_batch GROUP BY STYLECD,COLORCD
  ), colors AS (
    SELECT STYLECD,ARRAY_AGG(OBJECT_CONSTRUCT('code',COLORCD,'name',COLORNM,'orderQty',ORD_QTY))
      WITHIN GROUP (ORDER BY ORD_QTY DESC,COLORCD) COLORS FROM color_totals GROUP BY STYLECD
  ), inbound AS (
    SELECT STYLECD,SUM(IN_QTY) IN_QTY,
      SUM(CASE WHEN CHASU='01' THEN IN_QTY ELSE 0 END) MAIN_IN,
      SUM(CASE WHEN CHASU<>'01' OR CHASU IS NULL THEN IN_QTY ELSE 0 END) RE_IN
    FROM inbound_by_batch GROUP BY STYLECD
  ), sales AS (
    SELECT v.STYLECD,SUM(v.SALEQTY) SALE_QTY,SUM(v.SALEAMT_VAT_EX) SALE_AMT,
      ${weeks.map((w,i)=>`SUM(CASE WHEN v.SALEDT BETWEEN '${w.start.replaceAll('-','')}' AND '${w.end.replaceAll('-','')}' THEN v.SALEQTY ELSE 0 END) W${i}`).join(',\n      ')}
    FROM BCAVE.SEWON.VW_SALES_VAT v JOIN eligible e ON e.STYLECD=v.STYLECD AND e.BRANDCD=v.BRANDCD
    WHERE v.SALEDT BETWEEN '20250101' AND '${cutoff}' AND v.SHOPCD NOT IN ('B6055','B6057','B6063') GROUP BY v.STYLECD
  ), transfers AS (
    SELECT v.STYLECD,SUM(v.SALEQTY) TRF_QTY
    FROM BCAVE.SEWON.VW_SALES_VAT v JOIN eligible e ON e.STYLECD=v.STYLECD AND e.BRANDCD=v.BRANDCD
    WHERE v.SALEDT BETWEEN '20250101' AND '${cutoff}' AND v.SHOPCD IN ('B6055','B6057','B6063') GROUP BY v.STYLECD
  ), inventory AS (
    SELECT x.STYLECD,SUM(x.QTY) STOCK FROM (
      SELECT i.STYLECD,SUM(i.INVQTY) QTY FROM BCAVE.SEWON.SW_SHOPINV i JOIN eligible e ON e.STYLECD=i.STYLECD GROUP BY i.STYLECD
      UNION ALL
      SELECT i.STYLECD,SUM(i.AVAILQTY) QTY FROM BCAVE.SEWON.SW_WHINV i JOIN eligible e ON e.STYLECD=i.STYLECD GROUP BY i.STYLECD
    ) x GROUP BY x.STYLECD
  )
  SELECT e.*,COALESCE(o.ORD_QTY,0) ORD_QTY,COALESCE(o.ORD_AMT,0) ORD_AMT,
    COALESCE(o.UPCOMING,0) UPCOMING,COALESCE(i.IN_QTY,0) IN_QTY,COALESCE(i.MAIN_IN,0) MAIN_IN,
    COALESCE(i.RE_IN,0) RE_IN,COALESCE(s.SALE_QTY,0) SALE_QTY,COALESCE(s.SALE_AMT,0) SALE_AMT,
    COALESCE(t.TRF_QTY,0) TRF_QTY,COALESCE(v.STOCK,0) STOCK,c.COLORS,
    ${weeks.map((_,i)=>`COALESCE(s.W${i},0) W${i}`).join(',')}
  FROM eligible e LEFT JOIN order_totals o ON e.STYLECD=o.STYLECD LEFT JOIN inbound i ON e.STYLECD=i.STYLECD
    LEFT JOIN sales s ON e.STYLECD=s.STYLECD LEFT JOIN transfers t ON e.STYLECD=t.STYLECD
    LEFT JOIN inventory v ON e.STYLECD=v.STYLECD LEFT JOIN colors c ON e.STYLECD=c.STYLECD
  ORDER BY SALE_AMT DESC,e.STYLECD`
}
export function toWeeklyProduct(row: Record<string, unknown>): PlanningWeeklyProduct {
  const n = (k: string) => Number(row[k] ?? 0)
  const inbound=n('IN_QTY'), transfer=n('TRF_QTY'), netInbound=inbound-transfer, stock=n('STOCK')
  const weeks=Array.from({length:12},(_,i)=>n('W'+i)), recent=weeks.slice(-4).reduce((a,b)=>a+b,0)/4
  const current=weeks.slice(-2).reduce((a,b)=>a+b,0), previous=weeks.slice(-4,-2).reduce((a,b)=>a+b,0)
  const woh=recent>0?stock/recent:null, tagEx=n('TAGPRICE')/1.1
  let colors: ReportColor[]=[]
  if(row.COLORS) colors=(typeof row.COLORS==='string'?JSON.parse(row.COLORS):row.COLORS) as ReportColor[]
  return { brand:String(row.BRANDCD),style:String(row.STYLECD),name:String(row.STYLENM??''),
    gender:String(row.GENDERNM??'미분류'),item:String(row.ITEMNM??'미분류'),season:String(row.SEASONNM??''),
    price:n('TAGPRICE'),order:n('ORD_QTY'),mainIn:n('MAIN_IN'),reorderIn:n('RE_IN'),inbound,
    upcoming:n('UPCOMING'),sales:n('SALE_QTY'),revenue:n('SALE_AMT'),stock,transfer,netInbound,
    orderAmount:n('ORD_AMT'),inboundAmount:inbound*tagEx,stockAmount:stock*tagEx,
    mainInAmount:n('MAIN_IN')*tagEx,reorderInAmount:n('RE_IN')*tagEx,upcomingAmount:n('UPCOMING')*tagEx,
    sellThrough:netInbound>0?n('SALE_QTY')/netInbound:null,weeks,colors,
    trend:current>previous?'up':current<previous?'down':'flat',woh,
    poor:stock>0&&inbound>0&&(recent<=0||(woh!==null&&woh>=40)) }
}
