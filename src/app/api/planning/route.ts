import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS, ITEM_CATEGORY_MAP } from '@/lib/constants'

// GET /api/planning?brand=CO&year=26&season=봄,여름
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'

  // 콤마 구분 복수 브랜드 지원 (예: CO,WA,LE)
  const brandList = brandParam === 'all' ? null : brandParam.split(',').filter(b => VALID_BRANDS.has(b))
  if (brandList && brandList.length === 0) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const brand = brandList?.length === 1 ? brandList[0] : (brandList ? 'multi' : 'all')
  const year    = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄', '여름']

  const brandInClause = brandList
    ? `(${brandList.map(b => `'${b}'`).join(',')})`
    : `('CO','WA','LE','CK','LK')`
  const siBrandClause = `si.BRANDCD IN ${brandInClause}`
  const vBrandClause = `v.BRANDCD IN ${brandInClause}`
  const _rawBrandClause = `BRANDCD IN ${brandInClause}`

  const toDt = searchParams.get('toDt') || ''  // YYYYMMDD, 비어있으면 제한 없음
  const gender = searchParams.get('gender') || ''  // '유니' | '여성' | '' (전체)

  // 성별 필터: GENDERNM 매핑
  const genderWhere = (() => {
    if (gender === '유니') return `AND si.GENDERNM IN ('공통','남성','키즈공통')`
    if (gender === '여성') return `AND si.GENDERNM IN ('여성','키즈여자')`
    return ''
  })()

  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const saleDateFrom = `20${year}0101`
  const saleDateTo = toDt ? `AND v.SALEDT <= '${toDt}'` : ''

  // 주간 날짜 계산 (전주 마감 기준)
  const today = new Date()
  const dow = today.getDay()
  const lastSun = new Date(today); lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = lastSun
  const cwStart = new Date(lastSun); cwStart.setDate(cwStart.getDate() - 6)
  const pwEnd = new Date(cwStart); pwEnd.setDate(pwEnd.getDate() - 1)
  const pwStart = new Date(pwEnd); pwStart.setDate(pwStart.getDate() - 6)
  // 3주 전 (Rising 보정용)
  const pw2End = new Date(pwStart); pw2End.setDate(pw2End.getDate() - 1)
  const pw2Start = new Date(pw2End); pw2Start.setDate(pw2Start.getDate() - 6)
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const cwS = fD(cwStart); const cwE = fD(cwEnd)
  const pwS = fD(pwStart); const pwE = fD(pwEnd)
  const pw2S = fD(pw2Start); const pw2E = fD(pw2End)

  // 당월 날짜 계산
  const monthStart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}01`

  try {
    const [itemSummary, skuByItem, orderByItem, inboundByItem, salesByItem, shopInvByItem, whInvByItem, channelSales, dcRateByItem, bestStyles, weeklyTrend, genderSales, genderOrd, genderInbound, genderInv, genderDc] = await Promise.all([
      // 1. 품목별 스타일 마스터
      snowflakeQuery<{
        ITEMNM: string; STYLE_CNT: number; AVG_TAG: number; AVG_COST: number
      }>(`
        SELECT si.ITEMNM,
          COUNT(DISTINCT si.STYLECD) as STYLE_CNT,
          AVG(si.TAGPRICE / 1.1) as AVG_TAG,
          AVG(COALESCE(pc.PRECOST, si.PRODCOST, 0)) as AVG_COST
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
        ORDER BY STYLE_CNT DESC
      `),

      // 1-1. SKU수 (스타일×컬러 단위)
      snowflakeQuery<{
        ITEMNM: string; SKU_CNT: number
      }>(`
        SELECT si.ITEMNM,
          COUNT(DISTINCT d.STYLECD || '-' || d.COLORCD) as SKU_CNT
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON d.STYLECD = si.STYLECD AND d.BRANDCD = si.BRANDCD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 2. 발주 데이터 (SW_STYLEINFO_DETAIL): 발주수량, 발주금액(택가), 발주원가
      snowflakeQuery<{
        ITEMNM: string; ORD_QTY: number; ORD_TAG_AMT: number; ORD_COST_AMT: number
      }>(`
        SELECT d.ITEMNM,
          SUM(d.ORDQTY) as ORD_QTY,
          SUM(d.ORDQTY * (d.TAGPRICE / 1.1)) as ORD_TAG_AMT,
          SUM(d.ORDQTY * d.PRECOST) as ORD_COST_AMT
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d
        ${genderWhere ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON d.STYLECD = si.STYLECD AND d.BRANDCD = si.BRANDCD` : ''}
        WHERE d.BRANDCD IN ${brandInClause}
          AND d.YEARCD = '${year}'
          AND d.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY d.ITEMNM
      `),

      // 3. 입고 데이터 (SW_WHININFO): 입고수량, 입고금액(TAG 기준)
      snowflakeQuery<{
        ITEMNM: string; IN_QTY: number; IN_AMT: number
      }>(`
        SELECT si.ITEMNM,
          SUM(w.INQTY) as IN_QTY,
          SUM(w.INQTY * COALESCE(tp.TAGPRICE, 0)) as IN_AMT
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        LEFT JOIN (
          SELECT STYLECD, BRANDCD, CHASU, MAX(TAGPRICE / 1.1) as TAGPRICE
          FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
          GROUP BY STYLECD, BRANDCD, CHASU
        ) tp ON w.STYLECD = tp.STYLECD AND si.BRANDCD = tp.BRANDCD AND w.CHASU = tp.CHASU
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 4. 품목별 판매 실적 + 주간 실적 + 당월 실적
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as SALE_QTY,
          SUM(v.SALEAMT_VAT_EX) as SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as COST_AMT,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwS}' AND '${cwE}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_AMT,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pwS}' AND '${pwE}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_AMT,
          SUM(CASE WHEN v.SALEDT BETWEEN '${pw2S}' AND '${pw2E}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW2_AMT,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwS}' AND '${cwE}' THEN v.SALEQTY ELSE 0 END) as CW_QTY,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cwS}' AND '${cwE}' THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) as CW_COST,
          SUM(CASE WHEN v.SALEDT >= '${monthStart}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as MONTH_AMT,
          SUM(CASE WHEN v.SALEDT >= '${monthStart}' THEN v.SALEQTY ELSE 0 END) as MONTH_QTY
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SALEDT >= '${saleDateFrom}'
          ${saleDateTo}
        GROUP BY si.ITEMNM
      `),

      // 5. 품목별 매장 재고
      snowflakeQuery<{
        ITEMNM: string; SHOP_INV: number; SHOP_AVAIL: number
      }>(`
        SELECT si.ITEMNM,
          SUM(inv.INVQTY) as SHOP_INV,
          SUM(inv.AVAILQTY) as SHOP_AVAIL
        FROM BCAVE.SEWON.SW_SHOPINV inv
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON inv.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 6. 품목별 창고 재고
      snowflakeQuery<{
        ITEMNM: string; WH_AVAIL: number; WH_ONLINE: number; WH_OFFLINE: number
      }>(`
        SELECT si.ITEMNM,
          SUM(wh.AVAILQTY) as WH_AVAIL,
          SUM(wh.ONLINEQTY) as WH_ONLINE,
          SUM(wh.OFFLINEQTY) as WH_OFFLINE
        FROM BCAVE.SEWON.SW_WHINV wh
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON wh.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 7. 채널별 판매 비중
      snowflakeQuery<{
        SHOPTYPENM: string; SALE_QTY: number; SALE_AMT: number
      }>(`
        SELECT v.SHOPTYPENM,
          SUM(v.SALEQTY) as SALE_QTY,
          SUM(v.SALEAMT_VAT_EX) as SALE_AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SALEDT >= '${saleDateFrom}'
          ${saleDateTo}
        GROUP BY v.SHOPTYPENM
        ORDER BY SALE_AMT DESC
      `),

      // 8. 할인율용: VW_SALES_VAT 기반 TAG·SALEAMT_VAT_EX (전체 + 해외제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) as SALE_PRICE_AMT,
          SUM(CASE WHEN v.SHOPTYPENM != '해외 사입' THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) as DOM_TAG_AMT,
          SUM(CASE WHEN v.SHOPTYPENM != '해외 사입' THEN v.SALEAMT_VAT_EX ELSE 0 END) as DOM_SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SALEDT >= '${saleDateFrom}'
          ${toDt ? `AND v.SALEDT <= '${toDt}'` : ''}
        GROUP BY si.ITEMNM
      `),

      // 9. 베스트 스타일 (시즌누적 + 전주 + 전전주 + 최근4주)
      (() => {
        const today = new Date()
        const dow = today.getDay()
        const lastSun = new Date(today); lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
        const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
        const cwEnd = fD(lastSun)
        const cwStart = fD(new Date(lastSun.getTime() - 6 * 86400000))
        const pwEnd = fD(new Date(lastSun.getTime() - 7 * 86400000))
        const pwStart = fD(new Date(lastSun.getTime() - 13 * 86400000))
        const m4Start = fD(new Date(lastSun.getTime() - 27 * 86400000))
        return snowflakeQuery<Record<string, string>>(`
          SELECT v.STYLECD, MAX(si.STYLENM) as STYLENM, MAX(si.ITEMNM) as ITEMNM,
            MAX(si.TAGPRICE / 1.1) as TAGPRICE,
            SUM(v.SALEQTY) as SALE_QTY, SUM(v.SALEAMT_VAT_EX) as SALE_AMT,
            SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as CW_AMT,
            SUM(CASE WHEN v.SALEDT BETWEEN '${pwStart}' AND '${pwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as PW_AMT,
            SUM(CASE WHEN v.SALEDT BETWEEN '${m4Start}' AND '${cwEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) as M4_AMT,
            SUM(CASE WHEN v.SALEDT BETWEEN '${cwStart}' AND '${cwEnd}' THEN v.SALEQTY ELSE 0 END) as CW_QTY,
            SUM(CASE WHEN v.SALEDT BETWEEN '${m4Start}' AND '${cwEnd}' THEN v.SALEQTY ELSE 0 END) as M4_QTY
          FROM ${SALES_VIEW} v
          JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
          WHERE ${vBrandClause}
            AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
            AND v.SALEDT >= '${saleDateFrom}'
            ${toDt ? `AND v.SALEDT <= '${toDt}'` : ''}
          GROUP BY v.STYLECD
          ORDER BY SALE_AMT DESC
          LIMIT 30
        `)
      })(),

      // 10. 52주 주간 매출 트렌드 (금년 + 전년)
      (() => {
        const lyYear = String(Number(year) - 1)
        return snowflakeQuery<Record<string, string>>(`
          SELECT SUBSTRING(v.SALEDT, 1, 4) as YR,
            WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) as WK,
            SUM(v.SALEAMT_VAT_EX) as REV
          FROM ${SALES_VIEW} v
          JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
          WHERE ${vBrandClause}
            AND si.SEASONNM IN (${seasonList}) ${genderWhere}
            AND ((si.YEARCD = '${year}' AND v.SALEDT BETWEEN '20${year}0101' AND '20${year}1231')
              OR (si.YEARCD = '${lyYear}' AND v.SALEDT BETWEEN '20${lyYear}0101' AND '20${lyYear}1231'))
          GROUP BY YR, WK
          ORDER BY YR, WK
        `)
      })(),

      // 11. 성별 KPI 비중 (매출·판매율·할인율 산출용)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.GENDERNM,
          SUM(v.SALEAMT_VAT_EX) as SALE_AMT,
          SUM(v.SALEQTY) as SALE_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SALEDT >= '${saleDateFrom}'
          ${saleDateTo}
        GROUP BY si.GENDERNM
      `),

      // 12. 성별 발주·입고·재고
      snowflakeQuery<Record<string, string>>(`
        SELECT si.GENDERNM,
          SUM(d.ORDQTY) as ORD_QTY,
          SUM(d.ORDQTY * (d.TAGPRICE / 1.1)) as ORD_TAG_AMT
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON d.STYLECD = si.STYLECD AND d.BRANDCD = si.BRANDCD
        WHERE d.BRANDCD IN ${brandInClause}
          AND d.YEARCD = '${year}' AND d.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.GENDERNM
      `),

      // 13. 성별 입고수량
      snowflakeQuery<Record<string, string>>(`
        SELECT si.GENDERNM,
          SUM(w.INQTY) as IN_QTY
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.GENDERNM
      `),

      // 14. 성별 재고
      snowflakeQuery<Record<string, string>>(`
        SELECT si.GENDERNM,
          SUM(COALESCE(sinv.INVQTY, 0) + COALESCE(winv.AVAILQTY, 0)) as TOTAL_INV,
          SUM((COALESCE(sinv.INVQTY, 0) + COALESCE(winv.AVAILQTY, 0)) * (si.TAGPRICE / 1.1)) as INV_TAG_AMT
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, SUM(INVQTY) AS INVQTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) sinv ON si.STYLECD = sinv.STYLECD
        LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) AS AVAILQTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) winv ON si.STYLECD = winv.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.GENDERNM
      `),

      // 15. 성별 할인율
      snowflakeQuery<Record<string, string>>(`
        SELECT si.GENDERNM,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) as SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SALEDT >= '${saleDateFrom}'
          ${toDt ? `AND v.SALEDT <= '${toDt}'` : ''}
        GROUP BY si.GENDERNM
      `),
    ])

    // 품목별 데이터 조합
    const skuMap = new Map(skuByItem.map(r => [r.ITEMNM, r]))
    const orderMap = new Map(orderByItem.map(r => [r.ITEMNM, r]))
    const inboundMap = new Map(inboundByItem.map(r => [r.ITEMNM, r]))
    const salesMap = new Map(salesByItem.map(r => [r.ITEMNM as string, r]))
    const shopInvMap = new Map(shopInvByItem.map(r => [r.ITEMNM, r]))
    const whInvMap = new Map(whInvByItem.map(r => [r.ITEMNM, r]))
    const dcRateMap = new Map(dcRateByItem.map(r => [r.ITEMNM, r]))

    const items = itemSummary.map(item => {
      const sku = skuMap.get(item.ITEMNM)
      const order = orderMap.get(item.ITEMNM)
      const inbound = inboundMap.get(item.ITEMNM)
      const sales = salesMap.get(item.ITEMNM)
      const shopInv = shopInvMap.get(item.ITEMNM)
      const whInv = whInvMap.get(item.ITEMNM)

      // SKU수
      const skuCnt = Number(sku?.SKU_CNT || 0)
      // 카테고리
      const category = ITEM_CATEGORY_MAP[item.ITEMNM] || '기타'
      // 발주 (기획)
      const ordQty = Number(order?.ORD_QTY || 0)
      const ordTagAmt = Number(order?.ORD_TAG_AMT || 0)
      const ordCostAmt = Number(order?.ORD_COST_AMT || 0)
      // 입고
      const inQty = Number(inbound?.IN_QTY || 0)
      const inAmt = Number(inbound?.IN_AMT || 0)
      // 판매
      const saleQty = Number(sales?.SALE_QTY || 0)
      const saleAmt = Number(sales?.SALE_AMT || 0)
      const dc = dcRateMap.get(item.ITEMNM)
      const tagAmt = Number(dc?.TAG_AMT || 0)
      const salePriceAmt = Number(dc?.SALE_PRICE_AMT || 0)
      const costAmt = Number(sales?.COST_AMT || 0)
      const cwAmt = Number(sales?.CW_AMT || 0)
      const pwAmt = Number(sales?.PW_AMT || 0)
      const pw2Amt = Number(sales?.PW2_AMT || 0)
      const cwQty = Number(sales?.CW_QTY || 0)
      const cwCost = Number(sales?.CW_COST || 0)
      const monthAmt = Number(sales?.MONTH_AMT || 0)
      const monthQty = Number(sales?.MONTH_QTY || 0)
      // 재고
      const shopInvQty = Number(shopInv?.SHOP_INV || 0)
      const shopAvailQty = Number(shopInv?.SHOP_AVAIL || 0)
      const whAvailQty = Number(whInv?.WH_AVAIL || 0)
      const totalInv = shopInvQty + whAvailQty
      // 판매율: 판매수량 / 입고수량 (입고 기준)
      const salesRate = inQty > 0 ? (saleQty / inQty) * 100 : 0
      const avgTag = Math.round(Number(item.AVG_TAG))
      const avgCost = Math.round(Number(item.AVG_COST))
      const dcRate = tagAmt > 0 ? (1 - salePriceAmt / tagAmt) * 100 : 0
      const domTagAmt = Number(dc?.DOM_TAG_AMT || 0)
      const domSalePriceAmt = Number(dc?.DOM_SALE_PRICE_AMT || 0)
      const domDcRate = domTagAmt > 0 ? (1 - domSalePriceAmt / domTagAmt) * 100 : 0
      const cogsRate = saleAmt > 0 ? (costAmt / saleAmt) * 100 : 0
      // 입고율: 입고수량 / 발주수량
      const inboundRate = ordQty > 0 ? (inQty / ordQty) * 100 : 0
      // 재고금액 (TAG·원가)
      const invTagAmt = totalInv * avgTag
      const invCostAmt = totalInv * avgCost

      // WoW 계산 (3주 데이터로 Rising 판별)
      const wow = pwAmt > 0 ? ((cwAmt - pwAmt) / pwAmt) * 100 : 0
      const wow2 = pw2Amt > 0 ? ((pwAmt - pw2Amt) / pw2Amt) * 100 : 0
      // 최근 3주 평균 WoW
      const recentWowAvg = (wow + wow2) / 2

      return {
        item: item.ITEMNM,
        category,
        styleCnt: Number(item.STYLE_CNT),
        skuCnt,
        avgTag,
        avgCost,
        ordQty,        // 발주수량
        ordTagAmt,     // 발주금액 (택가)
        ordCostAmt,    // 발주원가
        inQty,         // 입고수량
        inAmt,         // 입고금액
        inboundRate: Math.round(inboundRate * 10) / 10,  // 입고율
        saleQty,
        saleAmt,
        tagAmt,
        salePriceAmt,
        costAmt,
        dcRate: Math.round(dcRate * 10) / 10,
        domDcRate: Math.round(domDcRate * 10) / 10,
        cogsRate: Math.round(cogsRate * 10) / 10,
        salesRate: Math.round(salesRate * 10) / 10,  // 판매율 (입고 기준)
        cwAmt, pwAmt, pw2Amt, cwQty, cwCost,
        cwCogsRate: cwAmt > 0 ? Math.round(cwCost / cwAmt * 1000) / 10 : 0,
        wow: Math.round(wow * 10) / 10,
        recentWowAvg: Math.round(recentWowAvg * 10) / 10,
        monthAmt,
        monthQty,
        shopInv: shopInvQty,
        shopAvail: shopAvailQty,
        whAvail: whAvailQty,
        totalInv,
        invTagAmt,
        invCostAmt,
        // 하위 호환: sellThrough는 salesRate로 대체하되, 기존 코드 호환용 유지
        sellThrough: Math.round(salesRate * 10) / 10,
      }
    })

    // KPI 집계
    const totalStyles = items.reduce((s, i) => s + i.styleCnt, 0)
    const totalSkus = items.reduce((s, i) => s + i.skuCnt, 0)
    const totalOrdQty = items.reduce((s, i) => s + i.ordQty, 0)
    const totalOrdTagAmt = items.reduce((s, i) => s + i.ordTagAmt, 0)
    const totalInQty = items.reduce((s, i) => s + i.inQty, 0)
    const totalInAmt = items.reduce((s, i) => s + i.inAmt, 0)
    const totalSaleAmt = items.reduce((s, i) => s + i.saleAmt, 0)
    const totalSaleQty = items.reduce((s, i) => s + i.saleQty, 0)
    const totalInvQty = items.reduce((s, i) => s + i.totalInv, 0)
    const totalCostAmt = items.reduce((s, i) => s + i.costAmt, 0)
    const totalSaleTagAmt = items.reduce((s, i) => s + i.tagAmt, 0)
    const totalSalePriceAmt = items.reduce((s, i) => s + i.salePriceAmt, 0)
    const totalMonthAmt = items.reduce((s, i) => s + i.monthAmt, 0)
    const totalMonthQty = items.reduce((s, i) => s + i.monthQty, 0)
    const totalInvTagAmt = items.reduce((s, i) => s + i.invTagAmt, 0)
    const totalInvCostAmt = items.reduce((s, i) => s + i.invCostAmt, 0)

    // 판매율 = 판매수량 / 입고수량
    const overallSalesRate = totalInQty > 0
      ? Math.round((totalSaleQty / totalInQty) * 1000) / 10 : 0
    const overallInboundRate = totalOrdQty > 0
      ? Math.round((totalInQty / totalOrdQty) * 1000) / 10 : 0
    const overallDcRate = totalSaleTagAmt > 0
      ? Math.round((1 - totalSalePriceAmt / totalSaleTagAmt) * 1000) / 10 : 0
    const overallCogsRate = totalSaleAmt > 0
      ? Math.round((totalCostAmt / totalSaleAmt) * 1000) / 10 : 0

    const channels = channelSales.map(c => ({
      channel: c.SHOPTYPENM,
      qty: Number(c.SALE_QTY),
      amt: Number(c.SALE_AMT),
    }))

    const topStyles = bestStyles.map(r => {
      const cwAmt = Number(r.CW_AMT) || 0
      const pwAmt = Number(r.PW_AMT) || 0
      const wow = pwAmt > 0 ? Math.round((cwAmt - pwAmt) / pwAmt * 1000) / 10 : 0
      return {
        styleCd: r.STYLECD,
        styleNm: r.STYLENM,
        item: r.ITEMNM,
        tagPrice: Number(r.TAGPRICE) || 0,
        saleQty: Number(r.SALE_QTY) || 0,
        saleAmt: Number(r.SALE_AMT) || 0,
        cwAmt,
        pwAmt,
        m4Amt: Number(r.M4_AMT) || 0,
        cwQty: Number(r.CW_QTY) || 0,
        m4Qty: Number(r.M4_QTY) || 0,
        wow,
      }
    })

    return NextResponse.json({
      kpi: {
        totalStyles,
        totalSkus,
        totalOrdQty, totalOrdTagAmt,
        totalInQty, totalInAmt,
        totalSaleAmt, totalSaleQty,
        totalSaleTagAmt,
        totalInvQty, totalCostAmt,
        totalMonthAmt, totalMonthQty,
        totalInvTagAmt, totalInvCostAmt,
        salesRate: overallSalesRate,
        sellThrough: overallSalesRate, // 하위 호환
        inboundRate: overallInboundRate,
        dcRate: overallDcRate,
        cogsRate: overallCogsRate,
      },
      items,
      channels,
      topStyles,
      genderSales: (() => {
        const ordMap = new Map(genderOrd.map(r => [r.GENDERNM, r]))
        const inbMap = new Map(genderInbound.map(r => [r.GENDERNM, r]))
        const invMap = new Map(genderInv.map(r => [r.GENDERNM, r]))
        const dcMap = new Map(genderDc.map(r => [r.GENDERNM, r]))
        return genderSales.map(r => {
          const g = r.GENDERNM
          const ord = ordMap.get(g)
          const inb = inbMap.get(g)
          const inv = invMap.get(g)
          const dc = dcMap.get(g)
          const inQty = Number(inb?.IN_QTY || 0)
          const saleQty = Number(r.SALE_QTY || 0)
          const tagAmt = Number(dc?.TAG_AMT || 0)
          const salePriceAmt = Number(dc?.SALE_PRICE_AMT || 0)
          return {
            gender: g,
            amt: Number(r.SALE_AMT) || 0,
            ordTagAmt: Number(ord?.ORD_TAG_AMT || 0),
            salesRate: inQty > 0 ? Math.round(saleQty / inQty * 1000) / 10 : 0,
            invTagAmt: Number(inv?.INV_TAG_AMT || 0),
            dcRate: tagAmt > 0 ? Math.round((1 - salePriceAmt / tagAmt) * 1000) / 10 : 0,
          }
        })
      })(),
      weeklyTrend: (() => {
        const cy: Record<number, number> = {}
        const ly: Record<number, number> = {}
        const curFullYear = `20${year}`
        for (const r of weeklyTrend) {
          const wk = Number(r.WK)
          const rev = Number(r.REV) || 0
          if (r.YR === curFullYear) cy[wk] = rev
          else ly[wk] = rev
        }
        return Array.from({ length: 52 }, (_, i) => ({
          week: i + 1,
          cy: cy[i + 1] || 0,
          ly: ly[i + 1] || 0,
        }))
      })(),
    })
  } catch (err) {
    console.error('Planning API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
