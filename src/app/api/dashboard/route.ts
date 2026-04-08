import { NextRequest, NextResponse } from 'next/server'
import { snowflakeQuery, BRAND_FILTER, SALES_VIEW } from '@/lib/snowflake'
import { fmtDateSf } from '@/lib/formatters'

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get('region') || 'domestic'
  // SHOPTYPENM은 '백화점','아울렛','무신사','해외 사입' 등 구체적 채널명
  // 해외: SHOPTYPENM에 '해외' 포함
  // 오프라인: 백화점,아울렛,가두,직영,대리,면세,팝업,편집,오프,로드샵,부티크,쇼핑몰,사입(해외제외)
  // 온라인: 해외/오프라인 아닌 나머지
  // 국내: 해외 아닌 전체
  const regionFilterMap: Record<string, string> = {
    domestic: "AND SHOPTYPENM NOT LIKE '%해외%'",
    online: "AND SHOPTYPENM NOT LIKE '%해외%' AND SHOPTYPENM NOT IN ('백화점','아울렛','가두점','직영점','대리점','면세점','팝업','편집숍','로드샵','부티크','쇼핑몰')",
    offline: "AND SHOPTYPENM NOT LIKE '%해외%' AND SHOPTYPENM IN ('백화점','아울렛','가두점','직영점','대리점','면세점','팝업','편집숍','로드샵','부티크','쇼핑몰')",
    overseas: "AND SHOPTYPENM LIKE '%해외%'",
  }
  const regionFilter = regionFilterMap[region] || ''
  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1 // 1-based

  // 이번 달 1일 ~ 어제
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const cmStart = `${curYear}${String(curMonth).padStart(2, '0')}01`
  const cmEndRaw = fmtDateSf(yesterday)
  const cmEnd = cmEndRaw < cmStart ? cmStart : cmEndRaw

  // 지난달
  const pmYear = curMonth === 1 ? curYear - 1 : curYear
  const pmMonth = curMonth === 1 ? 12 : curMonth - 1
  const pmStart = `${pmYear}${String(pmMonth).padStart(2, '0')}01`
  const pmEnd = `${pmYear}${String(pmMonth).padStart(2, '0')}${new Date(pmYear, pmMonth, 0).getDate()}`

  // 전년 동월
  const lyStart = `${curYear - 1}${String(curMonth).padStart(2, '0')}01`
  const lyEnd = `${curYear - 1}${String(curMonth).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`

  // 전년 지난달
  const lyPmStart = `${pmYear - 1}${String(pmMonth).padStart(2, '0')}01`
  const lyPmEnd = `${pmYear - 1}${String(pmMonth).padStart(2, '0')}${new Date(pmYear - 1, pmMonth, 0).getDate()}`

  const brandFilter = BRAND_FILTER

  try {
    const [kpiRaw, monthlyRaw, brandRaw, brandMonthRaw, yearlySales, dcKpiRaw, dcMonthlyRaw, costMonthlyRaw, yearlyInbound, baseInvRaw, yearlyDcRate, currentInvRaw, lyCmCostRaw, normCoRaw, lyNormCoRaw] = await Promise.all([
      // 1. KPI: 이번달/지난달/전년동월 매출·수량
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM(CASE WHEN SALEDT BETWEEN '${cmStart}' AND '${cmEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS CM_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${cmStart}' AND '${cmEnd}' THEN SALEQTY ELSE 0 END) AS CM_QTY,
          COUNT(DISTINCT CASE WHEN SALEDT BETWEEN '${cmStart}' AND '${cmEnd}' THEN SHOPCD END) AS CM_SHOPS,
          SUM(CASE WHEN SALEDT BETWEEN '${pmStart}' AND '${pmEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS PM_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${pmStart}' AND '${pmEnd}' THEN SALEQTY ELSE 0 END) AS PM_QTY,
          COUNT(DISTINCT CASE WHEN SALEDT BETWEEN '${pmStart}' AND '${pmEnd}' THEN SHOPCD END) AS PM_SHOPS,
          SUM(CASE WHEN SALEDT BETWEEN '${lyStart}' AND '${lyEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS LY_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${lyStart}' AND '${lyEnd}' THEN SALEQTY ELSE 0 END) AS LY_QTY,
          SUM(CASE WHEN SALEDT BETWEEN '${lyPmStart}' AND '${lyPmEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS LY_PM_REV
        FROM BCAVE.SEWON.VW_SALES_VAT
        WHERE ${brandFilter} ${regionFilter}
      `),

      // 2. 월별 매출 추이: 올해 + 전년 (차트용 — 월 전체)
      snowflakeQuery<{ M: string; REV: number }>(`
        SELECT SUBSTRING(SALEDT, 1, 6) AS M, SUM(SALEAMT_VAT_EX) AS REV
        FROM BCAVE.SEWON.VW_SALES_VAT
        WHERE ${brandFilter} ${regionFilter}
          AND SALEDT >= '${curYear - 1}0101'
        GROUP BY SUBSTRING(SALEDT, 1, 6)
        ORDER BY M
      `),

      // 3. 브랜드별 YTD 실적
      snowflakeQuery<{ BRANDNM: string; REV: number; QTY: number }>(`
        SELECT BRANDNM,
          SUM(SALEAMT_VAT_EX) AS REV,
          SUM(SALEQTY) AS QTY
        FROM BCAVE.SEWON.VW_SALES_VAT
        WHERE ${brandFilter} ${regionFilter}
          AND SALEDT >= '${curYear}0101'
        GROUP BY BRANDNM
        ORDER BY REV DESC
      `),

      // 4. 브랜드별 금월 매출
      snowflakeQuery<{ BRANDNM: string; REV: number }>(`
        SELECT BRANDNM,
          SUM(SALEAMT_VAT_EX) AS REV
        FROM BCAVE.SEWON.VW_SALES_VAT
        WHERE ${brandFilter} ${regionFilter}
          AND SALEDT BETWEEN '${cmStart}' AND '${cmEnd}'
        GROUP BY BRANDNM
        ORDER BY REV DESC
      `),

      // 5. 2026년 판매 — 상품 YEARCD별 (26년 들어와서 각 연도 상품이 얼마나 팔렸는지)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD AS YR,
          SUM(v.SALEQTY) AS SALE_QTY,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS SALE_TAG,
          SUM(v.SALEAMT_VAT_EX) AS SALE_AMT,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) AS COST_AMT
        FROM BCAVE.SEWON.VW_SALES_VAT v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')} ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
          AND v.SALEDT >= '20260101'
        GROUP BY si.YEARCD
        ORDER BY si.YEARCD DESC
      `),

      // 6. 할인율용: VW_SALES_VAT 기반 KPI (금월/전년동월 TAG·SALEAMT_VAT_EX)
      snowflakeQuery<Record<string, string>>(`
        SELECT
          SUM(CASE WHEN v.SALEDT BETWEEN '${cmStart}' AND '${cmEnd}' THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS CM_TAG,
          SUM(CASE WHEN v.SALEDT BETWEEN '${cmStart}' AND '${cmEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CM_SALE,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyStart}' AND '${lyEnd}' THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS LY_TAG,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyStart}' AND '${lyEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_SALE
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')}
          ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
      `),

      // 7. 할인율용: 월별 VW_SALES_VAT (올해+전년)
      snowflakeQuery<{ M: string; TAG: number; SALE: number }>(`
        SELECT SUBSTRING(v.SALEDT, 1, 6) AS M,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG,
          SUM(v.SALEAMT_VAT_EX) AS SALE
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')}
          ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
          AND v.SALEDT >= '${curYear - 1}0101'
        GROUP BY SUBSTRING(v.SALEDT, 1, 6)
        ORDER BY M
      `),

      // 8. 매출원가용: 월별 PRODCOST (올해+전년)
      snowflakeQuery<{ M: string; COST: number }>(`
        SELECT SUBSTRING(v.SALEDT, 1, 6) AS M,
          SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) AS COST
        FROM BCAVE.SEWON.VW_SALES_VAT v
        LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')} ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
          AND v.SALEDT >= '${curYear - 1}0101'
        GROUP BY SUBSTRING(v.SALEDT, 1, 6)
        ORDER BY M
      `),

      // 9. 26년 입고 — YEARCD별 TAG + 수량 (26년산 상품 입고)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD AS YR,
          SUM(w.INQTY) AS IN_QTY,
          SUM(w.INQTY * COALESCE(tp.TAGPRICE, 0)) AS IN_TAG,
          SUM(w.INQTY * COALESCE(pc.PRECOST, si.PRODCOST, 0)) AS IN_COST
        FROM BCAVE.SEWON.SW_WHININFO w
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON w.STYLECD = si.STYLECD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        LEFT JOIN (
          SELECT STYLECD, BRANDCD, CHASU, MAX(TAGPRICE / 1.1) as TAGPRICE
          FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
          GROUP BY STYLECD, BRANDCD, CHASU
        ) tp ON w.STYLECD = tp.STYLECD AND si.BRANDCD = tp.BRANDCD AND w.CHASU = tp.CHASU
        WHERE ${brandFilter.replace(/BRANDCD/g, 'si.BRANDCD')}
          AND si.YEARCD = '26'
        GROUP BY si.YEARCD
      `),

      // 10. 기초재고 (2025.12.31) — YEARCD별
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD AS YR,
          SUM(inv.QTY * COALESCE(tp.TAGPRICE, 0)) as BASE_TAG,
          SUM(inv.QTY * COALESCE(pc.PRECOST, si.PRODCOST, 0)) as BASE_COST,
          SUM(inv.QTY) as BASE_QTY
        FROM (
          SELECT s.STYLECD, SUM(s.INVQTY) as QTY
          FROM BCAVE.SEWON.SW_SHOPINV_20251231 s
          JOIN BCAVE.SEWON.SW_SHOPINFO sh ON s.SHOPCD = sh.SHOPCD
          WHERE sh.SHOPTYPENM NOT IN ('온라인(무신사)','온라인(자사몰)','온라인(위탁몰)','온라인B2B','해외 위탁','오프라인 위탁','면세점','해외 사입')
          GROUP BY s.STYLECD
          UNION ALL
          SELECT STYLECD, SUM(INVQTY) as QTY FROM BCAVE.SEWON.SW_WHINV_20251231 GROUP BY STYLECD
        ) inv
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON inv.STYLECD = si.STYLECD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        LEFT JOIN (
          SELECT STYLECD, BRANDCD, MAX(TAGPRICE / 1.1) as TAGPRICE
          FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL
          GROUP BY STYLECD, BRANDCD
        ) tp ON si.STYLECD = tp.STYLECD AND si.BRANDCD = tp.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'si.BRANDCD')}
        GROUP BY si.YEARCD
      `),

      // 11. 2026년 판매 할인율 — 상품 YEARCD별 (VW_SALES_VAT)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD AS YR,
          SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG_AMT,
          SUM(v.SALEAMT_VAT_EX) AS SALE_PRICE_AMT
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')}
          ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
          AND v.SALEDT >= '20260101'
        GROUP BY si.YEARCD
      `),

      // 12. 현재 잔여재고 — YEARCD별
      snowflakeQuery<Record<string, string>>(`
        SELECT si.YEARCD AS YR,
          SUM(inv.QTY * COALESCE(tp.TAGPRICE, 0)) as REM_TAG,
          SUM(inv.QTY * COALESCE(pc.PRECOST, si.PRODCOST, 0)) as REM_COST,
          SUM(inv.QTY) as REM_QTY
        FROM (
          SELECT s.STYLECD, SUM(s.INVQTY) as QTY
          FROM BCAVE.SEWON.SW_SHOPINV s
          JOIN BCAVE.SEWON.SW_SHOPINFO sh ON s.SHOPCD = sh.SHOPCD
          WHERE sh.SHOPTYPENM NOT IN ('온라인(무신사)','온라인(자사몰)','온라인(위탁몰)','온라인B2B','해외 위탁','오프라인 위탁','면세점','해외 사입')
          GROUP BY s.STYLECD
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
        WHERE ${brandFilter.replace(/BRANDCD/g, 'si.BRANDCD')}
        GROUP BY si.YEARCD
      `),

      // 13. 전년 당월 동기간 원가 (YTD 매출원가율 동기간 보정용)
      snowflakeQuery<Record<string, string>>(`
        SELECT SUM(COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY) AS LY_CM_COST
        FROM BCAVE.SEWON.VW_SALES_VAT v
        LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
        WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')} ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
          AND v.SALEDT BETWEEN '${lyStart}' AND '${lyEnd}'
      `),

      // 14. 정상/이월 분리 YTD (금년)
      (() => {
        const yr = String(curYear).slice(2)
        const seasonList = curMonth <= 6
          ? `('봄','여름','상반기','스탠다드')`
          : `('가을','겨울','하반기','스탠다드')`
        const isNorm = `(si.YEARCD = '${yr}' AND si.SEASONNM IN ${seasonList})`
        return snowflakeQuery<Record<string, string>>(`
          SELECT
            SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
            SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
            SUM(CASE WHEN ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS NORM_COST,
            SUM(CASE WHEN NOT ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS CO_COST,
            SUM(CASE WHEN ${isNorm} THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS NORM_TAG,
            SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_SALE,
            SUM(CASE WHEN NOT ${isNorm} THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS CO_TAG,
            SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_SALE
          FROM ${SALES_VIEW} v
          JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
          LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
          WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')} ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
            AND v.SALEDT >= '${curYear}0101' AND v.SALEDT <= '${cmEnd}'
        `)
      })(),

      // 15. 정상/이월 분리 YTD (전년 동기간)
      (() => {
        const lyYr = String(curYear - 1).slice(2)
        const seasonList = curMonth <= 6
          ? `('봄','여름','상반기','스탠다드')`
          : `('가을','겨울','하반기','스탠다드')`
        const isNorm = `(si.YEARCD = '${lyYr}' AND si.SEASONNM IN ${seasonList})`
        return snowflakeQuery<Record<string, string>>(`
          SELECT
            SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_REV,
            SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_REV,
            SUM(CASE WHEN ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS NORM_COST,
            SUM(CASE WHEN NOT ${isNorm} THEN COALESCE(pc.PRECOST, si.PRODCOST, 0) * v.SALEQTY ELSE 0 END) AS CO_COST,
            SUM(CASE WHEN ${isNorm} THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS NORM_TAG,
            SUM(CASE WHEN ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS NORM_SALE,
            SUM(CASE WHEN NOT ${isNorm} THEN (si.TAGPRICE / 1.1) * v.SALEQTY ELSE 0 END) AS CO_TAG,
            SUM(CASE WHEN NOT ${isNorm} THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CO_SALE
          FROM ${SALES_VIEW} v
          JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
          LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON si.STYLECD = pc.STYLECD AND si.BRANDCD = pc.BRANDCD
          WHERE ${brandFilter.replace(/BRANDCD/g, 'v.BRANDCD')} ${regionFilter.replace(/SHOPTYPENM/g, 'v.SHOPTYPENM')}
            AND v.SALEDT >= '${curYear - 1}0101' AND v.SALEDT <= '${lyEnd}'
        `)
      })(),
    ])

    const k = kpiRaw[0] || {}
    const cmRev = Number(k.CM_REV) || 0
    const cmQty = Number(k.CM_QTY) || 0
    const cmShops = Number(k.CM_SHOPS) || 0
    const pmRev = Number(k.PM_REV) || 0
    const pmShops = Number(k.PM_SHOPS) || 0
    const lyRev = Number(k.LY_REV) || 0
    const lyQty = Number(k.LY_QTY) || 0

    // 할인율 KPI
    const dk = dcKpiRaw[0] || {}
    const cmTag = Number(dk.CM_TAG) || 0
    const cmSale = Number(dk.CM_SALE) || 0
    const lyTag = Number(dk.LY_TAG) || 0
    const lySale = Number(dk.LY_SALE) || 0
    const cmDcRate = cmTag > 0 ? Math.round((1 - cmSale / cmTag) * 1000) / 10 : 0
    const lyDcRate = lyTag > 0 ? Math.round((1 - lySale / lyTag) * 1000) / 10 : 0

    const kpi = {
      cmRev, cmQty, cmShops,
      pmRev, pmShops,
      lyRev, lyQty,
      yoyRevPct: lyRev > 0 ? Math.round((cmRev - lyRev) / lyRev * 1000) / 10 : 0,
      yoyQtyPct: lyQty > 0 ? Math.round((cmQty - lyQty) / lyQty * 1000) / 10 : 0,
      momRevPct: pmRev > 0 ? Math.round((cmRev - pmRev) / pmRev * 1000) / 10 : 0,
      shopChgPct: pmShops > 0 ? Math.round((cmShops - pmShops) / pmShops * 1000) / 10 : 0,
      cmDcRate,
      lyDcRate,
      dcRateChg: Math.round((cmDcRate - lyDcRate) * 10) / 10,
      curMonth,
      curYear,
    }

    // 올해/전년 월별 데이터 분리
    const curYearStr = String(curYear)
    const lastYearStr = String(curYear - 1)

    const monthlyMap = new Map<string, { actual: number; lastYear: number; cost: number; lyCost: number; tag: number; sale: number; lyTag: number; lySale: number }>()
    // 1~12월 기본 구조 생성
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0')
      monthlyMap.set(mm, { actual: 0, lastYear: 0, cost: 0, lyCost: 0, tag: 0, sale: 0, lyTag: 0, lySale: 0 })
    }
    // 데이터 매핑
    for (const r of monthlyRaw) {
      const ym = String(r.M)
      const yyyy = ym.slice(0, 4)
      const mm = ym.slice(4, 6)
      const entry = monthlyMap.get(mm)
      if (!entry) continue
      if (yyyy === curYearStr) entry.actual = Number(r.REV) || 0
      else if (yyyy === lastYearStr) entry.lastYear = Number(r.REV) || 0
    }
    // 원가 매핑
    for (const r of costMonthlyRaw) {
      const ym = String(r.M)
      const yyyy = ym.slice(0, 4)
      const mm = ym.slice(4, 6)
      const entry = monthlyMap.get(mm)
      if (!entry) continue
      if (yyyy === curYearStr) entry.cost = Number(r.COST) || 0
      else if (yyyy === lastYearStr) entry.lyCost = Number(r.COST) || 0
    }
    // 할인율 월별 매핑
    for (const r of dcMonthlyRaw) {
      const ym = String(r.M)
      const yyyy = ym.slice(0, 4)
      const mm = ym.slice(4, 6)
      const entry = monthlyMap.get(mm)
      if (!entry) continue
      if (yyyy === curYearStr) { entry.tag = Number(r.TAG) || 0; entry.sale = Number(r.SALE) || 0 }
      else if (yyyy === lastYearStr) { entry.lyTag = Number(r.TAG) || 0; entry.lySale = Number(r.SALE) || 0 }
    }

    const monthly = Array.from(monthlyMap.entries()).map(([mm, v]) => ({
      month: `${mm}월`,
      yyyymm: `${curYearStr}${mm}`,
      actual: v.actual,
      lastYear: v.lastYear,
      cost: v.cost,
      lyCost: v.lyCost,
      cogsRate: v.actual > 0 ? Math.round(v.cost / v.actual * 1000) / 10 : null,
      lyCogsRate: v.lastYear > 0 ? Math.round(v.lyCost / v.lastYear * 1000) / 10 : null,
      dcRate: v.tag > 0 ? Math.round((1 - v.sale / v.tag) * 1000) / 10 : null,
      lyDcRate: v.lyTag > 0 ? Math.round((1 - v.lySale / v.lyTag) * 1000) / 10 : null,
    }))

    // YTD 누적 지표
    const ytd = (() => {
      const cmMm = String(curMonth).padStart(2, '0')
      // 매출: 전일마감 누적 (당월까지만), 전년은 동기간
      let rev = 0, lyRev = 0, cost = 0, lyCost = 0, tag = 0, sale = 0, lyTag = 0, lySale = 0
      for (const [mm, v] of monthlyMap) {
        if (mm > cmMm) continue // 미래 월 제외
        rev += v.actual; cost += v.cost; tag += v.tag; sale += v.sale
        if (mm === cmMm) {
          // 당월 전년은 동기간 값 사용
          lyRev += Number(k.LY_REV) || 0
          lyCost += Number(lyCmCostRaw[0]?.LY_CM_COST) || 0
          lyTag += Number(dk.LY_TAG) || 0
          lySale += Number(dk.LY_SALE) || 0
        } else {
          lyRev += v.lastYear; lyCost += v.lyCost; lyTag += v.lyTag; lySale += v.lySale
        }
      }
      // 달성률: 전월 마감 기준 (당월 제외)
      let achRev = 0, achLyRev = 0
      for (const [mm, v] of monthlyMap) {
        if (mm >= cmMm) continue // 당월 이후 제외
        achRev += v.actual; achLyRev += v.lastYear
      }
      return {
        rev, lyRev,
        yoy: lyRev > 0 ? Math.round((rev - lyRev) / lyRev * 1000) / 10 : 0,
        cogsRate: rev > 0 ? Math.round(cost / rev * 1000) / 10 : 0,
        lyCogsRate: lyRev > 0 ? Math.round(lyCost / lyRev * 1000) / 10 : 0,
        dcRate: tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : 0,
        lyDcRate: lyTag > 0 ? Math.round((1 - lySale / lyTag) * 1000) / 10 : 0,
        achRev, // 전월까지 누적 매출 (달성률용)
      }
    })()

    const brands = brandRaw.map(r => ({
      brand: r.BRANDNM,
      revenue: Number(r.REV) || 0,
      qty: Number(r.QTY) || 0,
    }))

    // 브랜드별 금월 매출
    const brandMonth = brandMonthRaw.map(r => ({
      brand: r.BRANDNM,
      cmRev: Number(r.REV) || 0,
    }))

    // YEARCD별 맵
    const baseMap = new Map(baseInvRaw.map(r => [r.YR, r]))
    const saleMap = new Map(yearlySales.map(r => [r.YR, r]))
    const inMap = new Map(yearlyInbound.map(r => [r.YR, r]))
    const dcMap = new Map(yearlyDcRate.map(r => [r.YR, r]))
    const remMap = new Map(currentInvRaw.map(r => [r.YR, r]))

    const years = ['26', '25', '24', '23', '22', '21']
    const invTable = years.map(yr => {
      const base = baseMap.get(yr)
      const sale = saleMap.get(yr)
      const inb = inMap.get(yr)
      const dc = dcMap.get(yr)
      const rem = remMap.get(yr)

      // TAG → 부가세 제외 (/1.1)
      const baseTag = Number(base?.BASE_TAG) || 0
      const baseCost = Number(base?.BASE_COST) || 0
      const baseQty = Number(base?.BASE_QTY) || 0
      const inTag = Number(inb?.IN_TAG) || 0
      const inCost = Number(inb?.IN_COST) || 0
      const inQty = Number(inb?.IN_QTY) || 0
      const saleTag = Number(sale?.SALE_TAG) || 0
      const saleQty = Number(sale?.SALE_QTY) || 0
      const saleAmt = Number(sale?.SALE_AMT) || 0
      const costAmt = Number(sale?.COST_AMT) || 0
      const tagAmt = Number(dc?.TAG_AMT) || 0
      const salePriceAmt = Number(dc?.SALE_PRICE_AMT) || 0
      const remTag = Number(rem?.REM_TAG) || 0
      const remCost = Number(rem?.REM_COST) || 0
      const remQty = Number(rem?.REM_QTY) || 0

      const dcRate = tagAmt > 0 ? Math.round((1 - salePriceAmt / tagAmt) * 1000) / 10 : 0
      const cogsRate = saleAmt > 0 ? Math.round(costAmt / saleAmt * 1000) / 10 : 0

      return { year: yr, baseTag, baseCost, baseQty, inTag, inCost, inQty, saleTag, saleQty, saleAmt, dcRate, cogsRate, remTag, remCost, remQty }
    })

    // 정상/이월 비중
    const nc = normCoRaw[0] || {}
    const lnc = lyNormCoRaw[0] || {}
    const N = (v: any) => Number(v) || 0
    const normCo = {
      normRev: N(nc.NORM_REV), coRev: N(nc.CO_REV),
      normRatio: (N(nc.NORM_REV) + N(nc.CO_REV)) > 0 ? Math.round(N(nc.NORM_REV) / (N(nc.NORM_REV) + N(nc.CO_REV)) * 1000) / 10 : 0,
      normDcRate: N(nc.NORM_TAG) > 0 ? Math.round((1 - N(nc.NORM_SALE) / N(nc.NORM_TAG)) * 1000) / 10 : 0,
      coDcRate: N(nc.CO_TAG) > 0 ? Math.round((1 - N(nc.CO_SALE) / N(nc.CO_TAG)) * 1000) / 10 : 0,
      normCogsRate: N(nc.NORM_REV) > 0 ? Math.round(N(nc.NORM_COST) / N(nc.NORM_REV) * 1000) / 10 : 0,
      coCogsRate: N(nc.CO_REV) > 0 ? Math.round(N(nc.CO_COST) / N(nc.CO_REV) * 1000) / 10 : 0,
      // 전년
      lyNormRatio: (N(lnc.NORM_REV) + N(lnc.CO_REV)) > 0 ? Math.round(N(lnc.NORM_REV) / (N(lnc.NORM_REV) + N(lnc.CO_REV)) * 1000) / 10 : 0,
      lyNormDcRate: N(lnc.NORM_TAG) > 0 ? Math.round((1 - N(lnc.NORM_SALE) / N(lnc.NORM_TAG)) * 1000) / 10 : 0,
      lyCoDcRate: N(lnc.CO_TAG) > 0 ? Math.round((1 - N(lnc.CO_SALE) / N(lnc.CO_TAG)) * 1000) / 10 : 0,
      lyNormCogsRate: N(lnc.NORM_REV) > 0 ? Math.round(N(lnc.NORM_COST) / N(lnc.NORM_REV) * 1000) / 10 : 0,
      lyCoCogsRate: N(lnc.CO_REV) > 0 ? Math.round(N(lnc.CO_COST) / N(lnc.CO_REV) * 1000) / 10 : 0,
    }

    return NextResponse.json({ kpi, monthly, brands, brandMonth, invTable, ytd, normCo })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
