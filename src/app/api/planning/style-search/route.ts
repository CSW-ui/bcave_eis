import { NextResponse } from 'next/server'
import { snowflakeQuery, parseBrandParam } from '@/lib/snowflake'

// GET /api/planning/style-search?brands=all&year=26&seasons=봄,여름&item=&q=&from=20260501&to=20260520
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brands') || 'all'
  const { valid, inClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brands' }, { status: 400 })

  const year = (searchParams.get('year') || '').replace(/[^0-9]/g, '').slice(0, 4)
  const seasons = (searchParams.get('seasons') || '').split(',').filter(Boolean)
  const item = (searchParams.get('item') || '').trim()
  const q = (searchParams.get('q') || '').trim()

  const from = (searchParams.get('from') || '').replace(/[^0-9]/g, '')
  const to = (searchParams.get('to') || '').replace(/[^0-9]/g, '')
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYYMMDD' }, { status: 400 })
  }
  if (from > to) return NextResponse.json({ error: 'from > to' }, { status: 400 })

  // WoS용 최근 4주
  const toD = new Date(Number(to.slice(0,4)), Number(to.slice(4,6))-1, Number(to.slice(6,8)))
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const last4wStart = fmt(new Date(toD.getTime() - 27 * 86400000))

  const siBrand = `si.BRANDCD IN ${inClause}`
  const yearClause = year ? `AND si.YEARCD = '${year}'` : ''
  const seasonClause = seasons.length > 0
    ? `AND si.SEASONNM IN (${seasons.map(s => `'${s.replace(/'/g, "''")}'`).join(',')})`
    : ''
  const itemClause = item ? `AND si.ITEMNM = '${item.replace(/'/g, "''")}'` : ''
  const qSafe = q.replace(/'/g, "''")
  const qClause = q
    ? `AND (si.STYLECD ILIKE '%${qSafe}%' OR si.STYLENM ILIKE '%${qSafe}%')`
    : ''

  // 후보 스타일 (LIMIT 적용)
  const sql = `
    WITH base_styles AS (
      SELECT DISTINCT si.STYLECD, MAX(si.STYLENM) as STYLENM, MAX(si.BRANDCD) as BRANDCD,
        MAX(si.ITEMNM) as ITEMNM, MAX(si.YEARCD) as YEARCD, MAX(si.SEASONNM) as SEASONNM,
        MAX(si.TAGPRICE) as TAGPRICE, MAX(si.PRODCOST) as PRODCOST
      FROM BCAVE.SEWON.SW_STYLEINFO si
      WHERE ${siBrand}
        ${yearClause}
        ${seasonClause}
        ${itemClause}
        ${qClause}
      GROUP BY si.STYLECD
      LIMIT 1000
    ),
    sale_agg AS (
      -- 매장매출 (워크인) = SALETYPE in (NULL,'정상') × PRICETYPE in (NULL,'정상','할인','균일')
      -- 기타매출 = 워크인 외 모든 매출 (단, 맞교환·예약(완불) 제외)
      SELECT STYLECD,
        SUM(SALEQTY) as QTY,
        SUM(SALEAMT) / 1.1 as REV,
        SUM(CASE WHEN
          (SALETYPENM IS NULL OR SALETYPENM = '정상')
          AND (PRICETYPENM IS NULL OR PRICETYPENM IN ('정상','할인','균일'))
          THEN SALEAMT ELSE 0 END) / 1.1 as STORE_REV,
        SUM(CASE WHEN NOT (
          (SALETYPENM IS NULL OR SALETYPENM = '정상')
          AND (PRICETYPENM IS NULL OR PRICETYPENM IN ('정상','할인','균일'))
        ) AND (SALETYPENM IS NULL OR SALETYPENM NOT IN ('맞교환','예약(완불)'))
          THEN SALEAMT ELSE 0 END) / 1.1 as OTHER_REV
      FROM BCAVE.SEWON.SW_SALEINFO
      WHERE STYLECD IN (SELECT STYLECD FROM base_styles)
        AND SALEDT BETWEEN '${from}' AND '${to}'
      GROUP BY STYLECD
    ),
    last4w_agg AS (
      SELECT STYLECD, SUM(SALEQTY) as QTY_4W
      FROM BCAVE.SEWON.SW_SALEINFO
      WHERE STYLECD IN (SELECT STYLECD FROM base_styles)
        AND SALEDT BETWEEN '${last4wStart}' AND '${to}'
      GROUP BY STYLECD
    ),
    shopinv_agg AS (
      SELECT STYLECD, SUM(INVQTY) as SHOP_INV
      FROM BCAVE.SEWON.SW_SHOPINV
      WHERE STYLECD IN (SELECT STYLECD FROM base_styles)
      GROUP BY STYLECD
    ),
    whinv_agg AS (
      SELECT STYLECD, SUM(AVAILQTY) as WH_INV
      FROM BCAVE.SEWON.SW_WHINV
      WHERE STYLECD IN (SELECT STYLECD FROM base_styles)
      GROUP BY STYLECD
    )
    SELECT b.STYLECD, b.STYLENM, b.BRANDCD, b.ITEMNM, b.YEARCD, b.SEASONNM,
      b.TAGPRICE / 1.1 as TAGPRICE,
      COALESCE(s.QTY, 0) as QTY,
      COALESCE(s.REV, 0) as REV,
      COALESCE(s.STORE_REV, 0) as STORE_REV,
      COALESCE(s.OTHER_REV, 0) as OTHER_REV,
      COALESCE(l.QTY_4W, 0) as QTY_4W,
      COALESCE(si.SHOP_INV, 0) as SHOP_INV,
      COALESCE(w.WH_INV, 0) as WH_INV
    FROM base_styles b
    LEFT JOIN sale_agg s ON b.STYLECD = s.STYLECD
    LEFT JOIN last4w_agg l ON b.STYLECD = l.STYLECD
    LEFT JOIN shopinv_agg si ON b.STYLECD = si.STYLECD
    LEFT JOIN whinv_agg w ON b.STYLECD = w.STYLECD
    ORDER BY REV DESC
  `

  try {
    const rows = await snowflakeQuery<Record<string, string>>(sql)
    const styles = rows.map(r => {
      const qty = Number(r.QTY) || 0
      const rev = Number(r.REV) || 0
      const storeRev = Number(r.STORE_REV) || 0
      const otherRev = Number(r.OTHER_REV) || 0
      const qty4w = Number(r.QTY_4W) || 0
      const shopInv = Number(r.SHOP_INV) || 0
      const whInv = Number(r.WH_INV) || 0
      const tagPrice = Number(r.TAGPRICE) || 0
      const tagBase = tagPrice * qty
      const dcRate = tagBase > 0 ? Math.round((1 - rev / tagBase) * 1000) / 10 : 0
      const sellThrough = (qty + shopInv) > 0 ? Math.round(qty / (qty + shopInv) * 1000) / 10 : 0
      const avgWeekly = qty4w / 4
      const wos = avgWeekly > 0 ? Math.round(shopInv / avgWeekly * 10) / 10 : (shopInv > 0 ? 99 : 0)
      return {
        styleCd: r.STYLECD,
        styleNm: r.STYLENM ?? r.STYLECD,
        brandcd: r.BRANDCD,
        itemNm: r.ITEMNM ?? '',
        year: r.YEARCD ?? '',
        season: r.SEASONNM ?? '',
        tagPrice: Math.round(tagPrice),
        rev: Math.round(rev), qty,
        storeRev: Math.round(storeRev),
        otherRev: Math.round(otherRev),
        shopInv, whInv,
        sellThrough, wos, dcRate,
      }
    })
    return NextResponse.json({ styles, count: styles.length, meta: { from, to, last4wStart, truncated: styles.length >= 1000 } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
