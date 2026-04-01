import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, BRAND_FILTER } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/sales/items?brand=all — 전주 마감 기준 품목별 실적
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'all'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const weekNum = searchParams.get('weekNum') || ''
  const channels = searchParams.get('channels') || ''
  const paramFromDt = searchParams.get('fromDt') || ''
  const paramToDt = searchParams.get('toDt') || ''

  // 다중 채널 필터
  let chFilter = ''
  if (channels) {
    const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
    chFilter = `AND v.SHOPTYPENM IN (${chList})`
  }

  const brandWhere = brand === 'all'
    ? BRAND_FILTER.replace(/BRANDCD/g, 'v.BRANDCD')
    : `v.BRANDCD = '${brand}'`

  const today = new Date()
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const dow = today.getDay()
  const lastSun = new Date(today); lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = fD(lastSun)
  const cwStart = fD(new Date(lastSun.getTime() - 6 * 86400000))
  const pwEnd = fD(new Date(lastSun.getTime() - 7 * 86400000))
  const pwStart = fD(new Date(lastSun.getTime() - 13 * 86400000))
  const lyCwStart = String(parseInt(cwStart) - 10000)
  const lyCwEnd = String(parseInt(cwEnd) - 10000)

  const yr = String(today.getFullYear())
  const lyYr = String(today.getFullYear() - 1)

  try {
    let sql: string
    if (paramFromDt && paramToDt) {
      // 날짜 범위 지정 (구간 선택)
      const lyFrom = String(parseInt(paramFromDt) - 10000)
      const lyTo = String(parseInt(paramToDt) - 10000)
      sql = `
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${paramFromDt}' AND '${paramToDt}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          0 as PW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyFrom}' AND '${lyTo}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${paramFromDt}' AND '${paramToDt}' THEN v.SALEQTY ELSE 0 END) as CW_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND (v.SALEDT BETWEEN '${paramFromDt}' AND '${paramToDt}' OR v.SALEDT BETWEEN '${lyFrom}' AND '${lyTo}')
          ${chFilter}
        GROUP BY si.ITEMNM
        ORDER BY CW_REV DESC`
    } else if (weekNum) {
      // 특정 주차: 금년 해당주 vs 전주 vs 전년 동주
      const wn = parseInt(weekNum)
      const pwn = wn - 1 > 0 ? wn - 1 : 52
      sql = `
        SELECT si.ITEMNM,
          SUM(CASE WHEN YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${yr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${wn} THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${yr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${pwn} THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV,
          SUM(CASE WHEN YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${lyYr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${wn} THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_CW_REV,
          SUM(CASE WHEN YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${yr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${wn} THEN v.SALEQTY ELSE 0 END) as CW_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND ((YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${yr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD')) IN (${wn},${pwn}))
            OR (YEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${lyYr} AND WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${wn}))
          ${chFilter}
        GROUP BY si.ITEMNM
        ORDER BY CW_REV DESC`
    } else {
      // 기본: 전주 vs 전전주 vs 전년동주
      sql = `
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyCwStart}' AND '${lyCwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEQTY ELSE 0 END) as CW_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND (v.SALEDT BETWEEN '${pwStart}' AND '${cwEnd}' OR v.SALEDT BETWEEN '${lyCwStart}' AND '${lyCwEnd}')
          ${chFilter}
        GROUP BY si.ITEMNM
        ORDER BY CW_REV DESC`
    }
    // 할인율용: SW_SALEINFO 기반 품목별 TAG·SALEAMT
    const dcBrandWhere = brandWhere.replace(/v\.BRANDCD/g, 'sl.BRANDCD')
    // 다중 채널 필터 (SW_SALEINFO용)
    let chFilterSl = ''
    if (channels) {
      const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
      chFilterSl = `AND sh.SHOPTYPENM IN (${chList})`
    }

    let dcSql: string
    if (weekNum) {
      const wn = parseInt(weekNum)
      dcSql = `
        SELECT si.ITEMNM,
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT) AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${dcBrandWhere}
          AND YEAR(TO_DATE(sl.SALEDT,'YYYYMMDD'))=${yr}
          AND WEEKOFYEAR(TO_DATE(sl.SALEDT,'YYYYMMDD'))=${wn}
          ${chFilterSl}
        GROUP BY si.ITEMNM`
    } else {
      dcSql = `
        SELECT si.ITEMNM,
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT) AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${dcBrandWhere}
          AND sl.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}'
          ${chFilterSl}
        GROUP BY si.ITEMNM`
    }

    const [rows, dcRows] = await Promise.all([
      snowflakeQuery<Record<string, string>>(sql),
      snowflakeQuery<Record<string, string>>(dcSql),
    ])

    const dcMap = new Map(dcRows.map(r => [r.ITEMNM, { tag: Number(r.TAG_AMT) || 0, sale: Number(r.SALE_AMT) || 0 }]))

    const items = rows.map(r => {
      const cwRev = Number(r.CW_REV) || 0
      const pwRev = Number(r.PW_REV) || 0
      const lyCwRev = Number(r.LY_CW_REV) || 0
      const dc = dcMap.get(r.ITEMNM)
      return {
        item: r.ITEMNM ?? '기타',
        cwRev, pwRev, lyCwRev,
        cwQty: Number(r.CW_QTY) || 0,
        wow: pwRev > 0 ? Math.round((cwRev - pwRev) / pwRev * 1000) / 10 : 0,
        yoy: lyCwRev > 0 ? Math.round((cwRev - lyCwRev) / lyCwRev * 1000) / 10 : 0,
        dcRate: dc && dc.tag > 0 ? Math.round((1 - dc.sale / dc.tag) * 1000) / 10 : null,
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
