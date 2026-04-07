import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// GET /api/sales?from=202601&to=202612&brand=all
//         OR  ?fromDt=20260101&toDt=20260331&brand=CO  (일자별 모드)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const fromDt = searchParams.get('fromDt')   // YYYYMMDD  (일자 모드)
  const toDt   = searchParams.get('toDt')     // YYYYMMDD  (일자 모드)
  const from   = searchParams.get('from') || '202601' // YYYYMM (월 모드)
  const to     = searchParams.get('to')   || '202699'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  // 날짜 필터 & 전년동기 계산
  let dateClause:   string
  let lyDateClause: string
  let topProdDateClause: string
  let _lyTopProdDateClause: string

  if (fromDt && toDt) {
    const lyFromDt = String(parseInt(fromDt) - 10000)
    const lyToDt   = String(parseInt(toDt)   - 10000)
    dateClause          = `SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    lyDateClause        = `SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'`
    topProdDateClause   = `s.SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    _lyTopProdDateClause = `s.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'`
  } else {
    const lyFrom = String(parseInt(from) - 100)
    const lyTo   = String(parseInt(to)   - 100)
    dateClause          = `YYYYMM BETWEEN '${from}' AND '${to}'`
    lyDateClause        = `YYYYMM BETWEEN '${lyFrom}' AND '${lyTo}'`
    topProdDateClause   = `s.YYYYMM BETWEEN '${from}' AND '${to}'`
    _lyTopProdDateClause = `s.YYYYMM BETWEEN '${lyFrom}' AND '${lyTo}'`
  }

  try {
    const [detail, lyDetail, topProducts, dcDetail, lyDcDetail] = await Promise.all([
      // 1. 현재 기간: 브랜드 × 채널 × 월 상세
      snowflakeQuery<{
        YYYYMM: string; BRANDCD: string; BRANDNM: string
        SHOPTYPENM: string; REVENUE: number; QTY: number
      }>(
        `SELECT YYYYMM, BRANDCD, BRANDNM, SHOPTYPENM,
           SUM(SALEAMT_VAT_EX) AS REVENUE,
           SUM(SALEQTY) AS QTY
         FROM ${SALES_VIEW}
         WHERE BRANDCD IN ${brandInClause}
           AND ${dateClause}
         GROUP BY YYYYMM, BRANDCD, BRANDNM, SHOPTYPENM
         ORDER BY YYYYMM, BRANDCD, SHOPTYPENM`
      ),
      // 2. 전년 동기간
      snowflakeQuery<{
        YYYYMM: string; BRANDCD: string; BRANDNM: string
        SHOPTYPENM: string; REVENUE: number
      }>(
        `SELECT YYYYMM, BRANDCD, BRANDNM, SHOPTYPENM,
           SUM(SALEAMT_VAT_EX) AS REVENUE
         FROM ${SALES_VIEW}
         WHERE ${brandClause}
           AND ${lyDateClause}
         GROUP BY YYYYMM, BRANDCD, BRANDNM, SHOPTYPENM
         ORDER BY YYYYMM, BRANDCD, SHOPTYPENM`
      ),
      // 3. 베스트 상품 TOP 10
      snowflakeQuery<{
        STYLECD: string; STYLENM: string; BRANDCD: string; REVENUE: number; QTY: number
      }>(
        `SELECT s.STYLECD, si.STYLENM, s.BRANDCD,
           SUM(s.SALEAMT_VAT_EX) AS REVENUE,
           SUM(s.SALEQTY) AS QTY
         FROM ${SALES_VIEW} s
         LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON s.STYLECD = si.STYLECD
         WHERE s.BRANDCD IN ${brandInClause}
           AND ${topProdDateClause}
         GROUP BY s.STYLECD, si.STYLENM, s.BRANDCD
         ORDER BY REVENUE DESC
         LIMIT 10`
      ),

      // 4. 할인율용: VW_SALES_VAT (브랜드×채널×월)
      snowflakeQuery<Record<string, string>>(
        `SELECT SUBSTRING(v.SALEDT, 1, 6) AS YYYYMM, v.BRANDCD, v.SHOPTYPENM,
           SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG_AMT,
           SUM(v.SALEAMT_VAT_EX) AS SALE_AMT
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           AND ${dateClause.replace(/SALEDT/g, 'v.SALEDT').replace(/YYYYMM/g, 'SUBSTRING(v.SALEDT, 1, 6)')}
         GROUP BY SUBSTRING(v.SALEDT, 1, 6), v.BRANDCD, v.SHOPTYPENM`
      ),

      // 5. 할인율용: 전년 VW_SALES_VAT
      snowflakeQuery<Record<string, string>>(
        `SELECT SUBSTRING(v.SALEDT, 1, 6) AS YYYYMM, v.BRANDCD, v.SHOPTYPENM,
           SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG_AMT,
           SUM(v.SALEAMT_VAT_EX) AS SALE_AMT
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           AND ${lyDateClause.replace(/SALEDT/g, 'v.SALEDT').replace(/YYYYMM/g, 'SUBSTRING(v.SALEDT, 1, 6)')}
         GROUP BY SUBSTRING(v.SALEDT, 1, 6), v.BRANDCD, v.SHOPTYPENM`
      ),
    ])

    const months   = Array.from(new Set(detail.map(r => r.YYYYMM))).sort()
    const lyMonths = Array.from(new Set(lyDetail.map(r => r.YYYYMM))).sort()

    // 할인율 맵: YYYYMM::BRANDCD::SHOPTYPENM → {TAG_AMT, SALE_AMT}
    const buildDcMap = (rows: Record<string, string>[]) => {
      const m = new Map<string, { tag: number; sale: number }>()
      rows.forEach(r => {
        const key = `${r.YYYYMM}::${r.BRANDCD}::${r.SHOPTYPENM}`
        m.set(key, { tag: Number(r.TAG_AMT) || 0, sale: Number(r.SALE_AMT) || 0 })
      })
      return m
    }
    const dcMap = buildDcMap(dcDetail)
    const lyDcMap = buildDcMap(lyDcDetail)

    // 브랜드 목록 (실적 내림차순)
    const brandMap = new Map<string, string>()
    for (const r of detail) brandMap.set(r.BRANDCD, r.BRANDNM)
    const brands = Array.from(brandMap.entries())
      .map(([code, name]) => ({
        code,
        name,
        revenue: detail.filter(r => r.BRANDCD === code).reduce((s, r) => s + Number(r.REVENUE), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = detail.reduce((s, r) => s + Number(r.REVENUE), 0)
    const totalQty     = detail.reduce((s, r) => s + Number(r.QTY), 0)
    const lyRevenue    = lyDetail.reduce((s, r) => s + Number(r.REVENUE), 0)

    return NextResponse.json({
      detail: detail.map(r => {
        const dc = dcMap.get(`${r.YYYYMM}::${r.BRANDCD}::${r.SHOPTYPENM}`)
        const tag = dc?.tag || 0
        const sale = dc?.sale || 0
        return {
          yyyymm:     r.YYYYMM,
          brandcd:    r.BRANDCD,
          brandnm:    r.BRANDNM,
          shoptypenm: r.SHOPTYPENM,
          revenue:    Number(r.REVENUE),
          qty:        Number(r.QTY),
          tagAmt:     tag,
          saleAmt:    sale,
          dcRate:     tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : null,
        }
      }),
      lyDetail: lyDetail.map(r => {
        const dc = lyDcMap.get(`${r.YYYYMM}::${r.BRANDCD}::${r.SHOPTYPENM}`)
        const tag = dc?.tag || 0
        const sale = dc?.sale || 0
        return {
          yyyymm:     r.YYYYMM,
          brandcd:    r.BRANDCD,
          brandnm:    r.BRANDNM,
          shoptypenm: r.SHOPTYPENM,
          revenue:    Number(r.REVENUE),
          tagAmt:     tag,
          saleAmt:    sale,
          dcRate:     tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : null,
        }
      }),
      topProducts: topProducts.map(p => ({
        code:    p.STYLECD,
        name:    p.STYLENM ?? p.STYLECD,
        brand:   p.BRANDCD,
        revenue: Number(p.REVENUE),
        qty:     Number(p.QTY),
      })),
      meta: {
        months,
        lyMonths,
        brands: brands.map(b => ({ code: b.code, name: b.name })),
        totalRevenue,
        totalQty,
        lyRevenue,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
