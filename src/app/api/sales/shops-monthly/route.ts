import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// 목표/캐시 영향 없이 항상 최신 집계
export const dynamic = 'force-dynamic'

// GET /api/sales/shops-monthly?year=2026&brands=all&channels=백화점,직영점
//   매장(SHOPCD×브랜드×채널)별 · 월별 · 정상(N)/이월(C) 매출·수량·TAG
//   → 클라이언트에서 전체(T=N+C)·전월비·할인율 파생
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brands') || 'all'
  const { valid, inClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brands' }, { status: 400 })

  const year = (searchParams.get('year') || '2026').replace(/[^0-9]/g, '').slice(0, 4)
  if (!/^\d{4}$/.test(year)) return NextResponse.json({ error: 'year는 YYYY 형식이어야 합니다.' }, { status: 400 })
  const lyYear = String(Number(year) - 1)

  const channels = (searchParams.get('channels') || '').split(',').filter(Boolean)
  const channelClause = channels.length > 0
    ? `AND v.SHOPTYPENM IN (${channels.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`
    : ''

  // 정상(N)=상품연차가 그 판매연도와 일치 / 이월(C)=그 외 (연도무관 — 금년·전년 모두 각자 기준 분류)
  const vin = `CASE WHEN sti.YEARCD = SUBSTRING(v.SALEDT, 3, 2) THEN 'N' ELSE 'C' END`

  const sql = `
    SELECT v.SHOPCD, v.BRANDCD, v.SHOPTYPENM,
      MAX(si.SHOPNM) as SHOPNM, MAX(si.AREANM) as AREANM,
      SUBSTRING(v.SALEDT, 1, 4) as YR,
      CAST(SUBSTRING(v.SALEDT, 5, 2) AS INT) as MM,
      ${vin} as VIN,
      SUM(v.SALEAMT_VAT_EX) as REV,
      SUM(v.SALEQTY) as QTY,
      SUM((sti.TAGPRICE / 1.1) * v.SALEQTY) as TAG
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON v.SHOPCD = si.SHOPCD
    LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE v.BRANDCD IN ${inClause}
      AND v.SALEDT BETWEEN '${lyYear}0101' AND '${year}1231'
      ${channelClause}
    GROUP BY v.SHOPCD, v.BRANDCD, v.SHOPTYPENM, YR, MM, ${vin}
    HAVING SUM(v.SALEAMT_VAT_EX) <> 0 OR SUM(v.SALEQTY) <> 0
  `

  try {
    const rows = await snowflakeQuery<Record<string, string>>(sql)

    // rev/qty/tag=금년, lyRev=전년 동월 매출
    type VinData = { rev: Record<number, number>; qty: Record<number, number>; tag: Record<number, number>; lyRev: Record<number, number> }
    type ShopAgg = {
      shopCd: string; shopNm: string; area: string; brandcd: string; channel: string
      n: VinData; c: VinData
    }
    const blank = (): VinData => ({ rev: {}, qty: {}, tag: {}, lyRev: {} })
    const shops = new Map<string, ShopAgg>()
    let maxMonth = 0

    for (const r of rows) {
      const shopCd = r.SHOPCD ?? ''
      const brandcd = r.BRANDCD ?? ''
      const channel = r.SHOPTYPENM ?? ''
      const key = `${shopCd}|${brandcd}|${channel}`
      let o = shops.get(key)
      if (!o) {
        o = { shopCd, shopNm: r.SHOPNM ?? shopCd, area: r.AREANM ?? '', brandcd, channel, n: blank(), c: blank() }
        shops.set(key, o)
      }
      const mm = Number(r.MM)
      const vd = r.VIN === 'N' ? o.n : o.c
      if (r.YR === year) {
        vd.rev[mm] = (vd.rev[mm] || 0) + (Number(r.REV) || 0)
        vd.qty[mm] = (vd.qty[mm] || 0) + (Number(r.QTY) || 0)
        vd.tag[mm] = (vd.tag[mm] || 0) + (Number(r.TAG) || 0)
        if (mm > maxMonth) maxMonth = mm
      } else {
        vd.lyRev[mm] = (vd.lyRev[mm] || 0) + (Number(r.REV) || 0)
      }
    }

    const total = (o: ShopAgg) => Object.values(o.n.rev).reduce((s, v) => s + v, 0) + Object.values(o.c.rev).reduce((s, v) => s + v, 0)
    const list = Array.from(shops.values()).filter(s => total(s) > 0)
    return NextResponse.json({ maxMonth, shops: list, meta: { year, lyYear } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
