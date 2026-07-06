import { NextRequest, NextResponse } from 'next/server'
import { snowflakeQuery, BRAND_FILTER, SALES_VIEW } from '@/lib/snowflake'
import { fmtDateSf } from '@/lib/formatters'
import { VALID_BRANDS } from '@/lib/constants'

/**
 * 채널별 일자별 목표 진도율 — 데이터만 반환, 목표 배분·진도율 계산은 클라이언트.
 *  - rows:  당월 일자×브랜드×채널 실적
 *  - lyDow: 전년 동월 브랜드×채널×요일(ISO 1=월~7=일) 매출 → 요일가중 배분 기준
 */
export async function GET(req: NextRequest) {
  const allowedParam = req.nextUrl.searchParams.get('allowed') || ''
  const allowedCodes = allowedParam.split(',').map(s => s.trim()).filter(b => VALID_BRANDS.has(b))
  const allowedClause = allowedCodes.length > 0
    ? `BRANDCD IN (${allowedCodes.map(b => `'${b}'`).join(',')})`
    : BRAND_FILTER

  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  const curYm = `${curY}${String(curM).padStart(2, '0')}`

  const rawYm = (req.nextUrl.searchParams.get('yyyymm') || curYm).replace(/[^0-9]/g, '').slice(0, 6)
  const yyyymm = rawYm.length === 6 ? rawYm : curYm
  const y = Number(yyyymm.slice(0, 4))
  const mm = yyyymm.slice(4, 6)
  const m = Number(mm)
  const daysInMonth = new Date(y, m, 0).getDate()

  const mStart = `${yyyymm}01`
  const monthEnd = `${yyyymm}${String(daysInMonth).padStart(2, '0')}`

  // 전년 동월 (요일가중 기준) — 완전월
  const lyY = y - 1
  const lyDays = new Date(lyY, m, 0).getDate()
  const lyStart = `${lyY}${mm}01`
  const lyEnd = `${lyY}${mm}${String(lyDays).padStart(2, '0')}`

  // 전년 동월 일자별 — 요일가중 + 전년동기/전년전체 비교 모두 여기서 파생 (완전월 조회)
  const lyRowsPromise = snowflakeQuery<{ DD: string; BRANDCD: string; SHOPTYPENM: string; REV: string }>(`
    SELECT SUBSTRING(SALEDT, 7, 2) AS DD,
      BRANDCD,
      SHOPTYPENM,
      SUM(SALEAMT_VAT_EX) AS REV
    FROM ${SALES_VIEW}
    WHERE ${allowedClause}
      AND SALEDT BETWEEN '${lyStart}' AND '${lyEnd}'
    GROUP BY SUBSTRING(SALEDT, 7, 2), BRANDCD, SHOPTYPENM
  `)

  const mapLyRows = (rows: { DD: string; BRANDCD: string; SHOPTYPENM: string; REV: string }[]) =>
    rows.map(r => ({ dd: Number(r.DD), brandcd: r.BRANDCD, shoptypenm: r.SHOPTYPENM || '미지정', rev: Number(r.REV) || 0 }))
      .filter(r => r.rev !== 0)

  // 경과일·마감일 (전일마감)
  let mEnd = monthEnd
  let daysElapsed = daysInMonth
  let isCurrentMonth = false
  if (yyyymm > curYm) {
    const lyRows = mapLyRows(await lyRowsPromise)
    return NextResponse.json({ meta: { yyyymm, daysInMonth, daysElapsed: 0, isCurrentMonth: false, future: true }, rows: [], lyRows })
  } else if (yyyymm === curYm) {
    isCurrentMonth = true
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const yEnd = fmtDateSf(yesterday)
    if (yEnd < mStart) {
      const lyRows = mapLyRows(await lyRowsPromise)
      return NextResponse.json({ meta: { yyyymm, daysInMonth, daysElapsed: 0, isCurrentMonth: true, future: false }, rows: [], lyRows })
    }
    mEnd = yEnd < monthEnd ? yEnd : monthEnd
    daysElapsed = Number(mEnd.slice(6, 8))
  }

  try {
    const [rows, lyRowsRaw] = await Promise.all([
      snowflakeQuery<{ DD: string; BRANDCD: string; SHOPTYPENM: string; REV: string }>(`
        SELECT SUBSTRING(SALEDT, 7, 2) AS DD,
          BRANDCD,
          SHOPTYPENM,
          SUM(SALEAMT_VAT_EX) AS REV
        FROM ${SALES_VIEW}
        WHERE ${allowedClause}
          AND SALEDT BETWEEN '${mStart}' AND '${mEnd}'
        GROUP BY SUBSTRING(SALEDT, 7, 2), BRANDCD, SHOPTYPENM
        ORDER BY DD
      `),
      lyRowsPromise,
    ])

    return NextResponse.json({
      meta: { yyyymm, daysInMonth, daysElapsed, isCurrentMonth, future: false },
      rows: rows.map(r => ({
        dd: Number(r.DD),
        brandcd: r.BRANDCD,
        shoptypenm: r.SHOPTYPENM || '미지정',
        rev: Number(r.REV) || 0,
      })),
      lyRows: mapLyRows(lyRowsRaw),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
