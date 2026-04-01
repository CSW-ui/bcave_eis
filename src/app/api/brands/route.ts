import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'

// GET /api/brands — Snowflake 브랜드 목록
export async function GET() {
  try {
    const rows = await snowflakeQuery<{ CODE: string; CODENM: string }>(
      `SELECT CODE, CODENM FROM BCAVE.SEWON.SW_COMMINFO
       WHERE GB = 'G1' AND USEYN = 'Y' AND CODE IN ('CO','WA','LE','CK','LK')
       ORDER BY CODE`
    )
    return NextResponse.json(rows.map(r => ({ code: r.CODE, name: r.CODENM })))
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
