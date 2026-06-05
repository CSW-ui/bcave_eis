import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'

// GET /api/sales/shop-detail?shopCd=C3001&from=20260501&to=20260520
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const shopCd = (searchParams.get('shopCd') || '').trim()
  if (!/^[A-Z0-9_-]+$/.test(shopCd)) {
    return NextResponse.json({ error: 'shopCd 형식 오류' }, { status: 400 })
  }

  const from = (searchParams.get('from') || '').replace(/[^0-9]/g, '')
  const to = (searchParams.get('to') || '').replace(/[^0-9]/g, '')
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYYMMDD 형식' }, { status: 400 })
  }
  if (from > to) return NextResponse.json({ error: 'from > to' }, { status: 400 })

  // WoS 계산용: 최근 4주(28일) 평균 판매 - to 기준 역산
  const toD = new Date(Number(to.slice(0,4)), Number(to.slice(4,6))-1, Number(to.slice(6,8)))
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const last4wStart = fmt(new Date(toD.getTime() - 27 * 86400000))

  try {
    const [shopInfo, sales, last4w, shopInv, whInv, orderAgg] = await Promise.all([
      // 매장 정보
      snowflakeQuery<Record<string, string>>(`
        SELECT SHOPCD, SHOPNM, AREANM, SHOPTYPENM, BRANDCD
        FROM BCAVE.SEWON.SW_SHOPINFO
        WHERE SHOPCD = '${shopCd}'
        LIMIT 1
      `),
      // SKU 단위 기간 매출 (VAT 포함 → /1.1)
      // STORE_REV (매장 워크인) = SALETYPE in (NULL,'정상') × PRICETYPE in (NULL,'정상','할인','균일')
      // OTHER_REV (기타) = 워크인 외 모든 매출 (단, 맞교환·예약(완불) 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT STYLECD, COLORCD, SIZECD,
          SUM(SALEQTY) as QTY,
          SUM(SALEAMT) / 1.1 as REV,
          SUM(DCAMT) / 1.1 as DC,
          SUM(CASE WHEN
            (SALETYPENM IS NULL OR SALETYPENM = '정상')
            AND (PRICETYPENM IS NULL OR PRICETYPENM IN ('정상','할인','균일'))
            THEN SALEAMT ELSE 0 END) / 1.1 as STORE_REV,
          SUM(CASE WHEN NOT (
            (SALETYPENM IS NULL OR SALETYPENM = '정상')
            AND (PRICETYPENM IS NULL OR PRICETYPENM IN ('정상','할인','균일'))
          ) AND (SALETYPENM IS NULL OR SALETYPENM NOT IN ('맞교환','예약(완불)'))
            THEN SALEAMT ELSE 0 END) / 1.1 as OTHER_REV
        FROM BCAVE.SEWON.SW_SALEINFO
        WHERE SHOPCD = '${shopCd}'
          AND SALEDT BETWEEN '${from}' AND '${to}'
        GROUP BY STYLECD, COLORCD, SIZECD
      `),
      // 최근 4주 SKU 판매수량 (WoS 계산용)
      snowflakeQuery<Record<string, string>>(`
        SELECT STYLECD, COLORCD, SIZECD, SUM(SALEQTY) as QTY_4W
        FROM BCAVE.SEWON.SW_SALEINFO
        WHERE SHOPCD = '${shopCd}'
          AND SALEDT BETWEEN '${last4wStart}' AND '${to}'
        GROUP BY STYLECD, COLORCD, SIZECD
      `),
      // 매장 재고 (SKU 단위)
      snowflakeQuery<Record<string, string>>(`
        SELECT STYLECD, COLORCD, SIZECD, SUM(INVQTY) as SHOP_INV
        FROM BCAVE.SEWON.SW_SHOPINV
        WHERE SHOPCD = '${shopCd}'
        GROUP BY STYLECD, COLORCD, SIZECD
      `),
      // 창고 합산 재고 (SKU 단위, 매장과 관련된 SKU만 필터링은 클라이언트에서 처리)
      snowflakeQuery<Record<string, string>>(`
        SELECT STYLECD, COLORCD, SIZECD, SUM(AVAILQTY) as WH_INV
        FROM BCAVE.SEWON.SW_WHINV
        WHERE STYLECD IN (
          SELECT DISTINCT STYLECD FROM BCAVE.SEWON.SW_SALEINFO WHERE SHOPCD = '${shopCd}' AND SALEDT BETWEEN '${last4wStart}' AND '${to}'
          UNION
          SELECT DISTINCT STYLECD FROM BCAVE.SEWON.SW_SHOPINV WHERE SHOPCD = '${shopCd}'
        )
        GROUP BY STYLECD, COLORCD, SIZECD
      `),
      // 주문 수 + 매출(영수증 단위 평균용): SALETYPENM='라이브' 제외
      // 영수증 키: SALEDT + SALENO (SALENO는 일자별 0001부터 리셋되므로 단독 사용 시 중복)
      // 라이브 매출은 별도 KPI로 노출
      // - SALENO는 면세점/온라인/해외 채널에서 회계상 정산 묶음(영수증 아님)이라 외부 화이트리스트에서만 사용
      snowflakeQuery<Record<string, string>>(`
        SELECT
          COUNT(DISTINCT CASE WHEN SALETYPENM IS NULL OR SALETYPENM != '라이브' THEN SALEDT || '|' || SALENO END) as ORDER_CNT,
          SUM(CASE WHEN SALETYPENM IS NULL OR SALETYPENM != '라이브' THEN SALEAMT ELSE 0 END) / 1.1 as RETAIL_REV,
          SUM(CASE WHEN SALETYPENM = '라이브' THEN SALEAMT ELSE 0 END) / 1.1 as LIVE_REV
        FROM BCAVE.SEWON.SW_SALEINFO
        WHERE SHOPCD = '${shopCd}'
          AND SALEDT BETWEEN '${from}' AND '${to}'
      `),
    ])

    const shop = shopInfo[0] ?? null
    if (!shop) return NextResponse.json({ error: '매장 정보를 찾을 수 없습니다.' }, { status: 404 })

    // 상품정보 (스타일별 1줄)
    const allStyles = new Set<string>()
    sales.forEach(r => allStyles.add(r.STYLECD))
    shopInv.forEach(r => allStyles.add(r.STYLECD))
    const styleArr = Array.from(allStyles).filter(Boolean)
    // 같은 STYLECD가 여러 브랜드에 존재할 수 있음 → 매장 메인 브랜드 우선, 없으면 아무 거나
    const styleInfo = styleArr.length > 0 ? await snowflakeQuery<Record<string, string>>(`
      SELECT STYLECD,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN STYLENM ELSE NULL END) as STYLENM_MAIN,
        MAX(STYLENM) as STYLENM_ANY,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN ITEMNM ELSE NULL END) as ITEMNM_MAIN,
        MAX(ITEMNM) as ITEMNM_ANY,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN YEARCD ELSE NULL END) as YEARCD_MAIN,
        MAX(YEARCD) as YEARCD_ANY,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN SEASONNM ELSE NULL END) as SEASONNM_MAIN,
        MAX(SEASONNM) as SEASONNM_ANY,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN TAGPRICE ELSE NULL END) as TAGPRICE_MAIN,
        MAX(TAGPRICE) as TAGPRICE_ANY,
        MAX(CASE WHEN BRANDCD = '${shop.BRANDCD}' THEN PRODCOST ELSE NULL END) as PRODCOST_MAIN,
        MAX(PRODCOST) as PRODCOST_ANY
      FROM BCAVE.SEWON.SW_STYLEINFO
      WHERE STYLECD IN (${styleArr.map(s => `'${s.replace(/'/g, "''")}'`).join(',')})
      GROUP BY STYLECD
    `) : []
    const styleMap = new Map(styleInfo.map(s => [s.STYLECD, {
      STYLENM: s.STYLENM_MAIN ?? s.STYLENM_ANY,
      ITEMNM: s.ITEMNM_MAIN ?? s.ITEMNM_ANY,
      YEARCD: s.YEARCD_MAIN ?? s.YEARCD_ANY,
      SEASONNM: s.SEASONNM_MAIN ?? s.SEASONNM_ANY,
      TAGPRICE: s.TAGPRICE_MAIN ?? s.TAGPRICE_ANY,
      PRODCOST: s.PRODCOST_MAIN ?? s.PRODCOST_ANY,
    }]))

    // 키 = STYLECD|COLORCD|SIZECD
    const k = (a: string, b: string, c: string) => `${a}|${b ?? ''}|${c ?? ''}`
    const last4wMap = new Map(last4w.map(r => [k(r.STYLECD, r.COLORCD, r.SIZECD), Number(r.QTY_4W) || 0]))
    const shopInvMap = new Map(shopInv.map(r => [k(r.STYLECD, r.COLORCD, r.SIZECD), Number(r.SHOP_INV) || 0]))
    const whInvMap = new Map(whInv.map(r => [k(r.STYLECD, r.COLORCD, r.SIZECD), Number(r.WH_INV) || 0]))

    // SKU 통합: 매출 row + 매장재고 row + (매장과 관련된 창고재고 row)
    const skuSet = new Set<string>()
    sales.forEach(r => skuSet.add(k(r.STYLECD, r.COLORCD, r.SIZECD)))
    shopInv.forEach(r => skuSet.add(k(r.STYLECD, r.COLORCD, r.SIZECD)))

    const salesMap = new Map(sales.map(r => [k(r.STYLECD, r.COLORCD, r.SIZECD), {
      qty: Number(r.QTY) || 0,
      rev: Number(r.REV) || 0,
      dc: Number(r.DC) || 0,
      storeRev: Number(r.STORE_REV) || 0,
      otherRev: Number(r.OTHER_REV) || 0,
    }]))

    const periodDays = Math.floor((toD.getTime() - new Date(Number(from.slice(0,4)), Number(from.slice(4,6))-1, Number(from.slice(6,8))).getTime()) / 86400000) + 1

    const skus = Array.from(skuSet).map(key => {
      const [styleCd, colorCd, sizeCd] = key.split('|')
      const s = styleMap.get(styleCd)
      const sale = salesMap.get(key) ?? { qty: 0, rev: 0, dc: 0, storeRev: 0, otherRev: 0 }
      const shopInvQ = shopInvMap.get(key) ?? 0
      const whInvQ = whInvMap.get(key) ?? 0
      const qty4w = last4wMap.get(key) ?? 0
      const avgWeekly = qty4w / 4
      const tagPrice = (Number(s?.TAGPRICE) || 0) / 1.1
      const tagBase = tagPrice * sale.qty
      const dcRate = tagBase > 0 ? Math.round((1 - sale.rev / tagBase) * 1000) / 10 : 0
      const sellThrough = (sale.qty + shopInvQ) > 0
        ? Math.round(sale.qty / (sale.qty + shopInvQ) * 1000) / 10 : 0
      const wos = avgWeekly > 0 ? Math.round(shopInvQ / avgWeekly * 10) / 10 : (shopInvQ > 0 ? 99 : 0)
      return {
        styleCd, colorCd, sizeCd,
        styleNm: s?.STYLENM ?? styleCd,
        itemNm: s?.ITEMNM ?? '',
        season: s?.SEASONNM ?? '',
        year: s?.YEARCD ?? '',
        tagPrice: Math.round(tagPrice),
        rev: Math.round(sale.rev),
        storeRev: Math.round(sale.storeRev),
        otherRev: Math.round(sale.otherRev),
        qty: sale.qty,
        qty4w,
        shopInv: shopInvQ,
        whInv: whInvQ,
        sellThrough, wos, dcRate,
      }
    }).sort((a, b) => b.rev - a.rev)

    const totRev = skus.reduce((s, r) => s + r.rev, 0)
    const totQty = skus.reduce((s, r) => s + r.qty, 0)
    const totShopInv = skus.reduce((s, r) => s + r.shopInv, 0)
    const totWhInv = skus.reduce((s, r) => s + r.whInv, 0)
    const tot4w = Array.from(last4wMap.values()).reduce((s, v) => s + v, 0)
    const avgWeeklyTot = tot4w / 4
    const tagBaseTot = skus.reduce((s, r) => s + (r.tagPrice * r.qty), 0)

    return NextResponse.json({
      shop: {
        shopCd: shop.SHOPCD,
        shopNm: shop.SHOPNM ?? shop.SHOPCD,
        area: shop.AREANM ?? '',
        channel: shop.SHOPTYPENM ?? '',
        brandcd: shop.BRANDCD,
      },
      kpi: (() => {
        // 영수증 단위 ATV는 현장결제 채널에서만 의미 있음
        // (면세점·온라인·해외 등은 SALENO가 정산 묶음이라 비현실적 평균이 나옴)
        const RETAIL_CHANNELS = new Set(['백화점','아울렛','직영점','본사매장','가두점','대리점','팝업'])
        const isRetail = RETAIL_CHANNELS.has(shop.SHOPTYPENM ?? '')
        const orderCount = Number(orderAgg[0]?.ORDER_CNT) || 0
        const retailRev = Number(orderAgg[0]?.RETAIL_REV) || 0
        const liveRev = Math.round(Number(orderAgg[0]?.LIVE_REV) || 0)
        return {
          rev: totRev, qty: totQty, atv: totQty > 0 ? Math.round(totRev / totQty) : 0,
          // 화이트리스트 채널에서만 노출, 그 외는 null (UI에서 "—" 표시)
          orderCount: isRetail ? orderCount : null,
          avgOrderRev: isRetail && orderCount > 0 ? Math.round(retailRev / orderCount) : null,
          liveRev,
          shopInv: totShopInv, whInv: totWhInv,
          wos: avgWeeklyTot > 0 ? Math.round(totShopInv / avgWeeklyTot * 10) / 10 : 0,
          dcRate: tagBaseTot > 0 ? Math.round((1 - totRev / tagBaseTot) * 1000) / 10 : 0,
          periodDays,
        }
      })(),
      skus,
      meta: { from, to, last4wStart, shopCd },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
