import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS, ITEM_CATEGORY_MAP } from '@/lib/constants'

// 입판재현황 API: 입고·판매·재고를 품목별·차수별로 상세 집계
// 이월 매출 포함: 해당 시즌 외 상품(이전 시즌)이 기간 내 판매된 실적
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const brandList = brandParam === 'all' ? null : brandParam.split(',').filter(b => VALID_BRANDS.has(b))
  if (brandList && brandList.length === 0) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const year = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄', '여름']
  const fromDt = searchParams.get('fromDt') || `20${year}0101`
  const toDt = searchParams.get('toDt') || ''
  const gender = searchParams.get('gender') || ''
  const genderWhere = gender === '유니' ? `AND si.GENDERNM IN ('공통','남성','키즈공통')` : gender === '여성' ? `AND si.GENDERNM IN ('여성','키즈여자')` : ''

  const brandInClause = brandList
    ? `(${brandList.map(b => `'${b}'`).join(',')})`
    : `('CO','WA','LE','CK','LK')`
  const siBrandClause = `si.BRANDCD IN ${brandInClause}`
  const vBrandClause = `v.BRANDCD IN ${brandInClause}`

  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const saleDateClause = toDt
    ? `AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    : `AND v.SALEDT >= '${fromDt}'`

  // 이월 시즌: 현재 시즌이 아닌 이전 시즌
  const prevYear = String(Number(year) - 1)

  const sBrandClause = `s.BRANDCD IN ${brandInClause}`
  const onlineChannels = `'온라인(무신사)','온라인(위탁몰)','온라인(자사몰)','온라인B2B'`
  const excludeOverseas = `AND v.SHOPTYPENM != '해외 사입'`

  // 전년 동기간 매출 비교용 날짜
  const lyFromDt = fromDt ? String(Number(fromDt) - 10000) : ''
  const lyToDt = toDt ? String(Number(toDt) - 10000) : ''
  const lySaleDateClause = lyToDt
    ? `AND v.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'`
    : `AND v.SALEDT >= '${lyFromDt}'`

  try {
    const [orderData, inboundData, salesData, salesOnlineData, invData, whInvData, carryoverSalesData, carryoverOnlineData, lyOrderData, coInvData, lySalesData, lyCoSalesData, overseasData, lyOverseasData, dcRateData, lyDcRateData, coBaseInvData, lyInboundData, cumSalesData] = await Promise.all([
      // 1. 발주 데이터: 품목별·차수별
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(d.ORDQTY) as ORD_QTY,
          SUM(d.ORDQTY * (d.TAGPRICE / 1.1)) as ORD_TAG_AMT,
          SUM(d.ORDQTY * d.PRECOST) as ORD_COST_AMT,
          COUNT(DISTINCT d.STYLECD) as ST_CNT,
          COUNT(DISTINCT d.STYLECD || '-' || d.COLORCD) as STCL_CNT,
          SUM(CASE WHEN d.CHASU = '01' THEN d.ORDQTY ELSE 0 END) as ORD_QTY_1ST,
          SUM(CASE WHEN d.CHASU = '01' THEN d.ORDQTY * (d.TAGPRICE / 1.1) ELSE 0 END) as ORD_TAG_1ST,
          SUM(CASE WHEN d.CHASU = '01' THEN d.ORDQTY * d.PRECOST ELSE 0 END) as ORD_COST_1ST,
          COUNT(DISTINCT CASE WHEN d.CHASU = '01' THEN d.STYLECD END) as ST_CNT_1ST,
          COUNT(DISTINCT CASE WHEN d.CHASU = '01' THEN d.STYLECD || '-' || d.COLORCD END) as STCL_CNT_1ST,
          SUM(CASE WHEN d.CHASU != '01' AND COALESCE(d.PONO,'') NOT IN ('글로벌','대만','대만 수주','중국','수주') THEN d.ORDQTY ELSE 0 END) as ORD_QTY_QR,
          SUM(CASE WHEN d.CHASU != '01' AND COALESCE(d.PONO,'') NOT IN ('글로벌','대만','대만 수주','중국','수주') THEN d.ORDQTY * (d.TAGPRICE / 1.1) ELSE 0 END) as ORD_TAG_QR,
          SUM(CASE WHEN d.CHASU != '01' AND COALESCE(d.PONO,'') NOT IN ('글로벌','대만','대만 수주','중국','수주') THEN d.ORDQTY * d.PRECOST ELSE 0 END) as ORD_COST_QR,
          COUNT(DISTINCT CASE WHEN d.CHASU != '01' AND COALESCE(d.PONO,'') NOT IN ('글로벌','대만','대만 수주','중국','수주') THEN d.STYLECD END) as ST_CNT_QR,
          COUNT(DISTINCT CASE WHEN d.CHASU != '01' AND COALESCE(d.PONO,'') NOT IN ('글로벌','대만','대만 수주','중국','수주') THEN d.STYLECD || '-' || d.COLORCD END) as STCL_CNT_QR
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON d.STYLECD = si.STYLECD AND d.BRANDCD = si.BRANDCD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 2. 입고 데이터 (INPRICE는 원가 기준이므로 TAGPRICE를 스타일·차수별로 집계 후 조인)
      snowflakeQuery<Record<string, string>>(`
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
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 3. 당시즌 판매 (해외사입 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as SALE_QTY,
          SUM(v.SALEAMT_VAT_EX) as SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as COST_AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          ${saleDateClause}
          ${excludeOverseas}
        GROUP BY si.ITEMNM
      `),

      // 4. 당시즌 온라인 판매
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as SALE_QTY_OL,
          SUM(v.SALEAMT_VAT_EX) as SALE_AMT_OL
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          ${saleDateClause}
          AND v.SHOPTYPENM IN (${onlineChannels})
        GROUP BY si.ITEMNM
      `),

      // 5. 매장 재고
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          COUNT(DISTINCT inv.STYLECD) as INV_ST_CNT,
          COUNT(DISTINCT inv.STYLECD || '-' || COALESCE(inv.COLORCD, '')) as INV_STCL_CNT,
          SUM(inv.INVQTY) as SHOP_INV_QTY
        FROM BCAVE.SEWON.SW_SHOPINV inv
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON inv.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 6. 창고 재고
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(wh.AVAILQTY) as WH_AVAIL
        FROM BCAVE.SEWON.SW_WHINV wh
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON wh.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 7. 이월 매출 (해외사입 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as CO_SALE_QTY,
          SUM(v.SALEAMT_VAT_EX) as CO_SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as CO_COST_AMT,
          COUNT(DISTINCT si.STYLECD) as CO_ST_CNT,
          COUNT(DISTINCT si.STYLECD) as CO_STCL_CNT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          AND NOT (si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere})
          ${saleDateClause}
          ${excludeOverseas}
        GROUP BY si.ITEMNM
      `),

      // 8. 이월 온라인 매출 (해외사입 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEAMT_VAT_EX) as CO_SALE_AMT_OL
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND NOT (si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere})
          ${saleDateClause}
          AND v.SHOPTYPENM IN (${onlineChannels})
        GROUP BY si.ITEMNM
      `),

      // 9. 전년 동시즌 발주 데이터 (전년비 비교용)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(d.ORDQTY) as LY_ORD_QTY,
          SUM(d.ORDQTY * (d.TAGPRICE / 1.1)) as LY_ORD_TAG_AMT,
          SUM(d.ORDQTY * d.PRECOST) as LY_ORD_COST_AMT,
          SUM(CASE WHEN d.CHASU != '01' THEN d.ORDQTY * (d.TAGPRICE / 1.1) ELSE 0 END) as LY_ORD_TAG_QR
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL d
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON d.STYLECD = si.STYLECD AND d.BRANDCD = si.BRANDCD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 10. 이월 재고: 이전 시즌 상품의 현재 매장+창고 재고 (스타일별 TAG단가·원가로 금액 산출)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(inv.QTY) as CO_INV_QTY,
          SUM(inv.QTY * COALESCE(tp.TAGPRICE, 0)) as CO_INV_TAG_AMT,
          SUM(inv.QTY * COALESCE(pc.PRECOST, si.PRODCOST, 0)) as CO_INV_COST_AMT
        FROM (
          SELECT STYLECD, SUM(INVQTY) as QTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD
          UNION ALL
          SELECT STYLECD, SUM(AVAILQTY) as QTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD
        ) inv
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON inv.STYLECD = si.STYLECD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        LEFT JOIN (
          SELECT STYLECD, BRANDCD, MAX(TAGPRICE / 1.1) as TAGPRICE
          FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
          GROUP BY STYLECD, BRANDCD
        ) tp ON si.STYLECD = tp.STYLECD AND si.BRANDCD = tp.BRANDCD
        WHERE ${siBrandClause}
          AND NOT (si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere})
        GROUP BY si.ITEMNM
      `),

      // 11. 전년 동기간 정상 매출 (해외사입 제외) + 전년 판매율 산출용 입고·판매수량
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEAMT_VAT_EX) as LY_SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as LY_COST_AMT,
          SUM(v.SALEQTY) as LY_SALE_QTY
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          ${lySaleDateClause}
          ${excludeOverseas}
        GROUP BY si.ITEMNM
      `),

      // 12. 전년 동기간 이월 매출 (해외사입 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEAMT_VAT_EX) as LY_CO_SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as LY_CO_COST_AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          AND NOT (si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}) ${genderWhere})
          ${lySaleDateClause}
          ${excludeOverseas}
        GROUP BY si.ITEMNM
      `),

      // 13. 해외사입 매출 (시즌 무관, 현재 기간)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as OV_SALE_QTY,
          SUM(v.SALEAMT_VAT_EX) as OV_SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) as OV_COST_AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${vBrandClause}
          ${saleDateClause}
          AND v.SHOPTYPENM = '해외 사입'
        GROUP BY si.ITEMNM
      `),

      // 14. 전년 해외사입 매출
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEAMT_VAT_EX) as LY_OV_SALE_AMT,
          SUM(v.SALEQTY) as LY_OV_SALE_QTY
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          ${lySaleDateClause}
          AND v.SHOPTYPENM = '해외 사입'
        GROUP BY si.ITEMNM
      `),

      // 15. 할인율용: VW_SALES_VAT 기반 TAG·SALEAMT_VAT_EX (정상 + 이월 + 해외사입)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM, v.SHOPTYPENM,
          CASE WHEN si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere} THEN 'NORM'
               WHEN v.SHOPTYPENM = '해외 사입' THEN 'OV'
               ELSE 'CO' END as SALE_TYPE,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) as SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND v.SALEDT >= '${fromDt}' ${toDt ? `AND v.SALEDT <= '${toDt}'` : ''}
        GROUP BY si.ITEMNM, SALE_TYPE, v.SHOPTYPENM
      `),

      // 16. 할인율용: 전년 VW_SALES_VAT (정상 + 이월)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          CASE WHEN si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}) ${genderWhere} THEN 'NORM'
               ELSE 'CO' END as SALE_TYPE,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) as SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND v.SALEDT >= '${lyFromDt}' ${lyToDt ? `AND v.SALEDT <= '${lyToDt}'` : ''}
          AND v.SHOPTYPENM != '해외 사입'
        GROUP BY si.ITEMNM, SALE_TYPE
      `),

      // 17. 이월 기초재고 (2025.12.31 스냅샷, TAG 금액)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(inv.QTY * COALESCE(tp.TAGPRICE, 0)) as CO_BASE_TAG_AMT
        FROM (
          SELECT STYLECD, SUM(INVQTY) as QTY FROM BCAVE.SEWON.SW_SHOPINV_20251231 GROUP BY STYLECD
          UNION ALL
          SELECT STYLECD, SUM(INVQTY) as QTY FROM BCAVE.SEWON.SW_WHINV_20251231 GROUP BY STYLECD
        ) inv
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON inv.STYLECD = si.STYLECD
        LEFT JOIN (
          SELECT STYLECD, BRANDCD, MAX(TAGPRICE / 1.1) as TAGPRICE
          FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
          GROUP BY STYLECD, BRANDCD
        ) tp ON si.STYLECD = tp.STYLECD AND si.BRANDCD = tp.BRANDCD
        WHERE ${siBrandClause}
          AND NOT (si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere})
        GROUP BY si.ITEMNM
      `),

      // 18. 전년 입고수량 (전년 판매율 산출용)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM, SUM(w.INQTY) as LY_IN_QTY
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        WHERE ${siBrandClause}
          AND si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
        GROUP BY si.ITEMNM
      `),

      // 19. 누계 판매수량 (기간 무관, 해외사입 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(v.SALEQTY) as CUM_SALE_QTY
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandClause}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}) ${genderWhere}
          AND v.SHOPTYPENM != '해외 사입'
        GROUP BY si.ITEMNM
      `),
    ])

    const orderMap = new Map(orderData.map(r => [r.ITEMNM, r]))
    const inboundMap = new Map(inboundData.map(r => [r.ITEMNM, r]))
    const salesMap = new Map(salesData.map(r => [r.ITEMNM, r]))
    const salesOlMap = new Map(salesOnlineData.map(r => [r.ITEMNM, r]))
    const invMap = new Map(invData.map(r => [r.ITEMNM, r]))
    const whMap = new Map(whInvData.map(r => [r.ITEMNM, r]))
    const coMap = new Map(carryoverSalesData.map(r => [r.ITEMNM, r]))
    const coOlMap = new Map(carryoverOnlineData.map(r => [r.ITEMNM, r]))
    const coBaseInvMap = new Map(coBaseInvData.map(r => [r.ITEMNM, { tagAmt: Number(r.CO_BASE_TAG_AMT) || 0 }]))
    const lyInboundMap = new Map(lyInboundData.map(r => [r.ITEMNM, Number(r.LY_IN_QTY) || 0]))
    const cumSalesMap = new Map(cumSalesData.map(r => [r.ITEMNM, Number(r.CUM_SALE_QTY) || 0]))
    const lyOrderMap = new Map(lyOrderData.map(r => [r.ITEMNM, r]))
    const coInvMap = new Map(coInvData.map(r => [r.ITEMNM, r]))
    const lySalesMap = new Map(lySalesData.map(r => [r.ITEMNM, r]))
    const lyCoSalesMap = new Map(lyCoSalesData.map(r => [r.ITEMNM, r]))
    const ovMap = new Map(overseasData.map(r => [r.ITEMNM, r]))
    const lyOvMap = new Map(lyOverseasData.map(r => [r.ITEMNM, r]))

    // 할인율용 VW_SALES_VAT 데이터를 품목×유형별 맵으로 변환
    const dcMap = new Map<string, { TAG_AMT: number; SALE_PRICE_AMT: number }>()
    const buildDcKey = (item: string, type: string) => `${item}::${type}`
    dcRateData.forEach(r => {
      // 해외사입이면서 당시즌인 경우 OV로 분류 (SALE_TYPE에서 해외사입 우선)
      const type = r.SHOPTYPENM === '해외 사입' ? 'OV' : r.SALE_TYPE
      const key = buildDcKey(r.ITEMNM, type)
      const prev = dcMap.get(key) || { TAG_AMT: 0, SALE_PRICE_AMT: 0 }
      dcMap.set(key, {
        TAG_AMT: prev.TAG_AMT + Number(r.TAG_AMT || 0),
        SALE_PRICE_AMT: prev.SALE_PRICE_AMT + Number(r.SALE_PRICE_AMT || 0),
      })
    })
    const lyDcMap = new Map<string, { TAG_AMT: number; SALE_PRICE_AMT: number }>()
    lyDcRateData.forEach(r => {
      const key = buildDcKey(r.ITEMNM, r.SALE_TYPE)
      const prev = lyDcMap.get(key) || { TAG_AMT: 0, SALE_PRICE_AMT: 0 }
      lyDcMap.set(key, {
        TAG_AMT: prev.TAG_AMT + Number(r.TAG_AMT || 0),
        SALE_PRICE_AMT: prev.SALE_PRICE_AMT + Number(r.SALE_PRICE_AMT || 0),
      })
    })

    // 모든 품목 수집
    const allItems = new Set<string>()
    orderData.forEach(r => allItems.add(r.ITEMNM as string))
    salesData.forEach(r => allItems.add(r.ITEMNM as string))
    invData.forEach(r => allItems.add(r.ITEMNM as string))
    carryoverSalesData.forEach(r => allItems.add(r.ITEMNM as string))
    coInvData.forEach(r => allItems.add(r.ITEMNM as string))
    overseasData.forEach(r => allItems.add(r.ITEMNM as string))

    const N = (v: string | undefined | null) => Number(v || 0)

    const items = Array.from(allItems).map(itemNm => {
      const o = orderMap.get(itemNm)
      const ib = inboundMap.get(itemNm)
      const s = salesMap.get(itemNm)
      const sol = salesOlMap.get(itemNm)
      const iv = invMap.get(itemNm)
      const wh = whMap.get(itemNm)
      const co = coMap.get(itemNm)
      const coOl = coOlMap.get(itemNm)
      const lyO = lyOrderMap.get(itemNm)
      const coIv = coInvMap.get(itemNm)
      const lyS = lySalesMap.get(itemNm)
      const lyCoS = lyCoSalesMap.get(itemNm)
      const ov = ovMap.get(itemNm)
      const lyOv = lyOvMap.get(itemNm)
      const category = ITEM_CATEGORY_MAP[itemNm] || '기타'

      // 발주
      const ordQty = N(o?.ORD_QTY); const ordTagAmt = N(o?.ORD_TAG_AMT); const ordCostAmt = N(o?.ORD_COST_AMT)
      const stCnt = N(o?.ST_CNT); const stclCnt = N(o?.STCL_CNT)
      const ordQty1st = N(o?.ORD_QTY_1ST); const ordTag1st = N(o?.ORD_TAG_1ST); const ordCost1st = N(o?.ORD_COST_1ST)
      const stCnt1st = N(o?.ST_CNT_1ST); const stclCnt1st = N(o?.STCL_CNT_1ST)
      const ordQtyQR = N(o?.ORD_QTY_QR); const ordTagQR = N(o?.ORD_TAG_QR); const ordCostQR = N(o?.ORD_COST_QR)
      const stCntQR = N(o?.ST_CNT_QR); const stclCntQR = N(o?.STCL_CNT_QR)
      // 입고
      const inQty = N(ib?.IN_QTY); const inAmt = N(ib?.IN_AMT)
      // 당시즌 판매
      const saleQty = N(s?.SALE_QTY); const saleAmt = N(s?.SALE_AMT); const costAmt = N(s?.COST_AMT)
      // 할인율용 (VW_SALES_VAT 기반: TAGPRICE/1.1 · SALEAMT_VAT_EX 모두 VAT제외)
      const normDc = dcMap.get(buildDcKey(itemNm, 'NORM')) || { TAG_AMT: 0, SALE_PRICE_AMT: 0 }
      const tagAmt = normDc.TAG_AMT; const salePriceAmt = normDc.SALE_PRICE_AMT
      // 온라인
      const saleAmtOl = N(sol?.SALE_AMT_OL)
      // 이월 판매
      const coSaleQty = N(co?.CO_SALE_QTY); const coSaleAmt = N(co?.CO_SALE_AMT)
      const coCostAmt = N(co?.CO_COST_AMT)
      const coStCnt = N(co?.CO_ST_CNT); const coStclCnt = N(co?.CO_STCL_CNT)
      const coSaleAmtOl = N(coOl?.CO_SALE_AMT_OL)
      const coDc = dcMap.get(buildDcKey(itemNm, 'CO')) || { TAG_AMT: 0, SALE_PRICE_AMT: 0 }
      const coTagAmt = coDc.TAG_AMT; const coSalePriceAmt = coDc.SALE_PRICE_AMT
      // 이월 비율
      const coDcRate = coTagAmt > 0 ? Math.round((1 - coSalePriceAmt / coTagAmt) * 1000) / 10 : 0
      const coCogsRate = coSaleAmt > 0 ? Math.round(coCostAmt / coSaleAmt * 1000) / 10 : 0
      // 해외사입
      const ovSaleQty = N(ov?.OV_SALE_QTY); const ovSaleAmt = N(ov?.OV_SALE_AMT)
      const ovCostAmt = N(ov?.OV_COST_AMT)
      const ovDc = dcMap.get(buildDcKey(itemNm, 'OV')) || { TAG_AMT: 0, SALE_PRICE_AMT: 0 }
      const ovTagAmt = ovDc.TAG_AMT; const ovSalePriceAmt = ovDc.SALE_PRICE_AMT
      const ovDcRate = ovTagAmt > 0 ? Math.round((1 - ovSalePriceAmt / ovTagAmt) * 1000) / 10 : 0
      const ovCogsRate = ovSaleAmt > 0 ? Math.round(ovCostAmt / ovSaleAmt * 1000) / 10 : 0
      // 전체 매출 = 당시즌 + 이월 + 해외사입
      const totalSaleAmt = saleAmt + coSaleAmt + ovSaleAmt
      const totalTagAmt = tagAmt + coTagAmt + ovTagAmt
      // 당시즌 재고
      const shopInvQty = N(iv?.SHOP_INV_QTY); const whAvail = N(wh?.WH_AVAIL)
      const totalInvQty = shopInvQty + whAvail
      const invStCnt = N(iv?.INV_ST_CNT); const invStclCnt = N(iv?.INV_STCL_CNT)
      const avgTag = ordQty > 0 ? ordTagAmt / ordQty : 0
      const avgCost = ordQty > 0 ? ordCostAmt / ordQty : 0
      const invTagAmt = totalInvQty * avgTag; const invCostAmt = totalInvQty * avgCost
      // 이월 재고 (이전 시즌 상품의 현재 매장+창고 재고, 스타일별 TAG단가·원가 적용)
      const coInvQty = N(coIv?.CO_INV_QTY)
      const coInvTagAmt = N(coIv?.CO_INV_TAG_AMT)
      const coInvCostAmt = N(coIv?.CO_INV_COST_AMT)
      // 이월 기초재고 (2025.12.31 TAG 금액)
      const coBaseTagAmt = coBaseInvMap.get(itemNm)?.tagAmt ?? 0
      // 비율
      const salesRate = (inQty - ovSaleQty) > 0 ? Math.round(saleQty / (inQty - ovSaleQty) * 1000) / 10 : 0
      const cumSaleQty = cumSalesMap.get(itemNm) ?? 0
      const cumSalesRate = (() => {
        const base = inQty - ovSaleQty
        return base > 0 ? Math.round(cumSaleQty / base * 1000) / 10 : 0
      })()
      const dcRate = tagAmt > 0 ? Math.round((1 - salePriceAmt / tagAmt) * 1000) / 10 : 0
      const cogsRate = saleAmt > 0 ? Math.round(costAmt / saleAmt * 1000) / 10 : 0
      const onlineRatio = saleAmt > 0 ? Math.round(saleAmtOl / saleAmt * 1000) / 10 : 0
      const firstCostRate = ordTag1st > 0 ? Math.round(ordCost1st / ordTag1st * 1000) / 10 : 0
      const qrCostRate = ordTagQR > 0 ? Math.round(ordCostQR / ordTagQR * 1000) / 10 : 0
      // 전년 동시즌 발주
      const lyOrdTagAmt = N(lyO?.LY_ORD_TAG_AMT)
      const lyOrdCostAmt = N(lyO?.LY_ORD_COST_AMT)
      const lyOrdTagQR = N(lyO?.LY_ORD_TAG_QR)
      const lyOrdCostRate = lyOrdTagAmt > 0 ? Math.round(lyOrdCostAmt / lyOrdTagAmt * 1000) / 10 : 0

      return {
        item: itemNm, category,
        stCnt, stclCnt, ordQty, ordTagAmt, ordCostAmt, inQty, inAmt,
        stCnt1st, stclCnt1st, ordQty1st, ordTag1st, ordCost1st,
        stCntQR, stclCntQR, ordQtyQR, ordTagQR, ordCostQR,
        saleQty, saleAmt, tagAmt, salePriceAmt, costAmt,
        saleAmtOl, onlineRatio,
        // 이월
        coSaleQty, coSaleAmt, coTagAmt, coSalePriceAmt, coCostAmt, coStCnt, coStclCnt,
        coSaleAmtOl, coDcRate, coCogsRate,
        // 해외사입
        ovSaleQty, ovSaleAmt, ovTagAmt, ovSalePriceAmt, ovCostAmt, ovDcRate, ovCogsRate,
        // 합산
        totalSaleAmt, totalTagAmt,
        // 당시즌 재고
        invStCnt, invStclCnt, totalInvQty, invTagAmt, invCostAmt, shopInvQty, whAvail,
        // 이월 재고
        coInvQty, coInvTagAmt, coInvCostAmt, coBaseTagAmt,
        // 비율
        salesRate, cumSaleQty, cumSalesRate, dcRate, cogsRate, firstCostRate, qrCostRate,
        // 전년 동시즌
        lyOrdTagAmt, lyOrdCostAmt, lyOrdTagQR, lyOrdCostRate,
        // 전년 동기간 매출
        lySaleAmt: N(lyS?.LY_SALE_AMT),
        lyCoSaleAmt: N(lyCoS?.LY_CO_SALE_AMT),
        lyOvSaleAmt: N(lyOv?.LY_OV_SALE_AMT), lyOvSaleQty: N(lyOv?.LY_OV_SALE_QTY),
        lyTotalSaleAmt: N(lyS?.LY_SALE_AMT) + N(lyCoS?.LY_CO_SALE_AMT) + N(lyOv?.LY_OV_SALE_AMT),
        // 전년 할인율·원가율 산출용 (VW_SALES_VAT 기반)
        lyTagAmt: (lyDcMap.get(buildDcKey(itemNm, 'NORM')) || { TAG_AMT: 0 }).TAG_AMT,
        lySalePriceAmt: (lyDcMap.get(buildDcKey(itemNm, 'NORM')) || { SALE_PRICE_AMT: 0 }).SALE_PRICE_AMT,
        lyCostAmt: N(lyS?.LY_COST_AMT),
        lyCoTagAmt: (lyDcMap.get(buildDcKey(itemNm, 'CO')) || { TAG_AMT: 0 }).TAG_AMT,
        lyCoSalePriceAmt: (lyDcMap.get(buildDcKey(itemNm, 'CO')) || { SALE_PRICE_AMT: 0 }).SALE_PRICE_AMT,
        lyCoCostAmt: N(lyCoS?.LY_CO_COST_AMT),
        // 전년 판매율 산출용
        lyInQty: lyInboundMap.get(itemNm) ?? 0,
        lySaleQty: N(lyS?.LY_SALE_QTY),
        // 전년 판매율 (정상)
        lySalesRate: (() => {
          const lyInQty = lyInboundMap.get(itemNm) ?? 0
          const lySaleQty = N(lyS?.LY_SALE_QTY)
          const lyOvQty = N(lyOv?.LY_OV_SALE_QTY)
          const base = lyInQty - lyOvQty
          return base > 0 ? Math.round(lySaleQty / base * 1000) / 10 : null
        })(),
        lyCoSalesRate: null as number | null,
      }
    }).sort((a, b) => b.ordTagAmt - a.ordTagAmt)

    return NextResponse.json({ items })
  } catch (err) {
    console.error('IPJ API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
