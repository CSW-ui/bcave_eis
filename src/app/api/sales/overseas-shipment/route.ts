import { NextResponse } from 'next/server'
import { snowflakeQuery, OVERSEAS_TRANSFER_SHOPS } from '@/lib/snowflake'

export const dynamic = 'force-dynamic'

// GET /api/sales/overseas-shipment?year=2026
//   자사 해외법인(대만·일본·중국 B.CAVE) 이전 출고분 — raw VW(필터 전) 조회
//   ※ SALES_VIEW는 이 매장들을 제외하므로 여기선 원본 테이블을 직접 사용
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = (searchParams.get('year') || '2026').replace(/[^0-9]/g, '').slice(0, 4)
  if (!/^\d{4}$/.test(year)) return NextResponse.json({ error: 'year는 YYYY 형식이어야 합니다.' }, { status: 400 })
  const lyYear = String(Number(year) - 1)

  const inClause = OVERSEAS_TRANSFER_SHOPS.map(s => `'${s}'`).join(',')

  const sql = `
    SELECT v.SHOPCD, v.BRANDCD,
      SUBSTRING(v.SALEDT, 1, 4) as YR,
      CAST(SUBSTRING(v.SALEDT, 5, 2) AS INT) as MM,
      SUM(v.SALEAMT_VAT_EX) as AMT,
      SUM(v.SALEQTY) as QTY
    FROM BCAVE.SEWON.VW_SALES_VAT v
    WHERE v.SHOPCD IN (${inClause})
      AND v.SALEDT BETWEEN '${lyYear}0101' AND '${year}1231'
    GROUP BY v.SHOPCD, v.BRANDCD, YR, MM
  `

  try {
    const rows = await snowflakeQuery<Record<string, string>>(sql)
    const num = (v: string) => Number(v) || 0
    const data = rows.map(r => ({
      shopCd: r.SHOPCD, brandcd: r.BRANDCD,
      yr: r.YR, mm: Number(r.MM), amt: num(r.AMT), qty: num(r.QTY),
    }))
    return NextResponse.json({ rows: data, meta: { year, lyYear, shops: OVERSEAS_TRANSFER_SHOPS } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
