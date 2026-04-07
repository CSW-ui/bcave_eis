import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/styles?brand=all&year=26&season=봄,여름&item=반팔티셔츠&compareYear=25
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const brandList = brandParam === 'all' ? null : brandParam.split(',').filter(b => VALID_BRANDS.has(b))

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (brandList && brandList.length === 0) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const year       = searchParams.get('year') || '26'
  const seasons    = searchParams.get('season')?.split(',') || ['봄']
  const item       = searchParams.get('item') || ''
  const compYear   = searchParams.get('compareYear') || String(Number(year) - 1)
  const channel    = searchParams.get('channel') || ''
  const weekNum    = searchParams.get('weekNum') || ''
  const stylecd    = searchParams.get('stylecd') || ''

  if (!item) return NextResponse.json({ error: 'item parameter required' }, { status: 400 })

  const brandInClause = brandList
    ? `(${brandList.map(b => `'${b}'`).join(',')})`
    : `('CO','WA','LE','CK','LK')`
  const brandWhere = `si.BRANDCD IN ${brandInClause}`
  const vBrandWhere = `v.BRANDCD IN ${brandInClause}`
  const channelFilter = channel ? `AND v.SHOPTYPENM = '${channel.replace(/'/g, "''")}'` : ''
  const wn = weekNum ? parseInt(weekNum) : 0
  const pwn = wn - 1 > 0 ? wn - 1 : 52
  const weekFilter = weekNum ? `AND WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) IN (${wn},${pwn})` : ''
  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const itemSafe = item.replace(/'/g, "''")

  // 전주 날짜 계산
  const today = new Date()
  const dow = today.getDay()
  const lastSun = new Date(today); lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwStart = new Date(lastSun); cwStart.setDate(lastSun.getDate() - 6)
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const pwEnd = new Date(cwStart); pwEnd.setDate(cwStart.getDate() - 1)
  const pwStart = new Date(pwEnd); pwStart.setDate(pwEnd.getDate() - 6)
  const cwS = fD(cwStart); const cwE = fD(lastSun)
  const pwS = fD(pwStart); const pwE = fD(pwEnd)
  // 전년 동기간 종료일 (전주 일요일의 전년 동일 날짜)
  const lyEndDate = new Date(lastSun); lyEndDate.setFullYear(lyEndDate.getFullYear() - 1)
  const lyEndStr = fD(lyEndDate)

  function buildStyleQuery(yr: string, isCompYear?: boolean) {
    const toDtFilter = isCompYear ? `AND v.SALEDT <= '${lyEndStr}'` : ''
    return `
      SELECT si.STYLECD, si.STYLENM, si.BRANDCD, si.TAGPRICE / 1.1 as TAGPRICE, COALESCE(pc.PRECOST, si.PRODCOST, 0) as PRODCOST,
        COALESCE(SUM(v.SALEQTY), 0) AS SALE_QTY,
        COALESCE(SUM(v.SALEAMT_VAT_EX), 0) AS SALE_AMT,
        COALESCE(SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY), 0) AS COST_AMT,
        ${weekNum
          ? `COALESCE(SUM(CASE WHEN WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${parseInt(weekNum)} THEN v.SALEAMT_VAT_EX ELSE 0 END), 0) AS CW_AMT,
             COALESCE(SUM(CASE WHEN WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${parseInt(weekNum)} THEN v.SALEQTY ELSE 0 END), 0) AS CW_QTY,
             COALESCE(SUM(CASE WHEN WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD'))=${parseInt(weekNum)-1 > 0 ? parseInt(weekNum)-1 : 52} THEN v.SALEAMT_VAT_EX ELSE 0 END), 0) AS PW_AMT,`
          : `COALESCE(SUM(CASE WHEN v.SALEDT BETWEEN '${cwS}' AND '${cwE}' THEN v.SALEAMT_VAT_EX ELSE 0 END), 0) AS CW_AMT,
             COALESCE(SUM(CASE WHEN v.SALEDT BETWEEN '${cwS}' AND '${cwE}' THEN v.SALEQTY ELSE 0 END), 0) AS CW_QTY,
             COALESCE(SUM(CASE WHEN v.SALEDT BETWEEN '${pwS}' AND '${pwE}' THEN v.SALEAMT_VAT_EX ELSE 0 END), 0) AS PW_AMT,`
        }
        COALESCE(sinv.SHOP_INV, 0) AS SHOP_INV,
        COALESCE(winv.WH_AVAIL, 0) AS WH_AVAIL
      FROM BCAVE.SEWON.SW_STYLEINFO si
      LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
      LEFT JOIN ${SALES_VIEW} v
        ON si.STYLECD = v.STYLECD AND si.BRANDCD = v.BRANDCD AND v.SALEDT >= '20${yr}0101' ${toDtFilter}
        ${channelFilter} ${weekFilter}
      LEFT JOIN (SELECT STYLECD, SUM(INVQTY) AS SHOP_INV FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) sinv
        ON si.STYLECD = sinv.STYLECD
      LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) AS WH_AVAIL FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) winv
        ON si.STYLECD = winv.STYLECD
      WHERE ${brandWhere}
        AND si.YEARCD = '${yr}'
        AND si.SEASONNM IN (${seasonList})
        AND si.ITEMNM = '${itemSafe}'
      GROUP BY si.STYLECD, si.STYLENM, si.BRANDCD, si.TAGPRICE, si.PRODCOST, pc.PRECOST, sinv.SHOP_INV, winv.WH_AVAIL
      ORDER BY SALE_AMT DESC
    `
  }

  try {
    const [cyRaw, lyRaw, orderData, lyOrderData, inboundData, lyInboundData, channelData, dcRateData] = await Promise.all([
      snowflakeQuery<Record<string, string>>(buildStyleQuery(year)),
      snowflakeQuery<Record<string, string>>(buildStyleQuery(compYear, true)),
      // 스타일별 발주 (수량, 택가금액, 원가)
      snowflakeQuery<{ STYLECD: string; ORD_QTY: number; ORD_TAG_AMT: number; ORD_COST_AMT: number }>(`
        SELECT STYLECD,
          SUM(ORDQTY) AS ORD_QTY,
          SUM(ORDQTY * (TAGPRICE / 1.1)) AS ORD_TAG_AMT,
          SUM(ORDQTY * PRECOST) AS ORD_COST_AMT
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
        WHERE BRANDCD IN ${brandInClause}
          AND YEARCD = '${year}'
          AND SEASONNM IN (${seasonList})
          AND ITEMNM = '${itemSafe}'
        GROUP BY STYLECD
      `),
      // 전년 스타일별 발주
      snowflakeQuery<{ STYLECD: string; ORD_QTY: number; ORD_TAG_AMT: number; ORD_COST_AMT: number }>(`
        SELECT STYLECD,
          SUM(ORDQTY) AS ORD_QTY,
          SUM(ORDQTY * (TAGPRICE / 1.1)) AS ORD_TAG_AMT,
          SUM(ORDQTY * PRECOST) AS ORD_COST_AMT
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
        WHERE BRANDCD IN ${brandInClause}
          AND YEARCD = '${compYear}'
          AND SEASONNM IN (${seasonList})
          AND ITEMNM = '${itemSafe}'
        GROUP BY STYLECD
      `),
      // 스타일별 입고 (수량, 금액)
      snowflakeQuery<{ STYLECD: string; IN_QTY: number; IN_AMT: number }>(`
        SELECT w.STYLECD,
          SUM(w.INQTY) AS IN_QTY,
          SUM(w.INQTY * w.INPRICE) AS IN_AMT
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        WHERE ${brandWhere}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
        GROUP BY w.STYLECD
      `),
      // 전년 스타일별 입고 (수량, 금액)
      snowflakeQuery<{ STYLECD: string; IN_QTY: number; IN_AMT: number }>(`
        SELECT w.STYLECD,
          SUM(w.INQTY) AS IN_QTY,
          SUM(w.INQTY * w.INPRICE) AS IN_AMT
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        WHERE ${brandWhere}
          AND si.YEARCD = '${compYear}'
          AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
        GROUP BY w.STYLECD
      `),
      // 채널별 판매
      snowflakeQuery<{ SHOPTYPENM: string; SALE_QTY: number; SALE_AMT: number }>(`
        SELECT v.SHOPTYPENM, SUM(v.SALEQTY) AS SALE_QTY, SUM(v.SALEAMT_VAT_EX) AS SALE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${vBrandWhere}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
          AND v.SALEDT >= '20${year}0101'
          ${stylecd ? `AND v.STYLECD = '${stylecd.replace(/'/g, "''")}'` : ''}
          ${channelFilter}
          ${weekFilter}
        GROUP BY v.SHOPTYPENM ORDER BY SALE_AMT DESC
      `),

      // 6. 할인율용: VW_SALES_VAT 기반 TAG·SALEAMT_VAT_EX (스타일별)
      snowflakeQuery<Record<string, string>>(`
        SELECT v.STYLECD,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) as SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE v.BRANDCD IN ${brandInClause}
          AND si.YEARCD IN ('${year}','${compYear}')
          AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
          AND v.SALEDT >= '20${compYear}0101'
        GROUP BY v.STYLECD
      `),
    ])

    const ordMap = new Map(orderData.map(r => [r.STYLECD, r]))
    const lyOrdMap = new Map(lyOrderData.map(r => [r.STYLECD, r]))
    const inMap = new Map(inboundData.map(r => [r.STYLECD, r]))
    const lyInMap = new Map(lyInboundData.map(r => [r.STYLECD, r]))
    const dcMap = new Map(dcRateData.map(r => [r.STYLECD, r]))

    const mapRows = (rows: Record<string, string>[], useOrderData = false, orderMap2?: Map<string, any>, inboundMap?: Map<string, any>) => {
      return rows.map(r => {
        const saleQty = Number(r.SALE_QTY) || 0
        const saleAmt = Number(r.SALE_AMT) || 0
        const dcr = dcMap.get(r.STYLECD)
        const tagAmt = Number(dcr?.TAG_AMT || 0)
        const salePriceAmt = Number(dcr?.SALE_PRICE_AMT || 0)
        const costAmt = Number(r.COST_AMT) || 0
        const shopInv = Number(r.SHOP_INV) || 0
        const whAvail = Number(r.WH_AVAIL) || 0
        const totalInv = shopInv + whAvail
        // 발주
        const activeOrdMap = orderMap2 ?? ordMap
        const ord = activeOrdMap.get(r.STYLECD)
        const ordQty = ord ? Number(ord.ORD_QTY) || 0 : 0
        const ordTagAmt = ord ? Number(ord.ORD_TAG_AMT) || 0 : 0
        const ordCostAmt = ord ? Number(ord.ORD_COST_AMT) || 0 : 0
        // 입고
        const activeInMap = inboundMap ?? inMap
        const inb = activeInMap.get(r.STYLECD)
        const inQty = inb ? Number(inb.IN_QTY) || 0 : 0
        const inAmt = inb ? Number(inb.IN_AMT) || 0 : 0
        const inboundRate = ordQty > 0 ? Math.round(inQty / ordQty * 1000) / 10 : 0
        return {
          stylecd: r.STYLECD, stylenm: r.STYLENM ?? r.STYLECD, brandcd: r.BRANDCD,
          tagPrice: Number(r.TAGPRICE) || 0, prodCost: Number(r.PRODCOST) || 0,
          ordQty, ordTagAmt, ordCostAmt,
          inQty, inAmt, inboundRate,
          saleQty, saleAmt,
          dcRate: tagAmt > 0 ? Math.round((1 - salePriceAmt / tagAmt) * 1000) / 10 : 0,
          costAmt,
          cogsRate: saleAmt > 0 ? Math.round(costAmt / saleAmt * 1000) / 10 : 0,
          shopInv, whAvail, totalInv,
          sellThrough: inQty > 0 ? Math.round(saleQty / inQty * 1000) / 10 : 0,
          cwAmt: Number(r.CW_AMT) || 0,
          cwQty: Number(r.CW_QTY) || 0,
          pwAmt: Number(r.PW_AMT) || 0,
          wow: Number(r.PW_AMT) > 0 ? Math.round((Number(r.CW_AMT) - Number(r.PW_AMT)) / Number(r.PW_AMT) * 1000) / 10 : 0,
        }
      })
    }

    const channels = channelData.map(c => ({
      channel: c.SHOPTYPENM, qty: Number(c.SALE_QTY), amt: Number(c.SALE_AMT),
    }))

    return NextResponse.json({
      styles: mapRows(cyRaw, true, ordMap, inMap),
      lyStyles: mapRows(lyRaw, false, lyOrdMap, lyInMap),
      channels,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
