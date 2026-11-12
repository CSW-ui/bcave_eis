import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'
import { OVERSEAS_TRANSFER_ENTITY_CODES, OVERSEAS_TRANSFER_ENTITY_SQL, OVERSEAS_TRANSFER_SHOP_LIST, TRANSFER_SALES_VIEW } from '@/lib/sales-scope'

export const dynamic = 'force-dynamic'

// GET /api/sales/overseas-shipment?year=2026
//   자사 해외법인(대만·일본·중국 B.CAVE) 이전 출고분
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = (searchParams.get('year') || '2026').replace(/[^0-9]/g, '').slice(0, 4)
  if (!/^\d{4}$/.test(year)) return NextResponse.json({ error: 'year는 YYYY 형식이어야 합니다.' }, { status: 400 })
  const lyYear = String(Number(year) - 1)

  const sql = `
    SELECT ${OVERSEAS_TRANSFER_ENTITY_SQL} AS SHOPCD, v.BRANDCD,
      SUBSTRING(v.SALEDT, 1, 4) as YR,
      CAST(SUBSTRING(v.SALEDT, 5, 2) AS INT) as MM,
      SUM(v.SALEAMT_VAT_EX) as AMT,
      SUM(v.SALEQTY) as QTY
    FROM ${TRANSFER_SALES_VIEW} v
    WHERE v.SHOPCD IN (${OVERSEAS_TRANSFER_SHOP_LIST})
      AND v.SALEDT BETWEEN '${lyYear}0101' AND '${year}1231'
    GROUP BY 1, v.BRANDCD, YR, MM
  `

  try {
    const rows = await snowflakeQuery<Record<string, string>>(sql)
    const num = (v: string) => Number(v) || 0
    const data = rows.map(r => ({
      shopCd: r.SHOPCD, brandcd: r.BRANDCD,
      yr: r.YR, mm: Number(r.MM), amt: num(r.AMT), qty: num(r.QTY),
    }))
    return NextResponse.json({ rows: data, meta: { year, lyYear, shops: OVERSEAS_TRANSFER_ENTITY_CODES } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
