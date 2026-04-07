import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'
export async function GET() {
  try {
    const rows = await snowflakeQuery(`
      SELECT sa.STYLECD, sa.COLORCD, SUM(sa.SALEAMT) AS AMT, SUM(sa.SALEQTY) AS QTY, COUNT(*) AS CNT
      FROM SW_SALEINFO sa
      WHERE sa.SHOPCD = 'B6055' AND sa.STYLECD = 'CO2602ST20' AND sa.SALEDT >= '20260101'
      GROUP BY sa.STYLECD, sa.COLORCD
      ORDER BY sa.COLORCD
    `)
    return NextResponse.json({ rows })
  } catch(e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
