import { shiftDay, weeklyQuery, toWeeklyProduct, type PlanningWeeklyProduct } from './planning-weekly-report'
export type Bucket={q:number;a:number;bq:number;ba:number;inbound:number;transfer:number;tag:number;missing:number}
export type WeeklySalesProduct=PlanningWeeklyProduct & {history:Record<string,Bucket>;firstSale:string|null}
export type WeeklySalesData={products:WeeklySalesProduct[];weeks:ReturnType<typeof salesWeeks>;asOf:string;fetchedAt:string}
export function salesWeeks(asOf:string){return Array.from({length:13},(_,i)=>{const end=shiftDay(asOf,-(12-i)*7);return {start:shiftDay(end,-6),end,label:end.slice(5).replace('-','/')}})}
export function weeklySalesQuery(brands:string[],year:string,seasons:string[],asOf:string){
 const base=weeklyQuery(brands,year,seasons,asOf),first=salesWeeks(asOf)[0].start,cutoff=asOf.replaceAll('-','')
 const bucket=`GREATEST(-2,FLOOR(DATEDIFF('day',TO_DATE('${first}'),TO_DATE(DAY,'YYYYMMDD'))/7))`
 return `WITH base AS (${base}), events AS (
 SELECT v.STYLECD,v.SALEDT DAY,
 IFF(v.SHOPCD IN ('B6055','B6057','B6063'),0,v.SALEQTY) Q,
 IFF(v.SHOPCD IN ('B6055','B6057','B6063'),0,v.SALEAMT_VAT_EX) A,
 IFF(v.SHOPTYPENM='온라인B2B' AND v.SHOPCD NOT IN ('B6055','B6057','B6063'),v.SALEQTY,0) BQ,
 IFF(v.SHOPTYPENM='온라인B2B' AND v.SHOPCD NOT IN ('B6055','B6057','B6063'),v.SALEAMT_VAT_EX,0) BA,
 0 INBOUND,IFF(v.SHOPCD IN ('B6055','B6057','B6063'),v.SALEQTY,0) TRANSFER,
 IFF(v.SHOPCD IN ('B6055','B6057','B6063'),0,v.TAGPRICE*v.SALEQTY) TAG,
 IFF(v.SHOPCD NOT IN ('B6055','B6057','B6063') AND v.SALEQTY<>0 AND (v.TAGPRICE IS NULL OR v.TAGPRICE<=0),1,0) MISSING
 FROM BCAVE.SEWON.VW_SALES_VAT v JOIN base e ON e.STYLECD=v.STYLECD AND e.BRANDCD=v.BRANDCD
 WHERE v.SALEDT BETWEEN '20250101' AND '${cutoff}'
 UNION ALL SELECT w.STYLECD,w.WHINDT,0,0,0,0,w.INQTY,0,0,0
 FROM BCAVE.SEWON.SW_WHININFO w JOIN base e ON e.STYLECD=w.STYLECD WHERE w.WHINDT<='${cutoff}'
 ), buckets AS (SELECT STYLECD,${bucket} IDX,SUM(Q) Q,SUM(A) A,SUM(BQ) BQ,SUM(BA) BA,SUM(INBOUND) INBOUND,SUM(TRANSFER) TRANSFER,SUM(TAG) TAG,SUM(MISSING) MISSING FROM events GROUP BY STYLECD,IDX),
 history AS (SELECT STYLECD,OBJECT_AGG(TO_VARCHAR(IDX),OBJECT_CONSTRUCT('q',Q,'a',A,'bq',BQ,'ba',BA,'inbound',INBOUND,'transfer',TRANSFER,'tag',TAG,'missing',MISSING)) HISTORY FROM buckets GROUP BY STYLECD),
 first_sales AS (SELECT STYLECD,MIN(IFF(Q>0,DAY,NULL)) FIRST_SALE FROM events GROUP BY STYLECD)
 SELECT b.*,h.HISTORY,f.FIRST_SALE FROM base b LEFT JOIN history h ON h.STYLECD=b.STYLECD LEFT JOIN first_sales f ON f.STYLECD=b.STYLECD`
}
export function toWeeklySalesProduct(row:Record<string,unknown>):WeeklySalesProduct{return {...toWeeklyProduct(row),history:(typeof row.HISTORY==='string'?JSON.parse(row.HISTORY):row.HISTORY)||{},firstSale:row.FIRST_SALE?String(row.FIRST_SALE):null}}
const empty=():Bucket=>({q:0,a:0,bq:0,ba:0,inbound:0,transfer:0,tag:0,missing:0})
export function change(current:number,previous:number){return previous>0?(current-previous)/previous:null}
export function weeklyMetric(p:WeeklySalesProduct,index:number,includeB2B:boolean,mode:'q'|'a',weeks:ReturnType<typeof salesWeeks>){
 const at=(i:number)=>p.history[String(i)]||empty(),cur=at(index),prev=at(index-1),cum=empty()
 for(const [k,b] of Object.entries(p.history))if(Number(k)<=index)for(const key of Object.keys(cum) as (keyof Bucket)[])cum[key]+=Number(b[key]||0)
 const value=(b:Bucket)=>mode==='q'?b.q-(includeB2B?0:b.bq):b.a-(includeB2B?0:b.ba)
 const tw=value(cur),pw=value(prev),qty=cur.q-(includeB2B?0:cur.bq),prevQty=prev.q-(includeB2B?0:prev.bq),delta=tw-pw,rate=change(tw,pw)
 const qtyRate=change(qty,prevQty),short=qty>0&&p.stock<qty
 const isNew=!!p.firstSale&&p.firstSale>=shiftDay(weeks[index].start,-7).replaceAll('-','')&&p.firstSale<=weeks[index].end.replaceAll('-','')
 const trend=isNew?'new':short?'short':Math.max(qty,prevQty)>=30&&qtyRate!==null?(qtyRate>=.2?'up':qtyRate<=-.2?'down':'flat'):'flat'
 const netInbound=cum.inbound-cum.transfer,pace=(qty+prevQty)/2
 return {p,tw,pw,delta,rate,qty,trend,cum,short,woh:pace>0?p.stock/pace:null,sellThrough:netInbound>0?cum.q/netInbound:null,netInbound,weeklyInbound:cur.inbound,discount:cum.q>0&&cum.tag>0&&cum.missing===0?1-cum.a*1.1/cum.tag:null,values:weeks.map((_,i)=>value(at(i)))}
}
export type WeeklyMetric=ReturnType<typeof weeklyMetric>
