import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'
import { fmtDateSf } from '@/lib/formatters'

/**
 * 월 예상 달성률 예측 API
 * Level 2 + 상품별 모멘텀 반영
 *
 * GET /api/sales/forecast?month=202604&brand=all
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const { valid, inClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })

  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const monthParam = searchParams.get('month') || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const yr = parseInt(monthParam.slice(0, 4))
  const mo = parseInt(monthParam.slice(4, 6))
  const lyYr = yr - 1

  // 날짜 범위
  const monthStart = `${yr}${String(mo).padStart(2, '0')}01`
  const monthLastDay = new Date(yr, mo, 0).getDate()
  const monthEnd = `${yr}${String(mo).padStart(2, '0')}${String(monthLastDay).padStart(2, '0')}`

  // 경과일: 어제까지 (당월이면 어제, 과거월이면 월말)
  const isCurrentMonth = yr === now.getFullYear() && mo === now.getMonth() + 1
  const elapsedEnd = isCurrentMonth ? fmtDateSf(yesterday) : monthEnd
  const daysElapsed = isCurrentMonth
    ? Math.max(0, yesterday.getDate())
    : monthLastDay
  const daysTotal = monthLastDay

  if (daysElapsed <= 0) {
    return NextResponse.json({ error: '아직 데이터가 없습니다.', forecast: null })
  }

  // 전년 동월
  const lyMonthStart = `${lyYr}${String(mo).padStart(2, '0')}01`
  const lyMonthEnd = `${lyYr}${String(mo).padStart(2, '0')}${String(new Date(lyYr, mo, 0).getDate()).padStart(2, '0')}`
  const lyElapsedEnd = `${lyYr}${String(mo).padStart(2, '0')}${String(Math.min(daysElapsed, new Date(lyYr, mo, 0).getDate())).padStart(2, '0')}`

  // 모멘텀용 직근 14일
  const d14ago = new Date(yesterday); d14ago.setDate(d14ago.getDate() - 13)
  const d7ago = new Date(yesterday); d7ago.setDate(d7ago.getDate() - 6)
  const momentum14Start = fmtDateSf(d14ago)
  const momentum7Split = fmtDateSf(d7ago)

  const brandWhere = `BRANDCD IN ${inClause}`

  try {
    const [cyDaily, lyDaily, cyItemDaily, lyItemFull, channelRaw] = await Promise.all([
      // 1. 금년 당월 일별 매출 합계
      snowflakeQuery<{ SALEDT: string; REV: number }>(`
        SELECT SALEDT, SUM(SALEAMT_VAT_EX) AS REV
        FROM ${SALES_VIEW}
        WHERE ${brandWhere} AND SALEDT BETWEEN '${monthStart}' AND '${elapsedEnd}'
        GROUP BY SALEDT ORDER BY SALEDT
      `),

      // 2. 전년 동월 전체 일별 매출
      snowflakeQuery<{ SALEDT: string; REV: number }>(`
        SELECT SALEDT, SUM(SALEAMT_VAT_EX) AS REV
        FROM ${SALES_VIEW}
        WHERE ${brandWhere} AND SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}'
        GROUP BY SALEDT ORDER BY SALEDT
      `),

      // 3. 금년 당월 상품별 경과 매출 + 직근 1주/전주 (모멘텀)
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${monthStart}' AND '${elapsedEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CY_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${momentum7Split}' AND '${fmtDateSf(yesterday)}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS CW_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${momentum14Start}' AND '${fmtDateSf(new Date(d7ago.getTime() - 86400000))}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS PW_REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE v.BRANDCD IN ${inClause}
          AND v.SALEDT BETWEEN '${momentum14Start}' AND '${fmtDateSf(yesterday)}'
        GROUP BY si.ITEMNM
      `),

      // 4. 전년 동월 상품별 전체 + 경과분
      snowflakeQuery<Record<string, string>>(`
        SELECT si.ITEMNM,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyElapsedEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_ELAPSED_REV,
          SUM(CASE WHEN v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}' THEN v.SALEAMT_VAT_EX ELSE 0 END) AS LY_FULL_REV
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE v.BRANDCD IN ${inClause}
          AND v.SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}'
        GROUP BY si.ITEMNM
      `),

      // 5. 채널별 경과 매출 + 전년 동월 전체/경과 + 모멘텀
      snowflakeQuery<Record<string, string>>(`
        SELECT SHOPTYPENM,
          SUM(CASE WHEN SALEDT BETWEEN '${monthStart}' AND '${elapsedEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS CY_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${lyMonthStart}' AND '${lyElapsedEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS LY_ELAPSED_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}' THEN SALEAMT_VAT_EX ELSE 0 END) AS LY_FULL_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${momentum7Split}' AND '${fmtDateSf(yesterday)}' THEN SALEAMT_VAT_EX ELSE 0 END) AS CW_REV,
          SUM(CASE WHEN SALEDT BETWEEN '${momentum14Start}' AND '${fmtDateSf(new Date(d7ago.getTime() - 86400000))}' THEN SALEAMT_VAT_EX ELSE 0 END) AS PW_REV
        FROM ${SALES_VIEW}
        WHERE ${brandWhere}
          AND (SALEDT BETWEEN '${monthStart}' AND '${elapsedEnd}'
            OR SALEDT BETWEEN '${lyMonthStart}' AND '${lyMonthEnd}'
            OR SALEDT BETWEEN '${momentum14Start}' AND '${fmtDateSf(yesterday)}')
        GROUP BY SHOPTYPENM
        ORDER BY CY_REV DESC
      `),
    ])

    // ── Signal A: 전년 동월 패턴 스케일링 (전체 레벨) ──
    const cyElapsedTotal = cyDaily.reduce((s, r) => s + Number(r.REV), 0)
    const lyElapsedTotal = lyDaily.filter(r => r.SALEDT <= lyElapsedEnd).reduce((s, r) => s + Number(r.REV), 0)
    const lyFullTotal = lyDaily.reduce((s, r) => s + Number(r.REV), 0)
    const lyRemainingTotal = lyFullTotal - lyElapsedTotal

    const overallGrowth = lyElapsedTotal > 0 ? cyElapsedTotal / lyElapsedTotal : 1
    const signalA = cyElapsedTotal + lyRemainingTotal * overallGrowth

    // ── Signal B: 요일 가중 일평균 외삽 ──
    const dowRevMap: Record<number, { total: number; count: number }> = {}
    for (const r of cyDaily) {
      const d = new Date(
        parseInt(r.SALEDT.slice(0, 4)),
        parseInt(r.SALEDT.slice(4, 6)) - 1,
        parseInt(r.SALEDT.slice(6, 8))
      )
      const dow = d.getDay() // 0=일 ~ 6=토
      if (!dowRevMap[dow]) dowRevMap[dow] = { total: 0, count: 0 }
      dowRevMap[dow].total += Number(r.REV)
      dowRevMap[dow].count += 1
    }
    let signalB = cyElapsedTotal
    for (let day = daysElapsed + 1; day <= daysTotal; day++) {
      const futureDate = new Date(yr, mo - 1, day)
      const dow = futureDate.getDay()
      const avg = dowRevMap[dow]?.count > 0
        ? dowRevMap[dow].total / dowRevMap[dow].count
        : cyElapsedTotal / daysElapsed // fallback: 전체 일평균
      signalB += avg
    }

    // ── Signal C: 상품별 모멘텀 가중 예측 ──
    const lyItemMap = new Map(lyItemFull.map(r => [r.ITEMNM, {
      elapsed: Number(r.LY_ELAPSED_REV) || 0,
      full: Number(r.LY_FULL_REV) || 0,
    }]))

    let signalC = 0
    const itemForecasts: { item: string; cyRev: number; forecast: number; momentum: number; growth: number }[] = []

    for (const r of cyItemDaily) {
      const item = r.ITEMNM
      const cyRev = Number(r.CY_REV) || 0
      const cwRev = Number(r.CW_REV) || 0
      const pwRev = Number(r.PW_REV) || 0
      const ly = lyItemMap.get(item)

      // 상품별 성장률
      const itemGrowth = ly && ly.elapsed > 0 ? cyRev / ly.elapsed : overallGrowth

      // 상품별 모멘텀 (WoW)
      let momentum = 1
      if (pwRev > 0 && cwRev > 0) {
        const rawMom = cwRev / pwRev
        momentum = 1 + (rawMom - 1) * 0.25 // 25% 반영
        momentum = Math.max(0.6, Math.min(1.5, momentum))
      }

      // 잔여 매출 예측
      let remaining: number
      if (ly && ly.full > ly.elapsed && ly.elapsed > 0) {
        // 전년 잔여 패턴 × 성장률 × 모멘텀
        remaining = (ly.full - ly.elapsed) * itemGrowth * momentum
      } else {
        // 전년 데이터 없는 신상품: 일평균 × 잔여일 × 모멘텀
        const dailyAvg = daysElapsed > 0 ? cyRev / daysElapsed : 0
        remaining = dailyAvg * (daysTotal - daysElapsed) * momentum
      }

      const itemForecast = cyRev + Math.max(0, remaining)
      signalC += itemForecast
      itemForecasts.push({ item, cyRev, forecast: itemForecast, momentum, growth: itemGrowth })
    }

    // 전년에만 있고 금년에 아직 매출 없는 상품 처리 (무시 — 이미 매출 없으면 예측도 0)

    // ── 앙상블: 가중치 동적 조정 ──
    let wA: number, wB: number, wC: number
    if (daysElapsed <= 5) {
      // 월초: 전년 패턴 의존
      wA = 0.5; wB = 0.15; wC = 0.35
    } else if (daysElapsed <= 15) {
      // 중반: 균형
      wA = 0.35; wB = 0.25; wC = 0.40
    } else {
      // 후반: 당월 데이터 신뢰
      wA = 0.20; wB = 0.30; wC = 0.50
    }

    const forecastRev = Math.round(signalA * wA + signalB * wB + signalC * wC)
    const forecastMin = Math.round(Math.min(signalA, signalB, signalC))
    const forecastMax = Math.round(Math.max(signalA, signalB, signalC))

    // 상품별 TOP 기여도 (예측 기준 정렬)
    const topItems = itemForecasts
      .sort((a, b) => b.forecast - a.forecast)
      .slice(0, 15)
      .map(i => ({
        item: i.item,
        cyRev: i.cyRev,
        forecast: Math.round(i.forecast),
        share: forecastRev > 0 ? Math.round(i.forecast / forecastRev * 1000) / 10 : 0,
        momentum: Math.round(i.momentum * 100) / 100,
        growth: Math.round(i.growth * 1000) / 10,
      }))

    // 일별 곡선 (차트용)
    const dailyCurve = {
      cy: cyDaily.map(r => ({ date: r.SALEDT, rev: Number(r.REV) })),
      ly: lyDaily.map(r => ({ date: r.SALEDT, rev: Number(r.REV) })),
    }

    // 채널별 예측
    // 대량 단건 거래 채널은 모멘텀 변동이 크므로 반영률 축소
    const isBulkChannel = (ch: string) => /면세|해외|사입|수출|위탁/.test(ch)

    const channelForecasts = (channelRaw as Record<string, string>[]).map(r => {
      const channel = r.SHOPTYPENM
      const cyRev = Number(r.CY_REV) || 0
      const lyElapsed = Number(r.LY_ELAPSED_REV) || 0
      const lyFull = Number(r.LY_FULL_REV) || 0
      const cwRev = Number(r.CW_REV) || 0
      const pwRev = Number(r.PW_REV) || 0

      const chGrowth = lyElapsed > 0 ? cyRev / lyElapsed : overallGrowth
      const momWeight = isBulkChannel(channel) ? 0.08 : 0.25 // 면세/해외: 8%, 일반: 25%
      let chMomentum = 1
      if (pwRev > 0 && cwRev > 0) {
        chMomentum = 1 + (cwRev / pwRev - 1) * momWeight
        chMomentum = Math.max(0.7, Math.min(1.3, chMomentum))
      }

      let chForecast: number
      if (lyFull > lyElapsed && lyElapsed > 0) {
        chForecast = cyRev + (lyFull - lyElapsed) * chGrowth * chMomentum
      } else {
        const dailyAvg = daysElapsed > 0 ? cyRev / daysElapsed : 0
        chForecast = cyRev + dailyAvg * (daysTotal - daysElapsed) * chMomentum
      }

      return {
        channel,
        cyRev,
        lyFull,
        forecast: Math.round(chForecast),
        share: forecastRev > 0 ? Math.round(chForecast / forecastRev * 1000) / 10 : 0,
        growth: Math.round(chGrowth * 1000) / 10,
        momentum: Math.round(chMomentum * 100) / 100,
      }
    }).sort((a, b) => b.forecast - a.forecast)

    return NextResponse.json({
      forecast: {
        elapsedRev: cyElapsedTotal,
        forecastRev,
        forecastMin,
        forecastMax,
        signals: {
          a: Math.round(signalA),
          b: Math.round(signalB),
          c: Math.round(signalC),
          weights: { a: wA, b: wB, c: wC },
        },
        lyElapsedRev: lyElapsedTotal,
        lyFullRev: lyFullTotal,
        growth: Math.round(overallGrowth * 1000) / 10,
        topItems,
        channelForecasts,
        dailyCurve,
      },
      meta: {
        asOfDate: elapsedEnd,
        daysElapsed,
        daysTotal,
        daysRemaining: daysTotal - daysElapsed,
        method: 'ensemble_ly_pattern_dow_item_momentum',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
