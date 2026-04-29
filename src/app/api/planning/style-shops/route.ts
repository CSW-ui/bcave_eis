import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/style-shops?channel=백화점&brand=CO&year=26&season=봄,여름
//   + styleCd=XX (optional, single style filter)
//   + item=반팔티셔츠 (optional, item-level filter — used from [item] detail page)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const styleCd = searchParams.get('styleCd') || ''
  const item = searchParams.get('item') || ''
  const channel = searchParams.get('channel') || ''
  const brand = searchParams.get('brand') || 'all'
  const year = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄']

  if (!styleCd && !item) return NextResponse.json({ error: 'styleCd or item required' }, { status: 400 })
  if (!channel) return NextResponse.json({ error: 'channel required' }, { status: 400 })
  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const brandWhere = brand === 'all'
    ? `v.BRANDCD IN ('CO','WA','LE','CK','LK')`
    : `v.BRANDCD = '${brand}'`
  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const channelSafe = channel.replace(/'/g, "''")

  const styleFilter = styleCd
    ? `AND v.STYLECD = '${styleCd.replace(/'/g, "''")}'`
    : ''
  const itemFilter = item
    ? `AND si.ITEMNM = '${item.replace(/'/g, "''")}'`
    : ''

  const invStyleFilter = styleCd
    ? `WHERE inv_raw.STYLECD = '${styleCd.replace(/'/g, "''")}'`
    : item
      ? `WHERE inv_raw.STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE ITEMNM = '${item.replace(/'/g, "''")}' AND YEARCD = '${year}' AND SEASONNM IN (${seasonList}))`
      : ''

  try {
    const rows = await snowflakeQuery<Record<string, string>>(`
      SELECT sh.SHOPNM,
        SUM(v.SALEAMT_VAT_EX) as AMT,
        SUM(v.SALEQTY) as QTY,
        COALESCE(inv.INVQTY, 0) as INV_QTY
      FROM ${SALES_VIEW} v
      JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD = sh.SHOPCD
      JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
      LEFT JOIN (
        SELECT SHOPCD, SUM(INVQTY) as INVQTY
        FROM BCAVE.SEWON.SW_SHOPINV inv_raw
        ${invStyleFilter}
        GROUP BY SHOPCD
      ) inv ON v.SHOPCD = inv.SHOPCD
      WHERE ${brandWhere}
        ${styleFilter}
        ${itemFilter}
        AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
        AND v.SHOPTYPENM = '${channelSafe}'
      GROUP BY sh.SHOPNM, inv.INVQTY
      ORDER BY AMT DESC
    `)

    return NextResponse.json({
      shops: rows.map(r => ({
        shop: r.SHOPNM,
        amt: Number(r.AMT) || 0,
        qty: Number(r.QTY) || 0,
        invQty: Number(r.INV_QTY) || 0,
      })),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
