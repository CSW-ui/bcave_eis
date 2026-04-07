import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

/**
 * GET /api/sales/period
 *
 * 시즌/기간 분석 API
 *
 * Query params:
 *   brand      — 'all' | 'CO' | 'WA' | 'LE' | 'CK' | 'LK' (default 'all')
 *   year       — YEARCD in SW_STYLEINFO, e.g. '26' (default '26')
 *   season     — 시즌명 콤마 구분 e.g. '봄,여름,상반기,스탠다드'
 *   fromDt     — 커스텀 기간 시작 YYYYMMDD (금년)
 *   toDt       — 커스텀 기간 종료 YYYYMMDD (금년)
 *   lyFromDt   — 전년 기간 시작 YYYYMMDD
 *   lyToDt     — 전년 기간 종료 YYYYMMDD
 *
 * 우선순위: fromDt/toDt > season
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  // ── 파라미터 파싱 ─────────────────────────────────────────────────────────
  const brandParam = searchParams.get('brand') || 'all'
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const year    = (searchParams.get('year') || '26').replace(/[^0-9A-Za-z]/g, '')
  const season  = searchParams.get('season') || ''  // 콤마 구분 시즌명
  const fromDt  = searchParams.get('fromDt')  || ''  // YYYYMMDD
  const toDt    = searchParams.get('toDt')    || ''
  const lyFromDt = searchParams.get('lyFromDt') || ''
  const lyToDt   = searchParams.get('lyToDt')   || ''

  // ── 필터 구성 ─────────────────────────────────────────────────────────────
  // 커스텀 날짜 우선, 없으면 시즌 필터
  const useCustomDate = !!(fromDt && toDt)
  const useSeason = !useCustomDate && !!season

  // 시즌 목록 → SQL IN 절
  let seasonFilter = ''
  if (useSeason) {
    const seasons = season
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => `'${s.replace(/'/g, "''")}'`)
      .join(',')
    seasonFilter = `AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasons})`
  }

  // 금년 날짜 범위 (커스텀 or 시즌 조인에서 SALEDT 전체)
  const cyDateFilter = useCustomDate
    ? `AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    : '' // 시즌 모드에서는 styleinfo join이 범위 역할

  // 전년 날짜 범위
  let lyDateFilter = ''
  if (useCustomDate) {
    // 전년 날짜가 명시적으로 제공된 경우 사용, 없으면 -1년 자동 계산
    const resolvedLyFrom = lyFromDt || String(parseInt(fromDt) - 10000)
    const resolvedLyTo   = lyToDt   || String(parseInt(toDt)   - 10000)
    lyDateFilter = `AND v.SALEDT BETWEEN '${resolvedLyFrom}' AND '${resolvedLyTo}'`
  } else if (useSeason) {
    // 시즌 모드: 전년은 동일 SEASONNM, 이전 YEARCD 자동 추론 (2자리 기준 -1)
    const lyYear = String(parseInt(year) - 1).padStart(2, '0')
    lyDateFilter = `AND si.YEARCD = '${lyYear}' AND si.SEASONNM IN (${
      season
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => `'${s.replace(/'/g, "''")}'`)
        .join(',')
    })`
  }

  // SW_SALEINFO용 날짜 필터 (할인율·원가율)
  const cySlDateFilter = useCustomDate
    ? `AND sl.SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    : ''
  const resolvedLyFrom = lyFromDt || (fromDt ? String(parseInt(fromDt) - 10000) : '')
  const resolvedLyTo   = lyToDt   || (toDt   ? String(parseInt(toDt)   - 10000) : '')
  const lySlDateFilter = resolvedLyFrom && resolvedLyTo
    ? `AND sl.SALEDT BETWEEN '${resolvedLyFrom}' AND '${resolvedLyTo}'`
    : ''

  // 시즌 모드에서 SW_SALEINFO에 STYLEINFO 조인하여 시즌 필터 적용
  const seasonFilterSl = useSeason ? seasonFilter.replace(/si\./g, 'si.') : ''

  try {
    // ── 쿼리 실행 (병렬) ──────────────────────────────────────────────────

    // 시즌 모드: SW_STYLEINFO JOIN 필요
    const styleJoin = useSeason
      ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD`
      : `LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD`

    // 1. KPI: 금년 합계
    // 2. KPI: 전년 합계
    // 3. 주간 트렌드: 금년
    // 4. 주간 트렌드: 전년
    // 5. 브랜드별: 금년
    // 6. 브랜드별: 전년
    // 7. 채널별: 금년
    // 8. 채널별: 전년
    // 9. 품목별 Top 20: 금년
    // 10. 품목별 Top 20: 전년
    // 11. 할인율·원가율: 금년 (SW_SALEINFO + PRODCOST)
    // 12. 할인율·원가율: 전년

    const [
      cyKpiRows, lyKpiRows,
      cyWeekRows, lyWeekRows,
      cyBrandRows, lyBrandRows,
      cyChannelRows, lyChannelRows,
      cyTopRows, lyTopRows,
      cyDcCostRows, lyDcCostRows,
    ] = await Promise.all([

      // 1. KPI 금년
      snowflakeQuery<{ REV: string; QTY: string }>(
        `SELECT
           SUM(v.SALEAMT_VAT_EX) AS REV,
           SUM(v.SALEQTY) AS QTY
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${cyDateFilter}
           ${useSeason ? seasonFilter : ''}`
      ),

      // 2. KPI 전년
      snowflakeQuery<{ REV: string; QTY: string }>(
        `SELECT
           SUM(v.SALEAMT_VAT_EX) AS REV,
           SUM(v.SALEQTY) AS QTY
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${lyDateFilter}`
      ),

      // 3. 주간 금년
      snowflakeQuery<{ WEEK: string; REV: string }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${cyDateFilter}
           ${useSeason ? seasonFilter : ''}
         GROUP BY WEEK
         ORDER BY WEEK`
      ),

      // 4. 주간 전년
      snowflakeQuery<{ WEEK: string; REV: string }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${lyDateFilter}
         GROUP BY WEEK
         ORDER BY WEEK`
      ),

      // 5. 브랜드별 금년
      snowflakeQuery<{ BRANDCD: string; BRANDNM: string; REV: string }>(
        `SELECT
           v.BRANDCD,
           MAX(v.BRANDNM) AS BRANDNM,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${cyDateFilter}
           ${useSeason ? seasonFilter : ''}
         GROUP BY v.BRANDCD
         ORDER BY REV DESC`
      ),

      // 6. 브랜드별 전년
      snowflakeQuery<{ BRANDCD: string; REV: string }>(
        `SELECT
           v.BRANDCD,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${lyDateFilter}
         GROUP BY v.BRANDCD
         ORDER BY REV DESC`
      ),

      // 7. 채널별 금년
      snowflakeQuery<{ SHOPTYPENM: string; REV: string }>(
        `SELECT
           v.SHOPTYPENM,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${cyDateFilter}
           ${useSeason ? seasonFilter : ''}
         GROUP BY v.SHOPTYPENM
         ORDER BY REV DESC`
      ),

      // 8. 채널별 전년
      snowflakeQuery<{ SHOPTYPENM: string; REV: string }>(
        `SELECT
           v.SHOPTYPENM,
           SUM(v.SALEAMT_VAT_EX) AS REV
         FROM ${SALES_VIEW} v
         ${styleJoin}
         WHERE v.BRANDCD IN ${brandInClause}
           ${lyDateFilter}
         GROUP BY v.SHOPTYPENM
         ORDER BY REV DESC`
      ),

      // 9. Top 품목 금년 (SW_STYLEINFO는 si 단일 alias로 통일)
      snowflakeQuery<{ ITEMNM: string; REV: string; QTY: string }>(
        `SELECT
           si.ITEMNM,
           SUM(v.SALEAMT_VAT_EX) AS REV,
           SUM(v.SALEQTY) AS QTY
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           ${cyDateFilter}
           ${useSeason ? seasonFilter : ''}
         GROUP BY si.ITEMNM
         ORDER BY REV DESC
         LIMIT 20`
      ),

      // 10. Top 품목 전년
      snowflakeQuery<{ ITEMNM: string; REV: string; QTY: string }>(
        `SELECT
           si.ITEMNM,
           SUM(v.SALEAMT_VAT_EX) AS REV,
           SUM(v.SALEQTY) AS QTY
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           ${lyDateFilter}
         GROUP BY si.ITEMNM
         ORDER BY REV DESC
         LIMIT 20`
      ),

      // 11. 할인율·원가율 금년 (SW_SALEINFO + SW_STYLEINFO.PRODCOST)
      snowflakeQuery<{ TAG: string; SALE: string; COST: string; QTY: string }>(
        `SELECT
           SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG,
           SUM(sl.SALEAMT) AS SALE,
           SUM(COALESCE(si.PRODCOST, 0) * sl.SALEQTY) AS COST,
           SUM(sl.SALEQTY) AS QTY
         FROM BCAVE.SEWON.SW_SALEINFO sl
         LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
         WHERE sl.BRANDCD IN ${brandInClause}
           ${cySlDateFilter}
           ${useSeason ? seasonFilterSl : ''}`
      ),

      // 12. 할인율·원가율 전년
      snowflakeQuery<{ TAG: string; SALE: string; COST: string; QTY: string }>(
        `SELECT
           SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG,
           SUM(sl.SALEAMT) AS SALE,
           SUM(COALESCE(si.PRODCOST, 0) * sl.SALEQTY) AS COST,
           SUM(sl.SALEQTY) AS QTY
         FROM BCAVE.SEWON.SW_SALEINFO sl
         LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD
         WHERE sl.BRANDCD IN ${brandInClause}
           ${lySlDateFilter}
           ${useSeason ? `AND si.YEARCD = '${String(parseInt(year) - 1).padStart(2, '0')}' AND si.SEASONNM IN (${
               season
                 .split(',')
                 .map(s => s.trim())
                 .filter(Boolean)
                 .map(s => `'${s.replace(/'/g, "''")}'`)
                 .join(',')
             })` : ''}`
      ),
    ])

    // ── KPI 계산 ──────────────────────────────────────────────────────────
    const cyRev  = Number(cyKpiRows[0]?.REV)  || 0
    const lyRev  = Number(lyKpiRows[0]?.REV)  || 0
    const cyQty  = Number(cyKpiRows[0]?.QTY)  || 0
    const lyQty  = Number(lyKpiRows[0]?.QTY)  || 0
    const yoy    = lyRev > 0 ? Math.round((cyRev - lyRev) / lyRev * 1000) / 10 : 0

    const cyDc   = cyDcCostRows[0]
    const lyDc   = lyDcCostRows[0]

    const cyTag  = Number(cyDc?.TAG)  || 0
    const cySale = Number(cyDc?.SALE) || 0
    const cyCost = Number(cyDc?.COST) || 0

    const lyTag  = Number(lyDc?.TAG)  || 0
    const lySale = Number(lyDc?.SALE) || 0
    const lyCost = Number(lyDc?.COST) || 0

    // 할인율: 1 - (실판매가 / 정상가)
    const dcRate   = cyTag  > 0 ? Math.round((1 - cySale / cyTag)  * 1000) / 10 : 0
    const lyDcRate = lyTag  > 0 ? Math.round((1 - lySale / lyTag)  * 1000) / 10 : 0

    // 원가율: 원가 합계 / VAT제외 실매출
    const cogsRate   = cyRev > 0 ? Math.round(cyCost / cyRev * 1000) / 10 : 0
    const lyCogsRate = lyRev > 0 ? Math.round(lyCost / lyRev * 1000) / 10 : 0

    // ── 주간 트렌드 (1-52주) ──────────────────────────────────────────────
    const cyWeekMap = new Map(cyWeekRows.map(r => [Number(r.WEEK), Number(r.REV)]))
    const lyWeekMap = new Map(lyWeekRows.map(r => [Number(r.WEEK), Number(r.REV)]))
    const weekly = Array.from({ length: 52 }, (_, i) => ({
      week: i + 1,
      cy:   cyWeekMap.get(i + 1) ?? 0,
      ly:   lyWeekMap.get(i + 1) ?? 0,
    }))

    // ── 브랜드별 ─────────────────────────────────────────────────────────
    const lyBrandMap = new Map(lyBrandRows.map(r => [r.BRANDCD, Number(r.REV)]))
    const brands = cyBrandRows.map(r => ({
      brand: r.BRANDNM || r.BRANDCD,
      rev:   Number(r.REV),
      lyRev: lyBrandMap.get(r.BRANDCD) ?? 0,
    }))

    // ── 채널별 ────────────────────────────────────────────────────────────
    const lyChannelMap = new Map(lyChannelRows.map(r => [r.SHOPTYPENM, Number(r.REV)]))
    const channels = cyChannelRows.map(r => ({
      channel: r.SHOPTYPENM,
      rev:     Number(r.REV),
      lyRev:   lyChannelMap.get(r.SHOPTYPENM) ?? 0,
    }))

    // ── Top 품목 ──────────────────────────────────────────────────────────
    const lyTopMap = new Map(lyTopRows.map(r => [r.ITEMNM, { rev: Number(r.REV), qty: Number(r.QTY) }]))
    const topItems = cyTopRows.map(r => ({
      item:  r.ITEMNM ?? '기타',
      rev:   Number(r.REV),
      lyRev: lyTopMap.get(r.ITEMNM)?.rev ?? 0,
      qty:   Number(r.QTY),
    }))

    // ── 응답 ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      kpi: {
        rev:       cyRev,
        lyRev,
        yoy,
        qty:       cyQty,
        lyQty,
        dcRate,
        lyDcRate,
        cogsRate,
        lyCogsRate,
      },
      weekly,
      brands,
      channels,
      topItems,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
