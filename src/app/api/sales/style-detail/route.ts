import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'

// GET /api/sales/style-detail?styleCd=CO2301JK04&color=BK&from=20260501&to=20260520
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const styleCd = (searchParams.get('styleCd') || '').trim()
  if (!/^[A-Z0-9_-]+$/i.test(styleCd)) {
    return NextResponse.json({ error: 'styleCd 형식 오류' }, { status: 400 })
  }

  const from = (searchParams.get('from') || '').replace(/[^0-9]/g, '')
  const to = (searchParams.get('to') || '').replace(/[^0-9]/g, '')
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYYMMDD 형식' }, { status: 400 })
  }
  if (from > to) return NextResponse.json({ error: 'from > to' }, { status: 400 })

  const colorRaw = searchParams.get('color') || ''
  const color = colorRaw.replace(/[^A-Z0-9_-]/gi, '')
  const colorClauseSale = color ? `AND COLORCD = '${color}'` : ''
  const colorClauseInv = color ? `AND COLORCD = '${color}'` : ''

  // 최근 4주 (WoS용)
  const toD = new Date(Number(to.slice(0,4)), Number(to.slice(4,6))-1, Number(to.slice(6,8)))
  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const last4wStart = fmt(new Date(toD.getTime() - 27 * 86400000))

  const orderColorClause = color ? `AND COLORCD = '${color}'` : ''
  // 입고는 SW_WHININFO에 COLORCD 필터 적용 (있는 경우)
  const inboundColorClause = color ? `AND COLORCD = '${color}'` : ''

  try {
    const [styleArr, colorsArr, salesByShop, shopInvByShop, whInv, last4wByShop, orderAgg, inboundAgg, cumSalesAgg] = await Promise.all([
      // 스타일 정보 (브랜드 무관)
      snowflakeQuery<Record<string, string>>(`
        SELECT MAX(STYLENM) as STYLENM, MAX(ITEMNM) as ITEMNM,
          MAX(YEARCD) as YEARCD, MAX(SEASONNM) as SEASONNM,
          MAX(TAGPRICE) as TAGPRICE, MAX(PRODCOST) as PRODCOST,
          MAX(BRANDCD) as BRANDCD
        FROM BCAVE.SEWON.SW_STYLEINFO
        WHERE STYLECD = '${styleCd}'
      `),
      // 등장하는 컬러
      snowflakeQuery<Record<string, string>>(`
        SELECT DISTINCT COLORCD FROM (
          SELECT COLORCD FROM BCAVE.SEWON.SW_SHOPINV WHERE STYLECD = '${styleCd}'
          UNION
          SELECT COLORCD FROM BCAVE.SEWON.SW_WHINV WHERE STYLECD = '${styleCd}'
          UNION
          SELECT COLORCD FROM BCAVE.SEWON.SW_SALEINFO WHERE STYLECD = '${styleCd}' AND SALEDT >= '${last4wStart}'
        )
        WHERE COLORCD IS NOT NULL
      `),
      // 매장별 사이즈별 판매 (기간)
      // STORE_REV (매장 워크인) = SALETYPE in (NULL,'정상') × PRICETYPE in (NULL,'정상','할인','균일')
      // OTHER_REV (기타) = 워크인 외 모든 매출 (단, 맞교환·예약(완불) 제외)
      snowflakeQuery<Record<string, string>>(`
        SELECT SHOPCD, SIZECD,
          SUM(SALEQTY) as QTY,
          SUM(SALEAMT) / 1.1 as REV,
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
        WHERE STYLECD = '${styleCd}'
          AND SALEDT BETWEEN '${from}' AND '${to}'
          ${colorClauseSale}
        GROUP BY SHOPCD, SIZECD
      `),
      // 매장별 사이즈별 재고 (INV 명목 = AVAIL 가용 + TRF 이동)
      snowflakeQuery<Record<string, string>>(`
        SELECT SHOPCD, SIZECD, SUM(INVQTY) as INV, SUM(AVAILQTY) as AVAIL, SUM(TRFQTY) as TRF
        FROM BCAVE.SEWON.SW_SHOPINV
        WHERE STYLECD = '${styleCd}'
          ${colorClauseInv}
        GROUP BY SHOPCD, SIZECD
      `),
      // 창고별 사이즈별 재고
      snowflakeQuery<Record<string, string>>(`
        SELECT WHCD, WHNM, SIZECD, SUM(AVAILQTY) as INV
        FROM BCAVE.SEWON.SW_WHINV
        WHERE STYLECD = '${styleCd}'
          ${colorClauseInv}
        GROUP BY WHCD, WHNM, SIZECD
      `),
      // 매장별 최근 4주 판매 (WoS용)
      snowflakeQuery<Record<string, string>>(`
        SELECT SHOPCD, SIZECD, SUM(SALEQTY) as QTY_4W
        FROM BCAVE.SEWON.SW_SALEINFO
        WHERE STYLECD = '${styleCd}'
          AND SALEDT BETWEEN '${last4wStart}' AND '${to}'
          ${colorClauseSale}
        GROUP BY SHOPCD, SIZECD
      `),
      // 발주량 (SW_STYLEINFO_DETAIL.ORDQTY)
      snowflakeQuery<Record<string, string>>(`
        SELECT SIZECD, COLORCD, SUM(ORDQTY) as ORD_QTY
        FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
        WHERE STYLECD = '${styleCd}'
          ${orderColorClause}
        GROUP BY SIZECD, COLORCD
      `),
      // 입고량 (SW_WHININFO.INQTY)
      snowflakeQuery<Record<string, string>>(`
        SELECT SIZECD, COLORCD, SUM(INQTY) as IN_QTY
        FROM BCAVE.SEWON.SW_WHININFO
        WHERE STYLECD = '${styleCd}'
          ${inboundColorClause}
        GROUP BY SIZECD, COLORCD
      `),
      // 누적 판매수량 (전체 기간)
      snowflakeQuery<Record<string, string>>(`
        SELECT SUM(SALEQTY) as CUM_QTY
        FROM BCAVE.SEWON.SW_SALEINFO
        WHERE STYLECD = '${styleCd}'
          ${colorClauseSale}
      `),
    ])

    const style = styleArr[0] ?? null
    if (!style) return NextResponse.json({ error: '상품 정보를 찾을 수 없습니다.' }, { status: 404 })

    // 매장 정보 (등장하는 SHOPCD)
    const shopSet = new Set<string>()
    salesByShop.forEach(r => shopSet.add(r.SHOPCD))
    shopInvByShop.forEach(r => shopSet.add(r.SHOPCD))
    const shopArr = Array.from(shopSet).filter(Boolean)
    const shopInfo = shopArr.length > 0 ? await snowflakeQuery<Record<string, string>>(`
      SELECT SHOPCD, SHOPNM, SHOPTYPENM, AREANM
      FROM BCAVE.SEWON.SW_SHOPINFO
      WHERE SHOPCD IN (${shopArr.map(s => `'${s.replace(/'/g, "''")}'`).join(',')})
    `) : []
    const shopInfoMap = new Map(shopInfo.map(r => [r.SHOPCD, r]))

    // 사이즈 집합 (모든 데이터에서 등장하는 사이즈)
    const sizeSet = new Set<string>()
    salesByShop.forEach(r => sizeSet.add(r.SIZECD || '—'))
    shopInvByShop.forEach(r => sizeSet.add(r.SIZECD || '—'))
    whInv.forEach(r => sizeSet.add(r.SIZECD || '—'))

    // 매장별 데이터 구성
    type ShopRow = {
      shopCd: string; shopNm: string; channel: string; area: string
      sizes: Record<string, { qty: number; inv: number; avail: number; qty4w: number }>
      totalQty: number; totalRev: number; totalStoreRev: number; totalOtherRev: number
      totalInv: number; totalAvail: number; totalTrf: number; total4w: number
      sellThrough: number; wos: number
    }
    const shopMap = new Map<string, ShopRow>()
    const ensureShop = (shopCd: string): ShopRow => {
      let r = shopMap.get(shopCd)
      if (!r) {
        const info = shopInfoMap.get(shopCd)
        r = {
          shopCd, shopNm: info?.SHOPNM ?? shopCd,
          channel: info?.SHOPTYPENM ?? '', area: info?.AREANM ?? '',
          sizes: {}, totalQty: 0, totalRev: 0, totalStoreRev: 0, totalOtherRev: 0,
          totalInv: 0, totalAvail: 0, totalTrf: 0, total4w: 0,
          sellThrough: 0, wos: 0,
        }
        shopMap.set(shopCd, r)
      }
      return r
    }
    const ensureSize = (r: ShopRow, sz: string) => {
      if (!r.sizes[sz]) r.sizes[sz] = { qty: 0, inv: 0, avail: 0, qty4w: 0 }
      return r.sizes[sz]
    }
    for (const r of salesByShop) {
      const row = ensureShop(r.SHOPCD)
      const sz = r.SIZECD || '—'
      const s = ensureSize(row, sz)
      s.qty += Number(r.QTY) || 0
      row.totalQty += Number(r.QTY) || 0
      row.totalRev += Number(r.REV) || 0
      row.totalStoreRev += Number(r.STORE_REV) || 0
      row.totalOtherRev += Number(r.OTHER_REV) || 0
    }
    for (const r of shopInvByShop) {
      const row = ensureShop(r.SHOPCD)
      const sz = r.SIZECD || '—'
      const s = ensureSize(row, sz)
      const inv = Number(r.INV) || 0
      const avail = Number(r.AVAIL) || 0
      const trf = Number(r.TRF) || 0
      s.inv += inv
      s.avail += avail
      row.totalInv += inv
      row.totalAvail += avail
      row.totalTrf += trf
    }
    for (const r of last4wByShop) {
      const row = ensureShop(r.SHOPCD)
      const sz = r.SIZECD || '—'
      const s = ensureSize(row, sz)
      s.qty4w += Number(r.QTY_4W) || 0
      row.total4w += Number(r.QTY_4W) || 0
    }

    const shops = Array.from(shopMap.values()).map(r => {
      const avgWeekly = r.total4w / 4
      r.sellThrough = (r.totalQty + r.totalInv) > 0 ? Math.round(r.totalQty / (r.totalQty + r.totalInv) * 1000) / 10 : 0
      r.wos = avgWeekly > 0 ? Math.round(r.totalInv / avgWeekly * 10) / 10 : (r.totalInv > 0 ? 99 : 0)
      return r
    }).sort((a, b) => b.totalRev - a.totalRev || b.totalQty - a.totalQty)

    // 창고별 데이터
    type WhRow = { whCd: string; whNm: string; sizes: Record<string, number>; total: number }
    const whMap = new Map<string, WhRow>()
    for (const r of whInv) {
      let w = whMap.get(r.WHCD)
      if (!w) { w = { whCd: r.WHCD, whNm: r.WHNM ?? r.WHCD, sizes: {}, total: 0 }; whMap.set(r.WHCD, w) }
      const sz = r.SIZECD || '—'
      const inv = Number(r.INV) || 0
      w.sizes[sz] = (w.sizes[sz] ?? 0) + inv
      w.total += inv
    }
    const warehouses = Array.from(whMap.values()).sort((a, b) => b.total - a.total)

    // 전사 KPI
    const totRev = shops.reduce((s, r) => s + r.totalRev, 0)
    const totStoreRev = shops.reduce((s, r) => s + r.totalStoreRev, 0)
    const totOtherRev = shops.reduce((s, r) => s + r.totalOtherRev, 0)
    const totQty = shops.reduce((s, r) => s + r.totalQty, 0)
    const totShopInv = shops.reduce((s, r) => s + r.totalInv, 0)
    const totShopAvail = shops.reduce((s, r) => s + r.totalAvail, 0)
    const totShopTrf = shops.reduce((s, r) => s + r.totalTrf, 0)
    const totWhInv = warehouses.reduce((s, r) => s + r.total, 0)
    const tot4w = shops.reduce((s, r) => s + r.total4w, 0)
    const avgWeekly = tot4w / 4
    const tagPrice = (Number(style.TAGPRICE) || 0) / 1.1
    const tagBase = tagPrice * totQty
    const dcRate = tagBase > 0 ? Math.round((1 - totRev / tagBase) * 1000) / 10 : 0
    const sellThrough = (totQty + totShopInv) > 0 ? Math.round(totQty / (totQty + totShopInv) * 1000) / 10 : 0
    const wos = avgWeekly > 0 ? Math.round(totShopInv / avgWeekly * 10) / 10 : (totShopInv > 0 ? 99 : 0)
    const orderQty = orderAgg.reduce((s, r) => s + (Number(r.ORD_QTY) || 0), 0)
    const inboundQty = inboundAgg.reduce((s, r) => s + (Number(r.IN_QTY) || 0), 0)
    const cumQty = cumSalesAgg.reduce((s, r) => s + (Number(r.CUM_QTY) || 0), 0)
    const cumSellThrough = inboundQty > 0 ? Math.round(cumQty / inboundQty * 1000) / 10 : 0

    return NextResponse.json({
      style: {
        styleCd,
        styleNm: style.STYLENM ?? styleCd,
        itemNm: style.ITEMNM ?? '',
        year: style.YEARCD ?? '',
        season: style.SEASONNM ?? '',
        tagPrice: Math.round(tagPrice),
        prodCost: Math.round(Number(style.PRODCOST) || 0),
        brandcd: style.BRANDCD,
      },
      colors: colorsArr.map(r => r.COLORCD).filter(Boolean).sort(),
      selectedColor: color || null,
      kpi: {
        rev: Math.round(totRev),
        storeRev: Math.round(totStoreRev),
        otherRev: Math.round(totOtherRev),
        qty: totQty,
        shopInv: totShopInv, shopAvail: totShopAvail, shopTrf: totShopTrf, whInv: totWhInv,
        sellThrough, wos, dcRate,
        orderQty, inboundQty, cumQty, cumSellThrough,
      },
      shops,
      warehouses,
      sizeCols: Array.from(sizeSet).filter(s => s !== '—' || sizeSet.size === 1),
      meta: { from, to, last4wStart },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
