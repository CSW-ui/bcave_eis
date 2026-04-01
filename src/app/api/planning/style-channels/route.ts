import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/style-channels?styleCd=XX&brand=CO&year=26&season=봄,여름
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const styleCd = searchParams.get('styleCd') || ''
  const brand = searchParams.get('brand') || 'all'
  const year = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄']

  if (!styleCd) return NextResponse.json({ error: 'styleCd required' }, { status: 400 })
  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const brandWhere = brand === 'all'
    ? `v.BRANDCD IN ('CO','WA','LE','CK','LK')`
    : `v.BRANDCD = '${brand}'`
  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const styleSafe = styleCd.replace(/'/g, "''")

  try {
    const [rows, weeklyRows] = await Promise.all([
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPTYPENM, SUM(v.SALEAMT_VAT_EX) as AMT, SUM(v.SALEQTY) as QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.STYLECD = '${styleSafe}'
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
        GROUP BY v.SHOPTYPENM
        ORDER BY AMT DESC
      `),
      snowflakeQuery<Record<string, string>>(`
        SELECT WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) as WK,
          SUM(v.SALEAMT_VAT_EX) as REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.STYLECD = '${styleSafe}'
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
          AND v.SALEDT BETWEEN '20${year}0101' AND '20${year}1231'
        GROUP BY WK ORDER BY WK
      `),
    ])

    const weekMap: Record<number, number> = {}
    weeklyRows.forEach(r => { weekMap[Number(r.WK)] = Number(r.REV) || 0 })
    const weekly = Array.from({ length: 52 }, (_, i) => ({ week: i + 1, cy: weekMap[i + 1] || 0 }))

    return NextResponse.json({
      channels: rows.map(r => ({
        channel: r.SHOPTYPENM,
        amt: Number(r.AMT) || 0,
        qty: Number(r.QTY) || 0,
      })),
      weekly,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
