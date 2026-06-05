import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// GET /api/sales/shops?from=20260101&to=20260521&brands=all&channels=백화점,직영점
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brands') || 'all'
  const { valid, inClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brands' }, { status: 400 })

  const from = (searchParams.get('from') || '').replace(/[^0-9]/g, '')
  const to = (searchParams.get('to') || '').replace(/[^0-9]/g, '')
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) {
    return NextResponse.json({ error: 'from/to는 YYYYMMDD 형식이어야 합니다.' }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: 'from이 to보다 큽니다.' }, { status: 400 })
  }

  const channels = (searchParams.get('channels') || '').split(',').filter(Boolean)
  const channelClause = channels.length > 0
    ? `AND v.SHOPTYPENM IN (${channels.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`
    : ''

  // 전년 동기간 (-10000)
  const lyFrom = String(Number(from) - 10000)
  const lyTo = String(Number(to) - 10000)

  // 정상/이월 분리: 기간 시작월 기준 연도·시즌 도출 (dashboard 패턴)
  const fromYear = Number(from.slice(0, 4))
  const fromMonth = Number(from.slice(4, 6))
  const yy = String(fromYear).slice(2)
  const seasonList = fromMonth <= 6
    ? `('봄','여름','상반기','스탠다드')`
    : `('가을','겨울','하반기','스탠다드')`
  const isNorm = `(sti.YEARCD = '${yy}' AND sti.SEASONNM IN ${seasonList})`

  // 행사 매출은 SW_SALEINFO.PRICETYPENM='행사'만 식별 가능 (VW_SALES_VAT에는 없음)
  // SW_SALEINFO에는 SHOPTYPENM이 없어 채널 필터는 외부 JOIN에서 처리
  const sql = `
    WITH promo AS (
      -- 기타매출 = 매장 워크인이 아닌 모든 매출 (단, 맞교환·예약(완불)은 제외)
      --   워크인: SALETYPE in (정상,NULL) × PRICETYPE in (정상,할인,균일,NULL)
      --   기타: 라이브 + 온라인 + 행사 + 직원판매 + 비품 + 대여 + 외매조정 + 기획 등
      SELECT SHOPCD, BRANDCD,
        SUM(SALEAMT / 1.1) AS PROMO_REV
      FROM BCAVE.SEWON.SW_SALEINFO
      WHERE NOT (
        (SALETYPENM IS NULL OR SALETYPENM = '정상')
        AND (PRICETYPENM IS NULL OR PRICETYPENM IN ('정상','할인','균일'))
      )
        AND (SALETYPENM IS NULL OR SALETYPENM NOT IN ('맞교환','예약(완불)'))
        AND SALEDT BETWEEN '${from}' AND '${to}'
        AND BRANDCD IN ${inClause}
      GROUP BY SHOPCD, BRANDCD
    ),
    ly AS (
      SELECT v.SHOPCD, v.BRANDCD,
        SUM(v.SALEAMT_VAT_EX) AS LY_REV,
        SUM(v.SALEQTY) AS LY_QTY
      FROM ${SALES_VIEW} v
      WHERE v.BRANDCD IN ${inClause}
        AND v.SALEDT BETWEEN '${lyFrom}' AND '${lyTo}'
      GROUP BY v.SHOPCD, v.BRANDCD
    )
    SELECT v.SHOPCD, v.BRANDCD, v.SHOPTYPENM,
      MAX(si.SHOPNM) as SHOPNM, MAX(si.AREANM) as AREANM,
      SUM(v.SALEAMT_VAT_EX) as REV,
      SUM(v.SALEQTY) as QTY,
      SUM(COALESCE(pc.PRECOST, sti.PRODCOST, 0) * v.SALEQTY) as COST,
      SUM((sti.TAGPRICE / 1.1) * v.SALEQTY) as TAG,
      SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) as NORM_REV,
      SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) as CO_REV,
      MAX(promo.PROMO_REV) as PROMO_REV,
      MAX(ly.LY_REV) as LY_REV,
      MAX(ly.LY_QTY) as LY_QTY
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON v.SHOPCD = si.SHOPCD
    LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON sti.STYLECD = pc.STYLECD AND sti.BRANDCD = pc.BRANDCD
    LEFT JOIN promo ON v.SHOPCD = promo.SHOPCD AND v.BRANDCD = promo.BRANDCD
    LEFT JOIN ly ON v.SHOPCD = ly.SHOPCD AND v.BRANDCD = ly.BRANDCD
    WHERE v.BRANDCD IN ${inClause}
      AND v.SALEDT BETWEEN '${from}' AND '${to}'
      ${channelClause}
    GROUP BY v.SHOPCD, v.BRANDCD, v.SHOPTYPENM
    HAVING SUM(v.SALEAMT_VAT_EX) <> 0 OR SUM(v.SALEQTY) <> 0
    ORDER BY REV DESC
  `

  try {
    const rows = await snowflakeQuery<Record<string, string>>(sql)
    const shops = rows.map(r => {
      const rev = Number(r.REV) || 0
      const qty = Number(r.QTY) || 0
      const cost = Number(r.COST) || 0
      const tag = Number(r.TAG) || 0
      const normRev = Number(r.NORM_REV) || 0
      const coRev = Number(r.CO_REV) || 0
      const promoRev = Number(r.PROMO_REV) || 0
      const lyRev = Number(r.LY_REV) || 0
      const yoyAmt = rev - lyRev
      const yoyPct = lyRev > 0 ? Math.round(yoyAmt / lyRev * 1000) / 10 : null
      return {
        shopCd: r.SHOPCD,
        shopNm: r.SHOPNM ?? r.SHOPCD,
        area: r.AREANM ?? '',
        brandcd: r.BRANDCD,
        channel: r.SHOPTYPENM ?? '',
        rev, qty,
        atv: qty > 0 ? Math.round(rev / qty) : 0,
        dcRate: tag > 0 ? Math.round((1 - rev / tag) * 1000) / 10 : 0,
        cogsRate: rev > 0 ? Math.round(cost / rev * 1000) / 10 : 0,
        normRev, coRev, promoRev,
        lyRev, yoyAmt, yoyPct,
      }
    })
    return NextResponse.json({ shops, from, to, channels, normSeason: seasonList, normYear: yy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
