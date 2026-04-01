import { NextResponse } from 'next/server'
import { snowflakeQuery, BRAND_FILTER, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'
import { fmtDateSf } from '@/lib/formatters'

// 주차 번호 → 해당 연도의 월~일 날짜 반환
function weekToDate(yr: number, wn: number): { mon: Date; sun: Date } {
  const jan4 = new Date(yr, 0, 4)
  const jan4Dow = jan4.getDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setDate(jan4.getDate() - jan4Dow + 1)
  const mon = new Date(week1Mon)
  mon.setDate(week1Mon.getDate() + (wn - 1) * 7)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return { mon, sun }
}

function getDateRanges(monthParam?: string, weekNum?: number, weekFrom?: number, weekTo?: number) {
  let today: Date
  let isPastMonth = false
  let forcedMonthStart: Date | null = null
  let forcedMonthEnd: Date | null = null

  if (monthParam && monthParam.length === 6) {
    const yr = parseInt(monthParam.slice(0, 4))
    const mo = parseInt(monthParam.slice(4, 6))
    const lastDay = new Date(yr, mo, 0)
    const now = new Date()

    forcedMonthStart = new Date(yr, mo - 1, 1)
    forcedMonthEnd = lastDay

    if (now > lastDay) {
      today = lastDay
      isPastMonth = true
    } else {
      today = now
    }
  } else {
    today = new Date()
  }

  let cwEnd: Date
  let cwStart: Date

  if (weekFrom && weekTo && weekFrom > 0 && weekTo > 0) {
    // 구간 선택: weekFrom ~ weekTo
    const yr = today.getFullYear()
    const from = weekToDate(yr, Math.min(weekFrom, weekTo))
    const to = weekToDate(yr, Math.max(weekFrom, weekTo))
    cwStart = from.mon
    cwEnd = to.sun
  } else if (weekNum && weekNum > 0) {
    // 단일 주 선택
    const yr = today.getFullYear()
    const { mon, sun } = weekToDate(yr, weekNum)
    cwStart = mon
    cwEnd = sun
  } else {
    const dow = today.getDay()
    const lastSun = new Date(today)
    lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
    cwEnd = new Date(lastSun)
    cwStart = new Date(lastSun)
    cwStart.setDate(cwStart.getDate() - 6)
  }

  // PW: CW와 동일 길이의 직전 구간
  const cwDays = Math.round((cwEnd.getTime() - cwStart.getTime()) / 86400000)
  const pwEnd = new Date(cwStart)
  pwEnd.setDate(pwEnd.getDate() - 1)
  const pwStart = new Date(pwEnd)
  pwStart.setDate(pwEnd.getDate() - cwDays)

  // 월 시작/끝: 주간 선택과 무관, 전일마감 기준
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const monthStart = forcedMonthStart ?? new Date(yesterday.getFullYear(), yesterday.getMonth(), 1)
  const monthEnd = forcedMonthEnd ?? yesterday

  // 주간 실적 레이블
  const cwLabel = `${cwStart.getMonth()+1}/${cwStart.getDate()}~${cwEnd.getMonth()+1}/${cwEnd.getDate()}`

  return {
    cwStart: fmtDateSf(cwStart),
    cwEnd: fmtDateSf(cwEnd),
    pwStart: fmtDateSf(pwStart),
    pwEnd: fmtDateSf(pwEnd),
    monthStart: fmtDateSf(monthStart),
    monthEnd: fmtDateSf(monthEnd),
    monthLabel: `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`,
    cwLabel,
    isPastMonth,
  }
}

// GET /api/sales/performance?brand=all
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'all'

  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const stylecd = searchParams.get('stylecd') || ''
  const month = searchParams.get('month') || ''
  const itemNm = searchParams.get('item') || ''
  const weekNumParam = searchParams.get('weekNum') || ''
  const weekFromParam = searchParams.get('weekFrom') || ''
  const weekToParam = searchParams.get('weekTo') || ''

  const dates = getDateRanges(
    month || undefined,
    weekNumParam ? parseInt(weekNumParam) : undefined,
    weekFromParam ? parseInt(weekFromParam) : undefined,
    weekToParam ? parseInt(weekToParam) : undefined,
  )
  const brandWhere = brand === 'all'
    ? BRAND_FILTER.replace(/BRANDCD/g, 's.BRANDCD')
    : `s.BRANDCD = '${brand}'`
  const styleFilter = stylecd ? `AND s.STYLECD = '${stylecd.replace(/'/g, "''")}'` : ''
  const itemFilter = itemNm ? `AND si.ITEMNM = '${itemNm.replace(/'/g, "''")}'` : ''

  const rangeEnd = dates.monthEnd > dates.cwEnd ? dates.monthEnd : dates.cwEnd
  const rangeStart = dates.monthStart < dates.pwStart ? dates.monthStart : dates.pwStart

  function buildSql(yearOffset: number) {
    const off = yearOffset * 10000
    const ms = String(parseInt(dates.monthStart) - off)
    const me = String(parseInt(dates.monthEnd) - off)
    const cs = String(parseInt(dates.cwStart) - off)
    const ce = String(parseInt(dates.cwEnd) - off)
    const ps = String(parseInt(dates.pwStart) - off)
    const pe = String(parseInt(dates.pwEnd) - off)
    const rs = String(parseInt(rangeStart) - off)
    const re = String(parseInt(rangeEnd) - off)

    return `
      SELECT s.BRANDCD, s.BRANDNM, s.SHOPTYPENM,
        SUM(CASE WHEN s.SALEDT BETWEEN '${ms}' AND '${me}' THEN s.SALEAMT_VAT_EX ELSE 0 END) AS MTD_REV,
        SUM(CASE WHEN s.SALEDT BETWEEN '${ms}' AND '${me}' THEN COALESCE(si.PRODCOST, 0) * s.SALEQTY ELSE 0 END) AS MTD_COST,
        SUM(CASE WHEN s.SALEDT BETWEEN '${cs}' AND '${ce}' THEN s.SALEAMT_VAT_EX ELSE 0 END) AS CW_REV,
        SUM(CASE WHEN s.SALEDT BETWEEN '${cs}' AND '${ce}' THEN COALESCE(si.PRODCOST, 0) * s.SALEQTY ELSE 0 END) AS CW_COST,
        SUM(CASE WHEN s.SALEDT BETWEEN '${ps}' AND '${pe}' THEN s.SALEAMT_VAT_EX ELSE 0 END) AS PW_REV,
        SUM(CASE WHEN s.SALEDT BETWEEN '${ps}' AND '${pe}' THEN COALESCE(si.PRODCOST, 0) * s.SALEQTY ELSE 0 END) AS PW_COST
      FROM ${SALES_VIEW} s
      LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si
        ON s.STYLECD = si.STYLECD AND s.BRANDCD = si.BRANDCD
      WHERE ${brandWhere}
        AND s.SALEDT BETWEEN '${rs}' AND '${re}'
        ${styleFilter}
        ${itemFilter}
      GROUP BY s.BRANDCD, s.BRANDNM, s.SHOPTYPENM
    `
  }

  // SW_SALEINFO 기반 할인율 쿼리 (BRANDCD×SHOPTYPENM별)
  function buildDcSql(yearOffset: number) {
    const off = yearOffset * 10000
    const ms = String(parseInt(dates.monthStart) - off)
    const me = String(parseInt(dates.monthEnd) - off)
    const cs = String(parseInt(dates.cwStart) - off)
    const ce = String(parseInt(dates.cwEnd) - off)
    const ps = String(parseInt(dates.pwStart) - off)
    const pe = String(parseInt(dates.pwEnd) - off)
    const rs = String(parseInt(rangeStart) - off)
    const re = String(parseInt(rangeEnd) - off)
    const siBrandWhere = brandWhere.replace(/s\.BRANDCD/g, 'sl.BRANDCD')

    return `
      SELECT sl.BRANDCD, sh.SHOPTYPENM,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${ms}' AND '${me}' THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS MTD_TAG,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${ms}' AND '${me}' THEN sl.SALEAMT ELSE 0 END) AS MTD_SALE,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${cs}' AND '${ce}' THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS CW_TAG,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${cs}' AND '${ce}' THEN sl.SALEAMT ELSE 0 END) AS CW_SALE,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${ps}' AND '${pe}' THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS PW_TAG,
        SUM(CASE WHEN sl.SALEDT BETWEEN '${ps}' AND '${pe}' THEN sl.SALEAMT ELSE 0 END) AS PW_SALE
      FROM BCAVE.SEWON.SW_SALEINFO sl
      JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
      ${itemFilter ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD` : ''}
      WHERE ${siBrandWhere}
        AND sl.SALEDT BETWEEN '${rs}' AND '${re}'
        ${styleFilter ? styleFilter.replace(/s\./g, 'sl.') : ''}
        ${itemFilter ? itemFilter.replace(/si\./g, 'si.') : ''}
      GROUP BY sl.BRANDCD, sh.SHOPTYPENM
    `
  }

  try {
    const [cyRaw, lyRaw, cyDcRaw, lyDcRaw] = await Promise.all([
      snowflakeQuery<Record<string, string>>(buildSql(0)),
      snowflakeQuery<Record<string, string>>(buildSql(1)),
      snowflakeQuery<Record<string, string>>(buildDcSql(0)),
      snowflakeQuery<Record<string, string>>(buildDcSql(1)),
    ])

    // 할인율 데이터를 BRANDCD::SHOPTYPENM 키로 맵 생성
    const buildDcMap = (rows: Record<string, string>[]) => {
      const m = new Map<string, Record<string, string>>()
      rows.forEach(r => m.set(`${r.BRANDCD}::${r.SHOPTYPENM}`, r))
      return m
    }
    const cyDcMap = buildDcMap(cyDcRaw)
    const lyDcMap = buildDcMap(lyDcRaw)

    const mapRow = (r: Record<string, string>, dcM: Map<string, Record<string, string>>) => {
      const dc = dcM.get(`${r.BRANDCD}::${r.SHOPTYPENM}`)
      return {
        brandcd: r.BRANDCD,
        brandnm: r.BRANDNM,
        shoptypenm: r.SHOPTYPENM,
        mtdRev: Number(r.MTD_REV) || 0,
        mtdTag: Number(dc?.MTD_TAG) || 0,
        mtdSale: Number(dc?.MTD_SALE) || 0,
        mtdCost: Number(r.MTD_COST) || 0,
        cwRev: Number(r.CW_REV) || 0,
        cwTag: Number(dc?.CW_TAG) || 0,
        cwSale: Number(dc?.CW_SALE) || 0,
        cwCost: Number(r.CW_COST) || 0,
        pwRev: Number(r.PW_REV) || 0,
        pwTag: Number(dc?.PW_TAG) || 0,
        pwSale: Number(dc?.PW_SALE) || 0,
        pwCost: Number(r.PW_COST) || 0,
      }
    }

    return NextResponse.json({
      cy: cyRaw.map(r => mapRow(r, cyDcMap)),
      ly: lyRaw.map(r => mapRow(r, lyDcMap)),
      meta: dates,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
