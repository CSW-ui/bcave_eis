import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'
import { fmtDateSf } from '@/lib/formatters'

// ─── 날짜 계산 ───────────────────────────────────────────────────────────────
function getDateRanges(monthParam?: string) {
  const today = new Date()

  let yesterday: Date
  let monthStart: Date
  let monthEnd: Date

  if (monthParam && monthParam.length === 6) {
    const yr = parseInt(monthParam.slice(0, 4))
    const mo = parseInt(monthParam.slice(4, 6))
    const lastDay = new Date(yr, mo, 0) // last day of that month
    monthStart = new Date(yr, mo - 1, 1)
    // If the requested month is in the past, use its last day; otherwise use yesterday
    if (today > lastDay) {
      yesterday = lastDay
      monthEnd = lastDay
    } else {
      yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      monthEnd = yesterday
    }
  } else {
    yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    monthStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1)
    monthEnd = yesterday
  }

  // CW: lastSun ~ lastSun-6
  const dow = today.getDay()
  const lastSun = new Date(today)
  lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = new Date(lastSun)
  const cwStart = new Date(lastSun)
  cwStart.setDate(cwStart.getDate() - 6)

  // PW: 7 days before CW
  const pwEnd = new Date(cwStart)
  pwEnd.setDate(pwEnd.getDate() - 1)
  const pwStart = new Date(pwEnd)
  pwStart.setDate(pwEnd.getDate() - 6)

  // LY same MTD period (subtract 1 year)
  const lyMonthStart = new Date(monthStart)
  lyMonthStart.setFullYear(lyMonthStart.getFullYear() - 1)
  const lyMonthEnd = new Date(monthEnd)
  lyMonthEnd.setFullYear(lyMonthEnd.getFullYear() - 1)

  return {
    cwStart: fmtDateSf(cwStart),
    cwEnd: fmtDateSf(cwEnd),
    pwStart: fmtDateSf(pwStart),
    pwEnd: fmtDateSf(pwEnd),
    mtdStart: fmtDateSf(monthStart),
    mtdEnd: fmtDateSf(monthEnd),
    lyMtdStart: fmtDateSf(lyMonthStart),
    lyMtdEnd: fmtDateSf(lyMonthEnd),
  }
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v ?? 0))
  return isFinite(n) ? n : 0
}

function calcRate(num: number, denom: number): number {
  if (!denom) return 0
  return Math.round((num / denom) * 10000) / 100 // percent, 2dp
}

// ─── Tab 1: 베스트 매장 ───────────────────────────────────────────────────────
async function getTopShops(
  brandInClause: string,
  dates: ReturnType<typeof getDateRanges>,
  channelFilter: string,
  itemFilter: string,
) {
  const sql = `
    SELECT
      v.SHOPCD,
      MAX(sh.SHOPNM) AS SHOPNM,
      MAX(sh.SHOPTYPENM) AS SHOPTYPENM,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS MTD_REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.cwStart}' AND '${dates.cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CW_REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.pwStart}' AND '${dates.pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS PW_REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_REV
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD = sh.SHOPCD
    ${itemFilter ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD` : ''}
    WHERE v.BRANDCD IN ${brandInClause}
      AND v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.mtdEnd}'
      ${channelFilter ? channelFilter.replace(/v\.SHOPTYPENM/g, 'sh.SHOPTYPENM') : ''}
      ${itemFilter}
    GROUP BY v.SHOPCD
    ORDER BY MTD_REV DESC
    LIMIT 30
  `

  const rows = await snowflakeQuery<{
    SHOPCD: string; SHOPNM: string; SHOPTYPENM: string
    MTD_REV: unknown; CW_REV: unknown; PW_REV: unknown; LY_REV: unknown
  }>(sql)

  const shops = rows.map(r => {
    const mtdRev = safeNum(r.MTD_REV)
    const cwRev = safeNum(r.CW_REV)
    const pwRev = safeNum(r.PW_REV)
    const lyRev = safeNum(r.LY_REV)
    const wow = pwRev ? Math.round(((cwRev - pwRev) / pwRev) * 1000) / 10 : 0
    const yoy = lyRev ? Math.round(((mtdRev - lyRev) / lyRev) * 1000) / 10 : 0
    return {
      shopCd: r.SHOPCD,
      shopNm: r.SHOPNM,
      shopType: r.SHOPTYPENM,
      mtdRev,
      cwRev,
      pwRev,
      lyRev,
      wow,
      yoy,
    }
  })

  return NextResponse.json({ shops })
}

// ─── Tab 2: 채널 수익성 ───────────────────────────────────────────────────────
async function getProfitability(
  brandInClause: string,
  dates: ReturnType<typeof getDateRanges>,
  channelFilter: string,
  itemFilter: string,
) {
  // Revenue + COGS from VW_SALES_VAT joined with SW_STYLEINFO for PRODCOST
  const revSql = `
    SELECT
      v.BRANDNM,
      v.SHOPTYPENM,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN si.PRODCOST * v.SALEQTY ELSE 0 END) AS COST,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN si.PRODCOST * v.SALEQTY ELSE 0 END) AS LY_COST
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
    WHERE v.BRANDCD IN ${brandInClause}
      AND v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.mtdEnd}'
      ${channelFilter}
      ${itemFilter}
    GROUP BY v.BRANDNM, v.SHOPTYPENM
    ORDER BY REV DESC
  `

  // Discount rate from SW_SALEINFO + SW_SHOPINFO join
  const dcSql = `
    SELECT
      sl.BRANDCD,
      sh.SHOPTYPENM,
      SUM(CASE WHEN sl.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS TAG,
      SUM(CASE WHEN sl.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN sl.SALEAMT ELSE 0 END) AS SALE,
      SUM(CASE WHEN sl.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS LY_TAG,
      SUM(CASE WHEN sl.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN sl.SALEAMT ELSE 0 END) AS LY_SALE
    FROM BCAVE.SEWON.SW_SALEINFO sl
    JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
    ${itemFilter ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD` : ''}
    WHERE sl.BRANDCD IN ${brandInClause}
      AND sl.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.mtdEnd}'
      ${channelFilter.replace(/v\.SHOPTYPENM/g, 'sh.SHOPTYPENM')}
      ${itemFilter.replace(/si\.ITEMNM/g, 'si.ITEMNM')}
    GROUP BY sl.BRANDCD, sh.SHOPTYPENM
  `

  const [revRows, dcRows] = await Promise.all([
    snowflakeQuery<{
      BRANDNM: string; SHOPTYPENM: string
      REV: unknown; LY_REV: unknown; COST: unknown; LY_COST: unknown
    }>(revSql),
    snowflakeQuery<{
      BRANDCD: string; SHOPTYPENM: string
      TAG: unknown; SALE: unknown; LY_TAG: unknown; LY_SALE: unknown
    }>(dcSql),
  ])

  // Build discount lookup keyed by BRANDCD+SHOPTYPENM
  const dcMap = new Map<string, { dcRate: number; lyDcRate: number }>()
  for (const d of dcRows) {
    const tag = safeNum(d.TAG)
    const sale = safeNum(d.SALE)
    const lyTag = safeNum(d.LY_TAG)
    const lySale = safeNum(d.LY_SALE)
    const dcRate = tag ? Math.round(((tag - sale) / tag) * 10000) / 100 : 0
    const lyDcRate = lyTag ? Math.round(((lyTag - lySale) / lyTag) * 10000) / 100 : 0
    dcMap.set(`${d.BRANDCD}||${d.SHOPTYPENM}`, { dcRate, lyDcRate })
  }

  const rows = revRows.map(r => {
    const rev = safeNum(r.REV)
    const lyRev = safeNum(r.LY_REV)
    const cost = safeNum(r.COST)
    const lyCost = safeNum(r.LY_COST)
    const cogsRate = calcRate(cost, rev)
    const lyCogsRate = calcRate(lyCost, lyRev)

    // Discount lookup — BRANDNM may differ from BRANDCD; try direct key match
    // We pass BRANDNM from view but dcMap key uses BRANDCD.
    // Use a fallback: iterate dcMap for matching SHOPTYPENM entry
    const dcKey = [...dcMap.keys()].find(k => k.endsWith(`||${r.SHOPTYPENM}`)) ?? ''
    const dc = dcMap.get(dcKey) ?? { dcRate: 0, lyDcRate: 0 }

    return {
      brand: r.BRANDNM,
      channel: r.SHOPTYPENM,
      rev,
      lyRev,
      cogsRate,
      lyCogsRate,
      dcRate: dc.dcRate,
      lyDcRate: dc.lyDcRate,
    }
  })

  return NextResponse.json({ rows })
}

// ─── Tab 3: 매장 손익 ─────────────────────────────────────────────────────────
async function getShopPnl(
  brandInClause: string,
  dates: ReturnType<typeof getDateRanges>,
  channelFilter: string,
  itemFilter: string,
) {
  const sql = `
    SELECT
      v.SHOPCD,
      MAX(sh.SHOPNM) AS SHOPNM,
      MAX(sh.SHOPTYPENM) AS SHOPTYPENM,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.mtdStart}' AND '${dates.mtdEnd}' THEN COALESCE(si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS COST,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_REV,
      SUM(CASE WHEN v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.lyMtdEnd}' THEN COALESCE(si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS LY_COST
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD = sh.SHOPCD
    LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
    WHERE v.BRANDCD IN ${brandInClause}
      AND v.SALEDT BETWEEN '${dates.lyMtdStart}' AND '${dates.mtdEnd}'
      ${channelFilter ? channelFilter.replace(/v\.SHOPTYPENM/g, 'sh.SHOPTYPENM') : ''}
      ${itemFilter}
    GROUP BY v.SHOPCD
    ORDER BY REV DESC
  `

  const rows = await snowflakeQuery<{
    SHOPCD: string; SHOPNM: string; SHOPTYPENM: string
    REV: unknown; COST: unknown; LY_REV: unknown; LY_COST: unknown
  }>(sql)

  const shops = rows.map(r => {
    const rev = safeNum(r.REV)
    const cost = safeNum(r.COST)
    const lyRev = safeNum(r.LY_REV)
    const lyCost = safeNum(r.LY_COST)
    const grossProfit = rev - cost
    const lyGrossProfit = lyRev - lyCost
    const profitRate = rev ? Math.round((grossProfit / rev) * 10000) / 100 : 0
    return {
      shopCd: r.SHOPCD,
      shopNm: r.SHOPNM,
      shopType: r.SHOPTYPENM,
      rev,
      cost,
      grossProfit,
      profitRate,
      lyRev,
      lyGrossProfit,
    }
  })

  return NextResponse.json({ shops })
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
// GET /api/sales/shops?brand=all&tab=top-shops&channel=백화점&item=티셔츠&month=202603
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const brandParam = searchParams.get('brand') || 'all'
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const tab = (searchParams.get('tab') || 'top-shops') as 'top-shops' | 'profitability' | 'shop-pnl'
  const channelParam = searchParams.get('channel') || ''
  const itemParam = searchParams.get('item') || ''
  const monthParam = searchParams.get('month') || ''

  const dates = getDateRanges(monthParam || undefined)

  // Channel filter against VW_SALES_VAT column
  const channelFilter = channelParam
    ? `AND v.SHOPTYPENM = '${channelParam.replace(/'/g, "''")}'`
    : ''

  // Item filter via SW_STYLEINFO join (requires the join to be present in the query)
  const itemFilter = itemParam
    ? `AND si.ITEMNM = '${itemParam.replace(/'/g, "''")}'`
    : ''

  try {
    switch (tab) {
      case 'top-shops':
        return await getTopShops(brandInClause, dates, channelFilter, itemFilter)
      case 'profitability':
        return await getProfitability(brandInClause, dates, channelFilter, itemFilter)
      case 'shop-pnl':
        return await getShopPnl(brandInClause, dates, channelFilter, itemFilter)
      default:
        return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
    }
  } catch (err) {
    console.error('[/api/sales/shops]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Query failed' },
      { status: 500 },
    )
  }
}
