import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// GET /api/sales/channel-detail?brand=all&channel=백화점&shopCd=C2037
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const channel = searchParams.get('channel') || ''
  const selShopCd = searchParams.get('shopCd') || ''
  const selItem = searchParams.get('item') || ''

  if (!channel) return NextResponse.json({ error: 'channel required' }, { status: 400 })

  const brandWhere = `v.BRANDCD IN ${brandInClause}`

  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  // month 파라미터(YYYYMM): 지정 시 그 달 기준(과거월=월전체, 당월=전일마감). 없으면 현재월.
  const monthParam = (searchParams.get('month') || '').replace(/[^0-9]/g, '').slice(0, 6)
  const now = new Date()
  let anchor: Date, monthStartD: Date, monthEndD: Date
  if (/^\d{6}$/.test(monthParam)) {
    const yr = parseInt(monthParam.slice(0, 4)), mo = parseInt(monthParam.slice(4, 6))
    monthStartD = new Date(yr, mo - 1, 1)
    const lastDay = new Date(yr, mo, 0)
    if (now > lastDay) { anchor = lastDay; monthEndD = lastDay }
    else { anchor = now; monthEndD = new Date(now.getTime() - 86400000) }
  } else {
    anchor = now
    monthStartD = new Date(now.getFullYear(), now.getMonth(), 1)
    monthEndD = new Date(now.getTime() - 86400000)
  }
  const dow = anchor.getDay()
  const lastSun = new Date(anchor); lastSun.setDate(anchor.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = fD(lastSun)
  const cwStart = fD(new Date(lastSun.getTime() - 6 * 86400000))
  const pwEnd = fD(new Date(lastSun.getTime() - 7 * 86400000))
  const pwStart = fD(new Date(lastSun.getTime() - 13 * 86400000))
  const monthStart = fD(monthStartD)
  const monthEnd = fD(monthEndD)
  const monthLabel = `${monthStartD.getFullYear()}년 ${monthStartD.getMonth() + 1}월`
  const lyMonthStart = String(parseInt(monthStart) - 10000)
  const lyMonthEnd = String(parseInt(monthEnd) - 10000)
  const lyCwEnd = String(parseInt(cwEnd) - 10000)
  // 조회 범위 (월 전체 + 주간 비교 구간 포함)
  const rangeStart = monthStart < pwStart ? monthStart : pwStart
  const rangeEnd = monthEnd > cwEnd ? monthEnd : cwEnd
  const lyRangeEnd = lyMonthEnd > lyCwEnd ? lyMonthEnd : lyCwEnd
  const channelSafe = channel.replace(/'/g, "''")

  // 상품 필터 (매장 선택 시)
  const shopFilter = selShopCd ? `AND v.SHOPCD = '${selShopCd.replace(/'/g, "''")}'` : ''
  // STYLEINFO 별칭이 쿼리마다 다름: shopData/topProducts → sti, itemData → si
  const itemFilterSti = selItem ? `AND sti.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''
  const itemFilterSi = selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''

  try {
    const [shopData, lyShopData, topProducts, itemData, dcShopData, dcProductData, dcItemData] = await Promise.all([
      // 금년 매장별 실적
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPCD, v.SHOPCD as SHOPNM_SALE, MAX(si.SHOPNM) as SHOPNM, MAX(si.AREANM) as AREANM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as MTD_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN v.SALEQTY ELSE 0 END) as MTD_QTY,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN COALESCE(pc.PRECOST, sti.PRODCOST, 0) * v.SALEQTY ELSE 0 END) as MTD_COST,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV
        FROM ${SALES_VIEW} v
        LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON v.SHOPCD = si.SHOPCD
        LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON sti.STYLECD = pc.STYLECD AND sti.BRANDCD = pc.BRANDCD
        WHERE ${brandWhere} AND v.SHOPTYPENM = '${channelSafe}'
          AND v.SALEDT BETWEEN '${rangeStart}' AND '${rangeEnd}'
          ${itemFilterSti}
        GROUP BY v.SHOPCD ORDER BY MTD_REV DESC
      `),
      // 전년 동기
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPCD, SUM(v.SALEAMT_VAT_EX) as MTD_REV
        FROM ${SALES_VIEW} v
        ${selItem ? `LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD` : ''}
        WHERE ${brandWhere} AND v.SHOPTYPENM = '${channelSafe}'
          AND v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}'
          ${itemFilterSi}
        GROUP BY v.SHOPCD
      `),
      // 베스트 상품 (전주 기준, 매장 필터 적용)
      snowflakeQuery<Record<string, string>>(`
        SELECT v.STYLECD, MAX(sti.STYLENM) as STYLENM, v.BRANDCD,
          SUM(v.SALEAMT_VAT_EX) as REVENUE, SUM(v.SALEQTY) as QTY,
          SUM(COALESCE(pc.PRECOST, sti.PRODCOST, 0) * v.SALEQTY) as COST_TOTAL,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV
        FROM ${SALES_VIEW} v
        LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON sti.STYLECD = pc.STYLECD AND sti.BRANDCD = pc.BRANDCD
        WHERE ${brandWhere} AND v.SHOPTYPENM = '${channelSafe}'
          AND v.SALEDT BETWEEN '${pwStart}' AND '${cwEnd}'
          ${shopFilter}
          ${itemFilterSti}
        GROUP BY v.STYLECD, v.BRANDCD
        ORDER BY CW_REV DESC LIMIT 20
      `),
      // 품목별 실적 (금년 + 전년)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEQTY ELSE 0 END) as CW_QTY,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as MTD_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_MTD_REV
        FROM ${SALES_VIEW} v
        LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere} AND v.SHOPTYPENM = '${channelSafe}'
          AND (v.SALEDT BETWEEN '${rangeStart}' AND '${rangeEnd}' OR v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyRangeEnd}')
          ${shopFilter}
        GROUP BY si.ITEMNM
        ORDER BY MTD_REV DESC
      `),

      // 할인율용: 매장별 VW_SALES_VAT (SHOPCD별 TAG·SALEAMT_VAT_EX)
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPCD,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) as MTD_TAG,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as MTD_SALE
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SHOPTYPENM = '${channelSafe}'
          AND v.SALEDT BETWEEN '${rangeStart}' AND '${rangeEnd}'
          ${selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}'` : ''}
        GROUP BY v.SHOPCD
      `),

      // 할인율용: 상품별 VW_SALES_VAT (STYLECD별)
      snowflakeQuery<Record<string, string>>(`
        SELECT v.STYLECD,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_TOTAL,
          SUM(v.SALEAMT_VAT_EX) as SALE_TOTAL
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SHOPTYPENM = '${channelSafe}'
          AND v.SALEDT BETWEEN '${pwStart}' AND '${cwEnd}'
          ${selShopCd ? `AND v.SHOPCD = '${selShopCd.replace(/'/g, "''")}'` : ''}
          ${selItem ? `AND si.ITEMNM = '${selItem.replace(/'/g, "''")}' ` : ''}
        GROUP BY v.STYLECD
      `),

      // 할인율용: 품목별 VW_SALES_VAT (ITEMNM별)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) as MTD_TAG,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${monthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as MTD_SALE
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SHOPTYPENM = '${channelSafe}'
          AND (v.SALEDT BETWEEN '${rangeStart}' AND '${rangeEnd}' OR v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyRangeEnd}')
          ${selShopCd ? `AND v.SHOPCD = '${selShopCd.replace(/'/g, "''")}'` : ''}
        GROUP BY si.ITEMNM
      `),
    ])

    // 매장명 보완 (SW_SALEINFO에서)
    const shopCds = shopData.map(r => `'${r.SHOPCD}'`).join(',')
    const saleNmData = shopCds ? await snowflakeQuery<Record<string, string>>(`
      SELECT DISTINCT SHOPCD, SHOPNM FROM BCAVE.SEWON.SW_SALEINFO
      WHERE BRANDCD IN ${brandInClause} AND SHOPCD IN (${shopCds}) AND SALEDT >= '${monthStart}' LIMIT 500
    `) : []
    const saleNmMap = new Map(saleNmData.map(r => [r.SHOPCD, r.SHOPNM]))

    const lyMap = new Map(lyShopData.map(r => [r.SHOPCD, Number(r.MTD_REV) || 0]))
    const dcShopMap = new Map(dcShopData.map(r => [r.SHOPCD, r]))
    const dcProdMap = new Map(dcProductData.map(r => [r.STYLECD, r]))
    const dcItemMap = new Map(dcItemData.map(r => [r.ITEMNM, r]))

    const shops = shopData.map(r => {
      const mtdRev = Number(r.MTD_REV) || 0
      const dcs = dcShopMap.get(r.SHOPCD)
      const mtdTag = Number(dcs?.MTD_TAG) || 0
      const mtdSale = Number(dcs?.MTD_SALE) || 0
      const mtdCost = Number(r.MTD_COST) || 0
      const cwRev = Number(r.CW_REV) || 0
      const pwRev = Number(r.PW_REV) || 0
      const lyRev = lyMap.get(r.SHOPCD) ?? 0
      return {
        shopCd: r.SHOPCD,
        shopNm: r.SHOPNM ?? saleNmMap.get(r.SHOPCD) ?? r.SHOPCD,
        area: r.AREANM ?? '',
        mtdRev, mtdQty: Number(r.MTD_QTY) || 0,
        dcRate: mtdTag > 0 ? Math.round((1 - mtdSale / mtdTag) * 1000) / 10 : 0,
        cogsRate: mtdRev > 0 ? Math.round(mtdCost / mtdRev * 1000) / 10 : 0,
        cwRev, pwRev,
        wow: pwRev > 0 ? Math.round((cwRev - pwRev) / pwRev * 1000) / 10 : 0,
        lyRev,
        yoy: lyRev > 0 ? Math.round((mtdRev - lyRev) / lyRev * 1000) / 10 : 0,
        yoyGap: lyRev > 0 ? mtdRev - lyRev : 0,
      }
    })

    const products = topProducts.map(p => {
      const rev = Number(p.REVENUE) || 0
      const dcp = dcProdMap.get(p.STYLECD)
      const tag = Number(dcp?.TAG_TOTAL) || 0
      const sale = Number(dcp?.SALE_TOTAL) || 0
      const cost = Number(p.COST_TOTAL) || 0
      const cw = Number(p.CW_REV) || 0
      const pw = Number(p.PW_REV) || 0
      return {
        code: p.STYLECD, name: p.STYLENM ?? p.STYLECD, brand: p.BRANDCD,
        revenue: rev, qty: Number(p.QTY) || 0,
        dcRate: tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : 0,
        cogsRate: rev > 0 ? Math.round(cost / rev * 1000) / 10 : 0,
        cwRev: cw, pwRev: pw,
        wow: pw > 0 ? Math.round((cw - pw) / pw * 1000) / 10 : 0,
      }
    })

    const totalRev = shops.reduce((s, r) => s + r.mtdRev, 0)
    const totalLy = shops.reduce((s, r) => s + r.lyRev, 0)
    const totalCw = shops.reduce((s, r) => s + r.cwRev, 0)
    const totalPw = shops.reduce((s, r) => s + r.pwRev, 0)

    return NextResponse.json({
      channel, kpi: {
        shopCount: shops.length, mtdRev: totalRev, cwRev: totalCw,
        yoy: totalLy > 0 ? Math.round((totalRev - totalLy) / totalLy * 1000) / 10 : 0,
        wow: totalPw > 0 ? Math.round((totalCw - totalPw) / totalPw * 1000) / 10 : 0,
      },
      shops, products,
      items: itemData.map(r => {
        const dci = dcItemMap.get(r.ITEMNM)
        const mtdTag = Number(dci?.MTD_TAG) || 0
        const mtdSale = Number(dci?.MTD_SALE) || 0
        return {
          item: r.ITEMNM ?? '기타',
          mtdRev: Number(r.MTD_REV) || 0,
          cwRev: Number(r.CW_REV) || 0,
          pwRev: Number(r.PW_REV) || 0,
          cwQty: Number(r.CW_QTY) || 0,
          wow: Number(r.PW_REV) > 0 ? Math.round((Number(r.CW_REV) - Number(r.PW_REV)) / Number(r.PW_REV) * 1000) / 10 : 0,
          lyMtdRev: Number(r.LY_MTD_REV) || 0,
          yoy: Number(r.LY_MTD_REV) > 0 ? Math.round((Number(r.MTD_REV) - Number(r.LY_MTD_REV)) / Number(r.LY_MTD_REV) * 1000) / 10 : 0,
          dcRate: mtdTag > 0 ? Math.round((1 - mtdSale / mtdTag) * 1000) / 10 : 0,
        }
      }),
      meta: { monthStart, monthEnd, monthLabel, month: monthParam, cwStart, cwEnd, selShopCd },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
