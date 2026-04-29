import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/carryover?brand=all
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const brandList = brandParam === 'all' ? null : brandParam.split(',').filter(b => VALID_BRANDS.has(b))
  if (brandList && brandList.length === 0) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const selItem = searchParams.get('item') || ''
  const selYear = searchParams.get('yearcd') || ''

  const curYr = String(new Date().getFullYear()).slice(2) // '26'
  const brandInClause = brandList
    ? `(${brandList.map(b => `'${b}'`).join(',')})`
    : `('CO','WA','LE','CK','LK')`
  const brandWhere = `si.BRANDCD IN ${brandInClause}`
  const vBrand = `v.BRANDCD IN ${brandInClause}`

  // 전주 날짜
  const today = new Date()
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const dow = today.getDay()
  const lastSun = new Date(today); lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = fD(lastSun)
  const cwStart = fD(new Date(lastSun.getTime() - 6 * 86400000))
  const pwEnd = fD(new Date(lastSun.getTime() - 7 * 86400000))
  const pwStart = fD(new Date(lastSun.getTime() - 13 * 86400000))
  const pw2End = fD(new Date(lastSun.getTime() - 14 * 86400000))
  const pw2Start = fD(new Date(lastSun.getTime() - 20 * 86400000))
  const pw3End = fD(new Date(lastSun.getTime() - 21 * 86400000))
  const pw3Start = fD(new Date(lastSun.getTime() - 27 * 86400000))

  try {
    const [itemData, channelData, topStyles, yearData] = await Promise.all([
      // 이월 품목별 현황
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          COUNT(DISTINCT si.STYLECD) as STYLE_CNT,
          AVG(si.TAGPRICE / 1.1) as AVG_TAG,
          COALESCE(SUM(inv.INVQTY), 0) as SHOP_INV,
          COALESCE(SUM(wh.AVAILQTY), 0) as WH_AVAIL,
          COALESCE(SUM(s_cw.CW_AMT), 0) as CW_REV,
          COALESCE(SUM(s_cw.CW_QTY), 0) as CW_QTY,
          COALESCE(SUM(s_pw.PW_AMT), 0) as PW_REV,
          COALESCE(SUM(s_pw.PW_QTY), 0) as PW_QTY,
          COALESCE(SUM(s_pw2.PW2_QTY), 0) as PW2_QTY,
          COALESCE(SUM(s_pw3.PW3_QTY), 0) as PW3_QTY,
          COALESCE(SUM(s_all.TOTAL_AMT), 0) as TOTAL_REV,
          COALESCE(SUM(s_all.TOTAL_QTY), 0) as TOTAL_QTY
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, SUM(INVQTY) as INVQTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) inv ON si.STYLECD = inv.STYLECD
        LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) as AVAILQTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) wh ON si.STYLECD = wh.STYLECD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as CW_AMT, SUM(v.SALEQTY) as CW_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_cw ON si.STYLECD = s_cw.STYLECD AND si.BRANDCD = s_cw.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as PW_AMT, SUM(v.SALEQTY) as PW_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw ON si.STYLECD = s_pw.STYLECD AND si.BRANDCD = s_pw.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as PW2_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pw2Start}' AND '${pw2End}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw2 ON si.STYLECD = s_pw2.STYLECD AND si.BRANDCD = s_pw2.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as PW3_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pw3Start}' AND '${pw3End}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw3 ON si.STYLECD = s_pw3.STYLECD AND si.BRANDCD = s_pw3.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as TOTAL_AMT, SUM(v.SALEQTY) as TOTAL_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT >= '20${curYr}0101' GROUP BY v.STYLECD, v.BRANDCD
        ) s_all ON si.STYLECD = s_all.STYLECD AND si.BRANDCD = s_all.BRANDCD
        WHERE ${brandWhere} AND si.YEARCD < '${curYr}' ${selYear ? `AND si.YEARCD = '${selYear}'` : ''}
          AND (COALESCE(inv.INVQTY, 0) + COALESCE(wh.AVAILQTY, 0)) > 0
        GROUP BY si.ITEMNM
        ORDER BY SHOP_INV + WH_AVAIL DESC
      `),

      // 이월 채널별 판매 현황
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPTYPENM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV,
          SUM(v.SALEAMT_VAT_EX) as TOTAL_REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrand} AND si.YEARCD < '${curYr}' ${selYear ? `AND si.YEARCD = '${selYear}'` : ''}
          AND v.SALEDT >= '20${curYr}0101'
          ${selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''}
        GROUP BY v.SHOPTYPENM
        ORDER BY TOTAL_REV DESC
      `),

      // 이월 적체 상품 TOP 30 (재고금액 높은 순)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.STYLECD, si.STYLENM, si.BRANDCD, si.ITEMNM, si.YEARCD, si.TAGPRICE / 1.1 as TAGPRICE,
          COALESCE(inv.INVQTY, 0) as SHOP_INV,
          COALESCE(wh.AVAILQTY, 0) as WH_AVAIL,
          COALESCE(s.SALE_QTY, 0) as SALE_QTY,
          COALESCE(s.SALE_AMT, 0) as SALE_AMT,
          COALESCE(s_cw.CW_AMT, 0) as CW_REV,
          COALESCE(s_cw.CW_QTY, 0) as CW_QTY,
          COALESCE(s_pw.PW_QTY, 0) as PW_QTY,
          COALESCE(s_pw2.PW2_QTY, 0) as PW2_QTY,
          COALESCE(s_pw3.PW3_QTY, 0) as PW3_QTY
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, SUM(INVQTY) as INVQTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) inv ON si.STYLECD = inv.STYLECD
        LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) as AVAILQTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) wh ON si.STYLECD = wh.STYLECD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as SALE_QTY, SUM(v.SALEAMT_VAT_EX) as SALE_AMT
          FROM ${SALES_VIEW} v WHERE v.SALEDT >= '20${curYr}0101' GROUP BY v.STYLECD, v.BRANDCD
        ) s ON si.STYLECD = s.STYLECD AND si.BRANDCD = s.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as CW_AMT, SUM(v.SALEQTY) as CW_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_cw ON si.STYLECD = s_cw.STYLECD AND si.BRANDCD = s_cw.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as PW_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw ON si.STYLECD = s_pw.STYLECD AND si.BRANDCD = s_pw.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as PW2_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pw2Start}' AND '${pw2End}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw2 ON si.STYLECD = s_pw2.STYLECD AND si.BRANDCD = s_pw2.BRANDCD
        LEFT JOIN (
          SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEQTY) as PW3_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${pw3Start}' AND '${pw3End}' GROUP BY v.STYLECD, v.BRANDCD
        ) s_pw3 ON si.STYLECD = s_pw3.STYLECD AND si.BRANDCD = s_pw3.BRANDCD
        WHERE ${brandWhere} AND si.YEARCD < '${curYr}' ${selYear ? `AND si.YEARCD = '${selYear}'` : ''}
          ${selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''}
          AND (COALESCE(inv.INVQTY, 0) + COALESCE(wh.AVAILQTY, 0)) > 0
        ORDER BY (COALESCE(inv.INVQTY, 0) + COALESCE(wh.AVAILQTY, 0)) * (si.TAGPRICE / 1.1) DESC
      `),

      // 연도별 이월 재고 현황
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD,
          COUNT(DISTINCT si.STYLECD) as STYLE_CNT,
          COALESCE(SUM(inv.INVQTY), 0) + COALESCE(SUM(wh.AVAILQTY), 0) as TOTAL_INV,
          COALESCE(SUM(s.SALE_AMT), 0) as SALE_AMT,
          COALESCE(SUM(s.SALE_QTY), 0) as SALE_QTY,
          COALESCE(SUM(s_cw.CW_AMT), 0) as CW_REV
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, SUM(INVQTY) as INVQTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) inv ON si.STYLECD = inv.STYLECD
        LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) as AVAILQTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) wh ON si.STYLECD = wh.STYLECD
        LEFT JOIN (SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as SALE_AMT, SUM(v.SALEQTY) as SALE_QTY
          FROM ${SALES_VIEW} v WHERE v.SALEDT >= '20${curYr}0101' GROUP BY v.STYLECD, v.BRANDCD) s ON si.STYLECD = s.STYLECD AND si.BRANDCD = s.BRANDCD
        LEFT JOIN (SELECT v.STYLECD, v.BRANDCD, SUM(v.SALEAMT_VAT_EX) as CW_AMT
          FROM ${SALES_VIEW} v WHERE v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' GROUP BY v.STYLECD, v.BRANDCD) s_cw ON si.STYLECD = s_cw.STYLECD AND si.BRANDCD = s_cw.BRANDCD
        WHERE ${brandWhere} AND si.YEARCD < '${curYr}' ${selYear ? `AND si.YEARCD = '${selYear}'` : ''}
          AND (COALESCE(inv.INVQTY, 0) + COALESCE(wh.AVAILQTY, 0)) > 0
          ${selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''}
        GROUP BY si.YEARCD
        ORDER BY si.YEARCD
      `),
    ])

    // 품목별 가공
    const items = itemData.map(r => {
      const shopInv = Number(r.SHOP_INV) || 0
      const whAvail = Number(r.WH_AVAIL) || 0
      const totalInv = shopInv + whAvail
      const totalQty = Number(r.TOTAL_QTY) || 0
      const cwRev = Number(r.CW_REV) || 0
      const pwRev = Number(r.PW_REV) || 0
      const cwQty = Number(r.CW_QTY) || 0
      const pwQty = Number(r.PW_QTY) || 0
      const pw2Qty = Number(r.PW2_QTY) || 0
      const pw3Qty = Number(r.PW3_QTY) || 0
      const avgWeeklyQty = ((cwQty + pwQty + pw2Qty + pw3Qty) / 4) || 0
      const invWeeks = avgWeeklyQty > 0 ? Math.round(totalInv / avgWeeklyQty * 10) / 10 : 999
      const whRatio = totalInv > 0 ? Math.round(whAvail / totalInv * 1000) / 10 : 0
      return {
        item: r.ITEMNM ?? '기타',
        styleCnt: Number(r.STYLE_CNT) || 0,
        avgTag: Math.round(Number(r.AVG_TAG) || 0),
        shopInv, whAvail, totalInv,
        invAmt: Math.round((Number(r.AVG_TAG) || 0) * totalInv),
        totalRev: Number(r.TOTAL_REV) || 0,
        totalQty,
        cwRev, pwRev,
        wow: pwRev > 0 ? Math.round((cwRev - pwRev) / pwRev * 1000) / 10 : 0,
        sellThrough: (totalQty + totalInv) > 0 ? Math.round(totalQty / (totalQty + totalInv) * 1000) / 10 : 0,
        invWeeks, whRatio,
      }
    })

    // 채널별
    const totalChRev = channelData.reduce((s, r) => s + (Number(r.TOTAL_REV) || 0), 0)
    const channels = channelData.map(r => ({
      channel: r.SHOPTYPENM,
      cwRev: Number(r.CW_REV) || 0,
      pwRev: Number(r.PW_REV) || 0,
      totalRev: Number(r.TOTAL_REV) || 0,
      wow: Number(r.PW_REV) > 0 ? Math.round((Number(r.CW_REV) - Number(r.PW_REV)) / Number(r.PW_REV) * 1000) / 10 : 0,
      share: totalChRev > 0 ? Math.round(Number(r.TOTAL_REV) / totalChRev * 1000) / 10 : 0,
    }))

    // 적체 상품
    const staleStyles = topStyles.map(r => {
      const shopInv = Number(r.SHOP_INV) || 0
      const whAvail = Number(r.WH_AVAIL) || 0
      const totalInv = shopInv + whAvail
      const saleQty = Number(r.SALE_QTY) || 0
      const cwQty = Number(r.CW_QTY) || 0
      const pwQty = Number(r.PW_QTY) || 0
      const pw2Qty = Number(r.PW2_QTY) || 0
      const pw3Qty = Number(r.PW3_QTY) || 0
      const avgWeeklyQty = ((cwQty + pwQty + pw2Qty + pw3Qty) / 4) || 0
      const invWeeks = avgWeeklyQty > 0 ? Math.round(totalInv / avgWeeklyQty * 10) / 10 : 999
      const whRatio = totalInv > 0 ? Math.round(whAvail / totalInv * 1000) / 10 : 0
      return {
        stylecd: r.STYLECD, stylenm: r.STYLENM ?? r.STYLECD,
        brandcd: r.BRANDCD, item: r.ITEMNM, yearcd: r.YEARCD,
        tagPrice: Number(r.TAGPRICE) || 0,
        shopInv, whAvail, totalInv,
        invAmt: Math.round((Number(r.TAGPRICE) || 0) * totalInv),
        saleQty, saleAmt: Number(r.SALE_AMT) || 0,
        cwRev: Number(r.CW_REV) || 0,
        sellThrough: (saleQty + totalInv) > 0 ? Math.round(saleQty / (saleQty + totalInv) * 1000) / 10 : 0,
        invWeeks, whRatio,
      }
    })

    // KPI — 품목/연도 필터가 있으면 해당 항목만으로 계산
    const kpiItems = selItem ? items.filter(i => i.item === selItem) : items
    const totalInv = kpiItems.reduce((s, i) => s + i.totalInv, 0)
    const totalInvAmt = kpiItems.reduce((s, i) => s + i.invAmt, 0)
    const totalCwRev = kpiItems.reduce((s, i) => s + i.cwRev, 0)
    const avgSellThrough = kpiItems.length > 0
      ? Math.round(kpiItems.reduce((s, i) => s + i.sellThrough, 0) / kpiItems.length * 10) / 10 : 0
    const staleCount = staleStyles.filter(s => s.sellThrough < 10).length
    const validInvWeeks = kpiItems.filter(i => i.invWeeks < 999)
    const avgInvWeeks = validInvWeeks.length > 0
      ? Math.round(validInvWeeks.reduce((s, i) => s + i.invWeeks, 0) / validInvWeeks.length * 10) / 10 : 0

    // 연도별
    const years = yearData.map(r => {
      const totalInvY = Number(r.TOTAL_INV) || 0
      const saleQtyY = Number(r.SALE_QTY) || 0
      return {
        year: r.YEARCD, styleCnt: Number(r.STYLE_CNT) || 0,
        totalInv: totalInvY, saleAmt: Number(r.SALE_AMT) || 0, cwRev: Number(r.CW_REV) || 0,
        sellThrough: (saleQtyY + totalInvY) > 0 ? Math.round(saleQtyY / (saleQtyY + totalInvY) * 1000) / 10 : 0,
      }
    })

    return NextResponse.json({
      kpi: { totalInv, totalInvAmt, totalCwRev, avgSellThrough, staleCount, itemCount: kpiItems.length, avgInvWeeks },
      items, channels, staleStyles, years,
    })
  } catch (err) {
    console.error('Carryover error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
