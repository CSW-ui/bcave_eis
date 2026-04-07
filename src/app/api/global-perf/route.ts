import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'

// 글로벌 영업현황 — 매장×브랜드×채널유형 단위
// YTD + 월별 + 주간(금주/전주) + 할인율/원가율
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') || '2026'
    const fromDt = `${year}0101`

    // 현재 날짜 기준 주간 계산 (월요일 기준)
    const now = new Date()
    const dow = now.getDay() || 7 // 월=1 ~ 일=7
    const cwStart = new Date(now)
    cwStart.setDate(now.getDate() - dow + 1) // 이번주 월요일
    const pwStart = new Date(cwStart)
    pwStart.setDate(cwStart.getDate() - 7) // 전주 월요일
    const fmtD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
    const cwStartDt = fmtD(cwStart)
    const pwStartDt = fmtD(pwStart)
    const pwEndDt = cwStartDt

    const sql = `
      SELECT
        sh.AREACD, sh.AREANM, sh.SHOPNM, sh.SHOPTYPENM,
        sa.BRANDNM,
        SUBSTR(sa.SALEDT, 1, 6) AS YM,
        SUM(sa.SALEAMT) AS AMT,
        SUM(sa.SALEQTY) AS QTY,
        SUM(sa.TAGPRICE * sa.SALEQTY) AS TAG,
        SUM(COALESCE(pc.PRECOST, st.PRODCOST, 0) * sa.SALEQTY) AS COGS,
        SUM(CASE WHEN sa.SALEDT >= '${cwStartDt}' THEN sa.SALEAMT ELSE 0 END) AS CW_AMT,
        SUM(CASE WHEN sa.SALEDT >= '${cwStartDt}' THEN sa.TAGPRICE * sa.SALEQTY ELSE 0 END) AS CW_TAG,
        SUM(CASE WHEN sa.SALEDT >= '${pwStartDt}' AND sa.SALEDT < '${pwEndDt}' THEN sa.SALEAMT ELSE 0 END) AS PW_AMT
      FROM SW_SALEINFO sa
      JOIN SW_SHOPINFO sh ON sa.SHOPCD = sh.SHOPCD
      JOIN SW_STYLEINFO st ON sa.STYLECD = st.STYLECD AND sa.BRANDCD = st.BRANDCD
      LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON st.STYLECD = pc.STYLECD AND st.BRANDCD = pc.BRANDCD
      WHERE (sh.AREACD IN ('TW','JP','CN','SA','CH') OR sa.SHOPCD = 'B6050')
        AND sa.SALEDT >= '${fromDt}'
        AND sa.BRANDNM IN ('커버낫','와키윌리')
      GROUP BY sh.AREACD, sh.AREANM, sh.SHOPNM, sh.SHOPTYPENM, sa.BRANDNM, SUBSTR(sa.SALEDT, 1, 6)
      ORDER BY sh.AREACD, sh.SHOPNM, sa.BRANDNM, YM
    `
    const rows = await snowflakeQuery(sql)
    return NextResponse.json({
      rows,
      meta: { cwStart: cwStartDt, pwStart: pwStartDt, pwEnd: pwEndDt, fromDt, count: rows.length }
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), rows: [] }, { status: 500 })
  }
}
