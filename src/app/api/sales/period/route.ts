import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

/**
 * 시즌/기간 분석 API — 브랜드×채널 그루핑
 *
 * GET /api/sales/period?brand=CO&year=26&season=봄,여름,상반기,스탠다드
 *   또는
 * GET /api/sales/period?brand=CO&fromDt=20260915&toDt=20260922&lyFromDt=20251003&lyToDt=20251010
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

  // 모드 결정: 커스텀 기간 > 시즌
  const isCustom = !!(fromDt && toDt)
  const seasons = seasonParam ? seasonParam.split(',').map(s => s.trim()) : ['봄', '여름', '상반기', '스탠다드']
  const seasonList = seasons.map(s => `'${s.replace(/'/g, "''")}'`).join(',')
  const prevYear = String(Number(year) - 1)

  // 날짜 범위 결정
  let cyDateFilter: string
  let lyDateFilter: string
  let siJoin: string

  if (isCustom) {
    const lyF = lyFromDt || String(Number(fromDt) - 10000)
    const lyT = lyToDt || String(Number(toDt) - 10000)
    cyDateFilter = `AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'`
    lyDateFilter = `AND v.SALEDT BETWEEN '${lyF}' AND '${lyT}'`
    siJoin = '' // 커스텀 기간은 시즌 필터 없음
  } else {
    cyDateFilter = `AND v.SALEDT >= '20${year}0101'`
    lyDateFilter = `AND v.SALEDT >= '20${prevYear}0101'`
    siJoin = `JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD`
  }

  const seasonFilter = isCustom ? '' : `AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})`
  const lySeasonFilter = isCustom ? '' : `AND si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList})`

  // SW_SALEINFO용 si JOIN + 필터
  const slSiJoin = isCustom ? '' : `JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD`
  const slSeasonFilter = isCustom ? '' : `AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})`
  const slLySeasonFilter = isCustom ? '' : `AND si.YEARCD = '${prevYear}' AND si.SEASONNM IN (${seasonList})`

  // 커스텀 기간용 날짜
  const cySlDateFilter = isCustom ? `AND sl.SALEDT BETWEEN '${fromDt}' AND '${toDt}'` : `AND sl.SALEDT >= '20${year}0101'`
  const lySlDateFilter = isCustom
    ? `AND sl.SALEDT BETWEEN '${lyFromDt || String(Number(fromDt) - 10000)}' AND '${lyToDt || String(Number(toDt) - 10000)}'`
    : `AND sl.SALEDT >= '20${prevYear}0101'`

  try {
    const [cyRows, lyRows, cyDcRows, lyDcRows] = await Promise.all([
      // 금년: 브랜드×채널별 매출/수량/원가
      snowflakeQuery<Record<string, string>>(`
        SELECT v.BRANDCD, v.BRANDNM, v.SHOPTYPENM,
          SUM(v.SALEAMT_VAT_EX) AS REV,
          SUM(v.SALEQTY) AS QTY,
          SUM(COALESCE(${isCustom ? '0' : 'si.PRODCOST'}, 0) * v.SALEQTY) AS COST
        FROM ${SALES_VIEW} v
        ${siJoin}
        WHERE v.BRANDCD IN ${inClause}
          ${cyDateFilter}
          ${seasonFilter}
        GROUP BY v.BRANDCD, v.BRANDNM, v.SHOPTYPENM
      `),

      // 전년: 브랜드×채널별 매출/수량/원가
      snowflakeQuery<Record<string, string>>(`
        SELECT v.BRANDCD, v.BRANDNM, v.SHOPTYPENM,
          SUM(v.SALEAMT_VAT_EX) AS REV,
          SUM(v.SALEQTY) AS QTY,
          SUM(COALESCE(${isCustom ? '0' : 'si.PRODCOST'}, 0) * v.SALEQTY) AS COST
        FROM ${SALES_VIEW} v
        ${siJoin}
        WHERE v.BRANDCD IN ${inClause}
          ${lyDateFilter}
          ${lySeasonFilter}
        GROUP BY v.BRANDCD, v.BRANDNM, v.SHOPTYPENM
      `),

      // 금년 할인율: SW_SALEINFO 기반
      snowflakeQuery<Record<string, string>>(`
        SELECT sl.BRANDCD, sh.SHOPTYPENM,
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG,
          SUM(sl.SALEAMT) AS SALE
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        ${slSiJoin}
        WHERE sl.BRANDCD IN ${inClause}
          ${cySlDateFilter}
          ${slSeasonFilter}
        GROUP BY sl.BRANDCD, sh.SHOPTYPENM
      `),

      // 전년 할인율
      snowflakeQuery<Record<string, string>>(`
        SELECT sl.BRANDCD, sh.SHOPTYPENM,
          SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG,
          SUM(sl.SALEAMT) AS SALE
        FROM BCAVE.SEWON.SW_SALEINFO sl
        JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
        ${slSiJoin}
        WHERE sl.BRANDCD IN ${inClause}
          ${lySlDateFilter}
          ${slLySeasonFilter}
        GROUP BY sl.BRANDCD, sh.SHOPTYPENM
      `),
    ])

    // 결과 조합: 브랜드×채널 키로 합산
    type Row = {
      brandcd: string; brandnm: string; channel: string
      rev: number; qty: number; cost: number
      lyRev: number; lyQty: number; lyCost: number
      tag: number; sale: number; lyTag: number; lySale: number
    }

    const map = new Map<string, Row>()
    const getKey = (brandcd: string, channel: string) => `${brandcd}::${channel}`

    for (const r of cyRows) {
      const key = getKey(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(key) || {
        brandcd: r.BRANDCD, brandnm: r.BRANDNM, channel: r.SHOPTYPENM,
        rev: 0, qty: 0, cost: 0, lyRev: 0, lyQty: 0, lyCost: 0,
        tag: 0, sale: 0, lyTag: 0, lySale: 0,
      }
      row.rev += Number(r.REV) || 0
      row.qty += Number(r.QTY) || 0
      row.cost += Number(r.COST) || 0
      map.set(key, row)
    }

    for (const r of lyRows) {
      const key = getKey(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(key) || {
        brandcd: r.BRANDCD, brandnm: r.BRANDNM, channel: r.SHOPTYPENM,
        rev: 0, qty: 0, cost: 0, lyRev: 0, lyQty: 0, lyCost: 0,
        tag: 0, sale: 0, lyTag: 0, lySale: 0,
      }
      row.lyRev += Number(r.REV) || 0
      row.lyQty += Number(r.QTY) || 0
      row.lyCost += Number(r.COST) || 0
      map.set(key, row)
    }

    for (const r of cyDcRows) {
      const key = getKey(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(key)
      if (row) {
        row.tag += Number(r.TAG) || 0
        row.sale += Number(r.SALE) || 0
      }
    }

    for (const r of lyDcRows) {
      const key = getKey(r.BRANDCD, r.SHOPTYPENM)
      const row = map.get(key)
      if (row) {
        row.lyTag += Number(r.TAG) || 0
        row.lySale += Number(r.SALE) || 0
      }
    }

    // 비율 계산 + 응답 구성
    const rows = Array.from(map.values()).map(r => ({
      brandcd: r.brandcd,
      brandnm: r.brandnm,
      channel: r.channel,
      rev: r.rev,
      lyRev: r.lyRev,
      qty: r.qty,
      lyQty: r.lyQty,
      yoy: r.lyRev > 0 ? Math.round((r.rev - r.lyRev) / r.lyRev * 1000) / 10 : null,
      dcRate: r.tag > 0 ? Math.round((1 - r.sale / r.tag) * 1000) / 10 : 0,
      lyDcRate: r.lyTag > 0 ? Math.round((1 - r.lySale / r.lyTag) * 1000) / 10 : 0,
      cogsRate: r.rev > 0 ? Math.round(r.cost / r.rev * 1000) / 10 : 0,
      lyCogsRate: r.lyRev > 0 ? Math.round(r.lyCost / r.lyRev * 1000) / 10 : 0,
    })).sort((a, b) => b.rev - a.rev)

    return NextResponse.json({ rows })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
