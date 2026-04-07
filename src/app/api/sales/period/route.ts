import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

/**
 * 시즌/기간 분석 API — 브랜드×채널 + 정상/이월 분리
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const { valid, inClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })

  const year = (searchParams.get('year') || '26').replace(/[^0-9]/g, '')
  const seasonParam = searchParams.get('season') || ''
  const fromDt = searchParams.get('fromDt') || ''
  const toDt = searchParams.get('toDt') || ''
  const lyFromDt = searchParams.get('lyFromDt') || ''
  const lyToDt = searchParams.get('lyToDt') || ''

  const seasons = seasonParam ? seasonParam.split(',').map(s => s.trim()) : ['봄', '여름', '상반기', '스탠다드']
  const seasonList = seasons.map(s => `'${s.replace(/'/g, "''")}'`).join(',')
  const prevYear = String(Number(year) - 1)

  const lyF = lyFromDt || String(Number(fromDt) - 10000)
  const lyT = lyToDt || String(Number(toDt) - 10000)
  const cyDateFilter = fromDt && toDt ? `AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'` : `AND v.SALEDT >= '20${year}0101'`
  const lyDateFilter = lyF && lyT ? `AND v.SALEDT BETWEEN '${lyF}' AND '${lyT}'` : `AND v.SALEDT >= '20${prevYear}0101'`

  // 정상/이월 분리 조건
  const isNorm = `(si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}))`
  const lyIsNorm = `(si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}))`

  const cySlDate = fromDt && toDt ? `AND sl.SALEDT BETWEEN '${fromDt}' AND '${toDt}'` : `AND sl.SALEDT >= '20${year}0101'`
  const lySlDate = lyF && lyT ? `AND sl.SALEDT BETWEEN '${lyF}' AND '${lyT}'` : `AND sl.SALEDT >= '20${prevYear}0101'`

  try {
    const [cyRows, lyRows, cyDcRows, lyDcRows] = await Promise.all([
      // 금년: 브랜드×채널 — 정상/이월 분리
      snowflakeQuery<Record<string, string>>(`
        SELECT v.BRANDCD, v.BRANDNM, v.SHOPTYPENM,
          SUM(v.SALEAMT_VAT_EX) AS REV,
          SUM(v.SALEQTY) AS QTY,
          COUNT(DISTINCT CASE WHEN sh.SHOPNM NOT LIKE '(폐)%' THEN v.SHOPCD END) AS SHOP_CNT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) AS COST,
          SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${isNorm} THEN v.SALEQTY ELSE 0 END) AS NORM_QTY,
          SUM(CASE WHEN ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS NORM_COST,
          SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
          SUM(CASE WHEN NOT ${isNorm} THEN v.SALEQTY ELSE 0 END) AS CO_QTY,
          SUM(CASE WHEN NOT ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS CO_COST
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD = sh.SHOPCD
        WHERE v.BRANDCD IN ${inClause}
          ${cyDateFilter}
        GROUP BY v.BRANDCD, v.BRANDNM, v.SHOPTYPENM
      `),

      // 전년
      snowflakeQuery<Record<string, string>>(`
        SELECT v.BRANDCD, v.BRANDNM, v.SHOPTYPENM,
          SUM(v.SALEAMT_VAT_EX) AS REV,
          COUNT(DISTINCT CASE WHEN sh.SHOPNM NOT LIKE '(폐)%' THEN v.SHOPCD END) AS SHOP_CNT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) AS COST,
          SUM(CASE WHEN ${lyIsNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${lyIsNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS NORM_COST,
          SUM(CASE WHEN NOT ${lyIsNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
          SUM(CASE WHEN NOT ${lyIsNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS CO_COST
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        LEFT JOIN BCAVE.SEWON.SW_SHOPINFO sh ON v.SHOPCD = sh.SHOPCD
        WHERE v.BRANDCD IN ${inClause}
          ${lyDateFilter}
        GROUP BY v.BRANDCD, v.BRANDNM, v.SHOPTYPENM
      `),

      // 금년 할인율: 정상/이월 분리
      snowflakeQuery<Record<string, string>>(`
        SELECT sl.BRANDCD, sh.SHOPTYPENM,
          SUM(CASE WHEN ${isNorm} THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS NORM_TAG,
          SUM(CASE WHEN ${isNorm} THEN sl.SALEAMT ELSE 0 END) AS NORM_SALE,
          SUM(CASE WHEN NOT ${isNorm} THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS CO_TAG,
          SUM(CASE WHEN NOT ${isNorm} THEN sl.SALEAMT ELSE 0 END) AS CO_SALE
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        WHERE sl.BRANDCD IN ${inClause}
          ${cySlDate}
        GROUP BY sl.BRANDCD, sh.SHOPTYPENM
      `),

      // 전년 할인율
      snowflakeQuery<Record<string, string>>(`
        SELECT sl.BRANDCD, sh.SHOPTYPENM,
          SUM(CASE WHEN ${lyIsNorm} THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS NORM_TAG,
          SUM(CASE WHEN ${lyIsNorm} THEN sl.SALEAMT ELSE 0 END) AS NORM_SALE,
          SUM(CASE WHEN NOT ${lyIsNorm} THEN (sl.TAGPRICE / 1.1) * sl.SALEQTY ELSE 0 END) AS CO_TAG,
          SUM(CASE WHEN NOT ${lyIsNorm} THEN sl.SALEAMT ELSE 0 END) AS CO_SALE
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        WHERE sl.BRANDCD IN ${inClause}
          ${lySlDate}
        GROUP BY sl.BRANDCD, sh.SHOPTYPENM
      `),
    ])

    // 결과 조합
    type Row = {
      brandcd: string; brandnm: string; channel: string
      rev: number; lyRev: number; cost: number; lyCost: number
      shopCnt: number; lyShopCnt: number
      normRev: number; lyNormRev: number; normCost: number; lyNormCost: number
      normTag: number; normSale: number; lyNormTag: number; lyNormSale: number
      coRev: number; lyCoRev: number; coCost: number; lyCoCost: number
      coTag: number; coSale: number; lyCoTag: number; lyCoSale: number
    }
    const N = (v: any) => Number(v) || 0
    const map = new Map<string, Row>()
    const key = (b: string, c: string) => `${b}::${c}`
    const empty = (brandcd: string, brandnm: string, channel: string): Row => ({
      brandcd, brandnm, channel,
      rev: 0, lyRev: 0, cost: 0, lyCost: 0, shopCnt: 0, lyShopCnt: 0,
      normRev: 0, lyNormRev: 0, normCost: 0, lyNormCost: 0,
      normTag: 0, normSale: 0, lyNormTag: 0, lyNormSale: 0,
      coRev: 0, lyCoRev: 0, coCost: 0, lyCoCost: 0,
      coTag: 0, coSale: 0, lyCoTag: 0, lyCoSale: 0,
    })

    for (const r of cyRows) {
      const k = key(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(k) || empty(r.BRANDCD, r.BRANDNM, r.SHOPTYPENM)
      row.rev += N(r.REV); row.cost += N(r.COST); row.shopCnt += N(r.SHOP_CNT)
      row.normRev += N(r.NORM_REV); row.normCost += N(r.NORM_COST)
      row.coRev += N(r.CO_REV); row.coCost += N(r.CO_COST)
      map.set(k, row)
    }
    for (const r of lyRows) {
      const k = key(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(k) || empty(r.BRANDCD, r.BRANDNM, r.SHOPTYPENM)
      row.lyRev += N(r.REV); row.lyCost += N(r.COST); row.lyShopCnt += N(r.SHOP_CNT)
      row.lyNormRev += N(r.NORM_REV); row.lyNormCost += N(r.NORM_COST)
      row.lyCoRev += N(r.CO_REV); row.lyCoCost += N(r.CO_COST)
      map.set(k, row)
    }
    for (const r of cyDcRows) {
      const k = key(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(k); if (!row) continue
      row.normTag += N(r.NORM_TAG); row.normSale += N(r.NORM_SALE)
      row.coTag += N(r.CO_TAG); row.coSale += N(r.CO_SALE)
    }
    for (const r of lyDcRows) {
      const k = key(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(k); if (!row) continue
      row.lyNormTag += N(r.NORM_TAG); row.lyNormSale += N(r.NORM_SALE)
      row.lyCoTag += N(r.CO_TAG); row.lyCoSale += N(r.CO_SALE)
    }

    const dc = (tag: number, sale: number) => tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : 0
    const cogs = (cost: number, rev: number) => rev > 0 ? Math.round(cost / rev * 1000) / 10 : 0
    const yoy = (cy: number, ly: number) => ly > 0 ? Math.round((cy - ly) / ly * 1000) / 10 : null

    const rows = Array.from(map.values()).map(r => ({
      brandcd: r.brandcd, brandnm: r.brandnm, channel: r.channel,
      // 총 매출
      rev: r.rev, lyRev: r.lyRev, yoy: yoy(r.rev, r.lyRev),
      shopCnt: r.shopCnt, lyShopCnt: r.lyShopCnt,
      dcRate: dc(r.normTag + r.coTag, r.normSale + r.coSale),
      lyDcRate: dc(r.lyNormTag + r.lyCoTag, r.lyNormSale + r.lyCoSale),
      cogsRate: cogs(r.cost, r.rev), lyCogsRate: cogs(r.lyCost, r.lyRev),
      // 정상
      normRev: r.normRev, lyNormRev: r.lyNormRev, normYoy: yoy(r.normRev, r.lyNormRev),
      normDcRate: dc(r.normTag, r.normSale), lyNormDcRate: dc(r.lyNormTag, r.lyNormSale),
      normCogsRate: cogs(r.normCost, r.normRev), lyNormCogsRate: cogs(r.lyNormCost, r.lyNormRev),
      normRatio: r.rev > 0 ? Math.round(r.normRev / r.rev * 1000) / 10 : 0,
      // 이월
      coRev: r.coRev, lyCoRev: r.lyCoRev, coYoy: yoy(r.coRev, r.lyCoRev),
      coDcRate: dc(r.coTag, r.coSale), lyCoDcRate: dc(r.lyCoTag, r.lyCoSale),
      coCogsRate: cogs(r.coCost, r.coRev), lyCoCogsRate: cogs(r.lyCoCost, r.lyCoRev),
    })).sort((a, b) => b.rev - a.rev)

    return NextResponse.json({ rows })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
