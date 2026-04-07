import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'
import { ITEM_CATEGORY_MAP } from '@/lib/constants'

// GET /api/sales/seasonal?brand=all&year=26&season=봄,여름,상반기,스탠다드&fromDt=20260101&toDt=20260406
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const brandParam = searchParams.get('brand') || 'all'
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const year = searchParams.get('year') || '26'
  const seasonParam = searchParams.get('season') || '봄,여름,상반기,스탠다드'
  const fromDt = searchParams.get('fromDt') || ''
  const toDt = searchParams.get('toDt') || ''

  if (!fromDt || !toDt) {
    return NextResponse.json({ error: 'fromDt and toDt are required' }, { status: 400 })
  }

  // 시즌 목록 SQL IN 절 생성 (SQL 인젝션 방지: 단순 문자열만 허용)
  const seasonList = seasonParam
    .split(',')
    .map(s => s.trim().replace(/'/g, "''"))
    .map(s => `'${s}'`)
    .join(',')

  const prevYear = String(parseInt(year) - 1)

  // 전년 동기: 날짜에서 10000 빼기 (YYYYMMDD 포맷)
  const lyFromDt = String(parseInt(fromDt) - 10000)
  const lyToDt = String(parseInt(toDt) - 10000)

  const brandWhere = `v.BRANDCD IN ${brandInClause}`
  const brandWhereSlv = `sl.BRANDCD IN ${brandInClause}`

  // 정상/이월 구분 조건
  const isNorm = `(si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}))`
  const isCo = `NOT (si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList}))`

  // 전년 정상/이월 구분 조건
  const isNormLy = `(si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}))`
  const isCoLy = `NOT (si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList}))`

  try {
    const [
      kpiRows,
      lyKpiRows,
      weeklyRows,
      lyWeeklyRows,
      channelRows,
      lyChannelRows,
      itemRows,
      dcNormRows,
      dcCoRows,
      dcLyNormRows,
      dcLyCoRows,
    ] = await Promise.all([

      // 1. 금년 KPI — 정상/이월 매출·수량 분리
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END)  AS NORM_REV,
          SUM(CASE WHEN ${isCo}   THEN v.SALEAMT_VAT_EX ELSE 0 END)  AS CO_REV,
          SUM(CASE WHEN ${isNorm} THEN v.SALEQTY ELSE 0 END)          AS NORM_QTY,
          SUM(CASE WHEN ${isCo}   THEN v.SALEQTY ELSE 0 END)          AS CO_QTY,
          SUM(CASE WHEN ${isNorm} THEN COALESCE(si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS NORM_COST,
          SUM(CASE WHEN ${isCo}   THEN COALESCE(si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS CO_COST
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
      `),

      // 2. 전년 KPI
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM(CASE WHEN ${isNormLy} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${isCoLy}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
          SUM(CASE WHEN ${isNormLy} THEN v.SALEQTY ELSE 0 END)         AS NORM_QTY,
          SUM(CASE WHEN ${isCoLy}   THEN v.SALEQTY ELSE 0 END)         AS CO_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
      `),

      // 3. 금년 주간 추세 — 정상/이월 분리
      snowflakeQuery<Record<string, string>>(`
        SELECT
          WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK,
          SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_CY,
          SUM(CASE WHEN ${isCo}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_CY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
        GROUP BY WEEK
        ORDER BY WEEK
      `),

      // 4. 전년 주간 추세 — 정상/이월 분리
      snowflakeQuery<Record<string, string>>(`
        SELECT
          WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK,
          SUM(CASE WHEN ${isNormLy} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_LY,
          SUM(CASE WHEN ${isCoLy}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_LY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
        GROUP BY WEEK
        ORDER BY WEEK
      `),

      // 5. 금년 채널별 정상/이월
      snowflakeQuery<Record<string, string>>(`
        SELECT
          v.SHOPTYPENM AS CHANNEL,
          SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${isCo}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
        GROUP BY v.SHOPTYPENM
        ORDER BY (NORM_REV + CO_REV) DESC
      `),

      // 6. 전년 채널별 정상/이월
      snowflakeQuery<Record<string, string>>(`
        SELECT
          v.SHOPTYPENM AS CHANNEL,
          SUM(CASE WHEN ${isNormLy} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${isCoLy}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
        GROUP BY v.SHOPTYPENM
      `),

      // 7. 품목별 정상/이월 매출·수량
      snowflakeQuery<Record<string, string>>(`
        SELECT
          si.ITEMNM AS ITEM,
          SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
          SUM(CASE WHEN ${isCo}   THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
          SUM(CASE WHEN ${isNorm} THEN v.SALEQTY ELSE 0 END)         AS NORM_QTY,
          SUM(CASE WHEN ${isCo}   THEN v.SALEQTY ELSE 0 END)         AS CO_QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
        GROUP BY si.ITEMNM
        ORDER BY (NORM_REV + CO_REV) DESC
      `),

      // 8. 할인율: 금년 정상 (SW_SALEINFO + SW_STYLEINFO 조인)
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT)                         AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${brandWhereSlv}
          AND sl.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
          AND ${isNorm.replace(/v\.BRANDCD/g, 'sl.BRANDCD')}
      `),

      // 9. 할인율: 금년 이월
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT)                         AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${brandWhereSlv}
          AND sl.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
          AND ${isCo.replace(/v\.BRANDCD/g, 'sl.BRANDCD')}
      `),

      // 10. 할인율: 전년 정상
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT)                         AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${brandWhereSlv}
          AND sl.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
          AND ${isNormLy.replace(/v\.BRANDCD/g, 'sl.BRANDCD')}
      `),

      // 11. 할인율: 전년 이월
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_AMT,
          SUM(sl.SALEAMT)                         AS SALE_AMT
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        WHERE ${brandWhereSlv}
          AND sl.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
          AND ${isCoLy.replace(/v\.BRANDCD/g, 'sl.BRANDCD')}
      `),
    ])

    // ── KPI 집계 ──────────────────────────────────────────────
    const kpi = kpiRows[0] ?? {}
    const lyKpi = lyKpiRows[0] ?? {}

    const normRev  = Number(kpi.NORM_REV)  || 0
    const coRev    = Number(kpi.CO_REV)    || 0
    const totalRev = normRev + coRev
    const normRatio = totalRev > 0 ? Math.round(normRev / totalRev * 1000) / 10 : 0

    const lyNormRev  = Number(lyKpi.NORM_REV)  || 0
    const lyCoRev    = Number(lyKpi.CO_REV)    || 0
    const lyTotalRev = lyNormRev + lyCoRev

    // 원가율 (PRODCOST 기반)
    const normCost = Number(kpi.NORM_COST) || 0
    const coCost   = Number(kpi.CO_COST)   || 0
    const normCogsRate = normRev > 0 ? Math.round(normCost / normRev * 1000) / 10 : 0
    const coCogsRate   = coRev   > 0 ? Math.round(coCost   / coRev   * 1000) / 10 : 0

    // 할인율 계산 헬퍼
    function calcDcRate(rows: Record<string, string>[]): number {
      const r = rows[0] ?? {}
      const tag  = Number(r.TAG_AMT)  || 0
      const sale = Number(r.SALE_AMT) || 0
      return tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : 0
    }

    const normDcRate   = calcDcRate(dcNormRows)
    const coDcRate     = calcDcRate(dcCoRows)
    const lyNormDcRate = calcDcRate(dcLyNormRows)
    const lyCoDcRate   = calcDcRate(dcLyCoRows)

    // ── 주간 추세 ─────────────────────────────────────────────
    const cyWeekMap = new Map(weeklyRows.map(r => [
      Number(r.WEEK),
      { normCy: Number(r.NORM_CY) || 0, coCy: Number(r.CO_CY) || 0 },
    ]))
    const lyWeekMap = new Map(lyWeeklyRows.map(r => [
      Number(r.WEEK),
      { normLy: Number(r.NORM_LY) || 0, coLy: Number(r.CO_LY) || 0 },
    ]))

    // 금년/전년 모두에 등장하는 주차 합집합
    const allWeeks = Array.from(
      new Set([...cyWeekMap.keys(), ...lyWeekMap.keys()])
    ).sort((a, b) => a - b)

    const weekly = allWeeks.map(week => {
      const cy = cyWeekMap.get(week)
      const ly = lyWeekMap.get(week)
      return {
        week,
        normCy: cy?.normCy ?? 0,
        coCy:   cy?.coCy   ?? 0,
        normLy: ly?.normLy ?? 0,
        coLy:   ly?.coLy   ?? 0,
      }
    })

    // ── 채널별 ───────────────────────────────────────────────
    const lyChMap = new Map(lyChannelRows.map(r => [
      r.CHANNEL,
      { lyNormRev: Number(r.NORM_REV) || 0, lyCoRev: Number(r.CO_REV) || 0 },
    ]))

    const channels = channelRows.map(r => {
      const ly = lyChMap.get(r.CHANNEL)
      return {
        channel:   r.CHANNEL ?? '',
        normRev:   Number(r.NORM_REV) || 0,
        coRev:     Number(r.CO_REV)   || 0,
        lyNormRev: ly?.lyNormRev ?? 0,
        lyCoRev:   ly?.lyCoRev   ?? 0,
      }
    })

    // ── 품목별 ───────────────────────────────────────────────
    const items = itemRows.map(r => {
      const item = r.ITEM ?? '기타'
      return {
        item,
        category: ITEM_CATEGORY_MAP[item] ?? '기타',
        normRev:  Number(r.NORM_REV) || 0,
        coRev:    Number(r.CO_REV)   || 0,
        normQty:  Number(r.NORM_QTY) || 0,
        coQty:    Number(r.CO_QTY)   || 0,
      }
    })

    return NextResponse.json({
      kpi: {
        normRev,
        coRev,
        totalRev,
        normRatio,
        lyNormRev,
        lyCoRev,
        lyTotalRev,
        normDcRate,
        coDcRate,
        lyNormDcRate,
        lyCoDcRate,
        normCogsRate,
        coCogsRate,
      },
      weekly,
      channels,
      items,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
