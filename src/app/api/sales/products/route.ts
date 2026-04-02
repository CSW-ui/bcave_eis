import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'
import { fmtDateSf } from '@/lib/formatters'

function getWeekBounds() {
  const today = new Date()
  const dow = today.getDay()
  const lastSun = new Date(today)
  lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const cwEnd = new Date(lastSun)
  const cwStart = new Date(lastSun); cwStart.setDate(cwStart.getDate() - 6)
  const pwEnd = new Date(cwStart); pwEnd.setDate(pwEnd.getDate() - 1)
  const pwStart = new Date(pwEnd); pwStart.setDate(pwStart.getDate() - 6)
  return { cwStart: fmtDateSf(cwStart), cwEnd: fmtDateSf(cwEnd), pwStart: fmtDateSf(pwStart), pwEnd: fmtDateSf(pwEnd) }
}

// GET /api/sales/products?brand=all&year=2026&toDt=20260308&weekNum=10&channelGroup=오프라인&channel=백화점
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam   = searchParams.get('brand') || 'all'
  const year         = searchParams.get('year')  || '2026'
  const toDt         = searchParams.get('toDt')  || `${year}1231`
  const weekNum      = searchParams.get('weekNum')
  const channelGroup = searchParams.get('channelGroup') || ''
  const channel      = searchParams.get('channel')      || ''
  const channels     = searchParams.get('channels')     || ''  // 다중 채널 (콤마 구분)
  const itemNm       = searchParams.get('item')          || ''

  // 기본: 전주 기준 (품목별 실적과 동일)
  const wb = getWeekBounds()
  const fromDt = searchParams.get('fromDt') || (!weekNum ? wb.cwStart : `${year}0101`)
  const defaultToDt = !weekNum && !searchParams.get('fromDt') ? wb.cwEnd : toDt

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const brandClause = `BRANDCD IN ${brandInClause}`

  let chFilter = ''
  const col = 's.SHOPTYPENM'
  if (channels) {
    const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
    chFilter = `AND ${col} IN (${chList})`
  } else if (channel) {
    chFilter = `AND ${col} = '${channel.replace(/'/g, "''")}'`
  } else if (channelGroup === '해외') {
    chFilter = `AND (${col} LIKE '%해외%' OR ${col} LIKE '%수출%')`
  } else if (channelGroup === '오프라인') {
    chFilter = `AND (${col} LIKE '%백화점%' OR ${col} LIKE '%아울렛%' OR ${col} LIKE '%가두%' OR ${col} LIKE '%직영%' OR ${col} LIKE '%대리%' OR ${col} LIKE '%면세%' OR ${col} LIKE '%팝업%' OR ${col} LIKE '%편집%' OR ${col} LIKE '%오프%' OR ${col} LIKE '%쇼핑몰%' OR ${col} LIKE '%사입%')`
  } else if (channelGroup === '온라인') {
    chFilter = `AND NOT (${col} LIKE '%해외%' OR ${col} LIKE '%수출%' OR ${col} LIKE '%백화점%' OR ${col} LIKE '%아울렛%' OR ${col} LIKE '%가두%' OR ${col} LIKE '%직영%' OR ${col} LIKE '%대리%' OR ${col} LIKE '%면세%' OR ${col} LIKE '%팝업%' OR ${col} LIKE '%편집%' OR ${col} LIKE '%오프%' OR ${col} LIKE '%쇼핑몰%' OR ${col} LIKE '%사입%')`
  }

  const weekFilter = weekNum
    ? `AND WEEKOFYEAR(TO_DATE(s.SALEDT, 'YYYYMMDD')) = ${parseInt(weekNum)}`
    : ''



  // SW_SALEINFO용 채널 필터
  let chFilterSl = ''
  const slCol = 'sh.SHOPTYPENM'
  if (channels) {
    const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
    chFilterSl = `AND ${slCol} IN (${chList})`
  } else if (channel) {
    chFilterSl = `AND ${slCol} = '${channel.replace(/'/g, "''")}'`
  } else if (channelGroup === '해외') {
    chFilterSl = `AND (${slCol} LIKE '%해외%' OR ${slCol} LIKE '%수출%')`
  } else if (channelGroup === '오프라인') {
    chFilterSl = `AND (${slCol} LIKE '%백화점%' OR ${slCol} LIKE '%아울렛%' OR ${slCol} LIKE '%가두%' OR ${slCol} LIKE '%직영%' OR ${slCol} LIKE '%대리%' OR ${slCol} LIKE '%면세%' OR ${slCol} LIKE '%팝업%' OR ${slCol} LIKE '%편집%' OR ${slCol} LIKE '%오프%' OR ${slCol} LIKE '%쇼핑몰%' OR ${slCol} LIKE '%사입%')`
  } else if (channelGroup === '온라인') {
    chFilterSl = `AND NOT (${slCol} LIKE '%해외%' OR ${slCol} LIKE '%수출%' OR ${slCol} LIKE '%백화점%' OR ${slCol} LIKE '%아울렛%' OR ${slCol} LIKE '%가두%' OR ${slCol} LIKE '%직영%' OR ${slCol} LIKE '%대리%' OR ${slCol} LIKE '%면세%' OR ${slCol} LIKE '%팝업%' OR ${slCol} LIKE '%편집%' OR ${slCol} LIKE '%오프%' OR ${slCol} LIKE '%쇼핑몰%' OR ${slCol} LIKE '%사입%')`
  }

  const weekFilterSl = weekNum
    ? `AND WEEKOFYEAR(TO_DATE(sl.SALEDT, 'YYYYMMDD')) = ${parseInt(weekNum)}`
    : ''

  try {
    const [rows, dcRows] = await Promise.all([
      snowflakeQuery<Record<string, string>>(
        `SELECT s.STYLECD, si.STYLENM, s.BRANDCD,
           SUM(s.SALEAMT_VAT_EX) AS REVENUE,
           SUM(s.SALEQTY) AS QTY,
           SUM(CASE WHEN s.SALEDT BETWEEN '${wb.cwStart}' AND '${wb.cwEnd}' THEN s.SALEAMT_VAT_EX ELSE 0 END) AS CW_REV,
           SUM(CASE WHEN s.SALEDT BETWEEN '${wb.pwStart}' AND '${wb.pwEnd}' THEN s.SALEAMT_VAT_EX ELSE 0 END) AS PW_REV
         FROM ${SALES_VIEW} s
         LEFT JOIN BCAVE.SEWON.SW_STYLEINFO si ON s.STYLECD = si.STYLECD
         WHERE s.BRANDCD IN ${brandInClause}
           AND s.SALEDT BETWEEN '${fromDt}' AND '${defaultToDt}'
           ${weekFilter}
           ${chFilter}
           ${itemNm ? `AND si.ITEMNM = '${itemNm.replace(/'/g, "''")}'` : ''}
         GROUP BY s.STYLECD, si.STYLENM, s.BRANDCD
         ORDER BY REVENUE DESC
         LIMIT 20`
      ),
      // 할인율용: SW_SALEINFO (스타일별 TAG·SALEAMT)
      snowflakeQuery<Record<string, string>>(
        `SELECT sl.STYLECD,
           SUM((sl.TAGPRICE / 1.1) * sl.SALEQTY) AS TAG_TOTAL,
           SUM(sl.SALEAMT) AS SALE_TOTAL
         FROM BCAVE.SEWON.SW_SALEINFO sl
         JOIN BCAVE.SEWON.SW_SHOPINFO sh ON sl.SHOPCD = sh.SHOPCD
         ${itemNm ? `JOIN BCAVE.SEWON.SW_STYLEINFO si ON sl.STYLECD = si.STYLECD AND sl.BRANDCD = si.BRANDCD` : ''}
         WHERE sl.BRANDCD IN ${brandInClause}
           AND sl.SALEDT BETWEEN '${fromDt}' AND '${defaultToDt}'
           ${weekFilterSl}
           ${chFilterSl}
           ${itemNm ? `AND si.ITEMNM = '${itemNm.replace(/'/g, "''")}'` : ''}
         GROUP BY sl.STYLECD`
      ),
    ])

    const dcMap = new Map(dcRows.map(r => [r.STYLECD, { tag: Number(r.TAG_TOTAL) || 0, sale: Number(r.SALE_TOTAL) || 0 }]))

    return NextResponse.json({
      products: rows.map(p => {
        const dc = dcMap.get(p.STYLECD)
        const tag = dc?.tag || 0
        const sale = dc?.sale || 0
        return {
          code:    p.STYLECD,
          name:    p.STYLENM ?? p.STYLECD,
          brand:   p.BRANDCD,
          revenue: Number(p.REVENUE) || 0,
          qty:     Number(p.QTY) || 0,
          tagTotal:  tag,
          saleTotal: sale,
          dcRate:    tag > 0 ? Math.round((1 - sale / tag) * 1000) / 10 : null,
          cwRev:   Number(p.CW_REV) || 0,
          pwRev:   Number(p.PW_REV) || 0,
        }
      }),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
