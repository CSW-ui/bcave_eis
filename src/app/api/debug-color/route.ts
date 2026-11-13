import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'
import { SALES_WITH_NET_AMOUNT } from '@/lib/sales-scope'
export async function GET() {
  try {
    const rows = await snowflakeQuery(`
      SELECT sa.STYLECD, sa.COLORCD, SUM(sa.SALEAMT_VAT_EX) AS AMT, SUM(sa.SALEQTY) AS QTY, COUNT(*) AS CNT
      FROM ${SALES_WITH_NET_AMOUNT} sa
      WHERE sa.SHOPCD = 'B6055' AND sa.STYLECD = 'CO2602ST20' AND sa.SALEDT >= '20260101'
      GROUP BY sa.STYLECD, sa.COLORCD
      ORDER BY sa.COLORCD
    `)
    return NextResponse.json({ rows })
  } catch(e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
