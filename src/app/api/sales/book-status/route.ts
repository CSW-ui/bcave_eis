import { NextResponse } from 'next/server'
import { BRAND_FILTER, snowflakeQuery } from '@/lib/snowflake'
import { SALES_PENDING_BOOK_AMOUNT } from '@/lib/sales-scope'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [row] = await snowflakeQuery<{ FIRST_DAY: string | null; LAST_DAY: string | null }>(`
      SELECT MIN(s.SALEDT) AS FIRST_DAY, MAX(s.SALEDT) AS LAST_DAY
      FROM BCAVE.SEWON.SW_SALEINFO s
      WHERE ${BRAND_FILTER} AND ${SALES_PENDING_BOOK_AMOUNT}
        AND COALESCE(s.SALEAMT, 0) <> 0
    `)
    return NextResponse.json({ firstDay: row?.FIRST_DAY ?? null, lastDay: row?.LAST_DAY ?? null })
  } catch {
    return NextResponse.json({ error: 'ERP 장부금액 적재 상태를 확인할 수 없습니다.' }, { status: 503 })
  }
}
