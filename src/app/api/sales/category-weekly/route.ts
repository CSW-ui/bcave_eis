import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// 목표/캐시 영향 없이 항상 최신 집계
export const dynamic = 'force-dynamic'

// GET /api/sales/category-weekly?brand=all&toDt=20260615&channels=백화점,아울렛
//   또는 &channelGroup=오프라인
// 응답: 품목(ITEMNM)별 주차별 금년/전년 매출·수량 (카테고리 매핑은 클라이언트에서 처리)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const { valid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!valid) return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })

  const toDt = searchParams.get('toDt') || '20261231'
  const channelGroup = searchParams.get('channelGroup') || ''
  const channels = searchParams.get('channels') || ''
  const gender = searchParams.get('gender') || ''
  // item 지정 시 → 해당 품목을 채널(SHOPTYPENM)별로 분해 (채널 필터 무시, 전 채널 표시)
  const item = searchParams.get('item') || ''
  const byChannel = item !== ''

  const year = toDt.slice(0, 4)
  const lyYear = String(parseInt(year) - 1)
  const fromDt = `${year}0101`
  const lyFromDt = `${lyYear}0101`
  const lyToDt = `${lyYear}1231`

  const genderValues = gender === '유니' ? `'공통','남성','키즈공통'` : gender === '여성' ? `'여성','키즈여자'` : ''
  const genderFilter = genderValues
    ? `AND v.STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE GENDERNM IN (${genderValues}))`
    : ''

  // 채널 필터 (weekly API와 동일 규칙)
  function buildChannelFilter(): string {
    const col = 'v.SHOPTYPENM'
    if (channels) {
      const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
      return `AND ${col} IN (${chList})`
    }
    if (channelGroup === '해외') {
      return `AND (${col} LIKE '%해외%' OR ${col} LIKE '%global%' OR ${col} LIKE '%수출%' OR ${col} LIKE '%export%')`
    }
    if (channelGroup === '오프라인') {
      return `AND (${col} LIKE '%백화점%' OR ${col} LIKE '%아울렛%' OR ${col} LIKE '%가두%' OR ${col} LIKE '%직영%' OR ${col} LIKE '%대리%' OR ${col} LIKE '%면세%' OR ${col} LIKE '%팝업%' OR ${col} LIKE '%편집%' OR ${col} LIKE '%오프%' OR ${col} LIKE '%로드샵%' OR ${col} LIKE '%부티크%')`
    }
    if (channelGroup === '온라인') {
      return `AND NOT (${col} LIKE '%해외%' OR ${col} LIKE '%global%' OR ${col} LIKE '%수출%' OR ${col} LIKE '%백화점%' OR ${col} LIKE '%아울렛%' OR ${col} LIKE '%가두%' OR ${col} LIKE '%직영%' OR ${col} LIKE '%대리%' OR ${col} LIKE '%면세%' OR ${col} LIKE '%팝업%' OR ${col} LIKE '%편집%' OR ${col} LIKE '%오프%' OR ${col} LIKE '%로드샵%' OR ${col} LIKE '%부티크%')`
    }
    return ''
  }
  // 품목별 채널 분해 모드: 채널 필터 무시, ITEM 컬럼에 SHOPTYPENM 사용
  const chFilter = byChannel ? '' : buildChannelFilter()
  const dimCol = byChannel ? 'v.SHOPTYPENM' : 'si.ITEMNM'
  const itemFilter = byChannel ? `AND si.ITEMNM = '${item.replace(/'/g, "''")}'` : ''

  const sql = (f: string, t: string) => `
    SELECT WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
           ${dimCol} AS ITEM,
           SUM(v.SALEAMT_VAT_EX) AS REV,
           SUM(v.SALEQTY) AS QTY
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
    WHERE v.BRANDCD IN ${brandInClause}
      AND v.SALEDT BETWEEN '${f}' AND '${t}'
      ${chFilter}
      ${itemFilter}
      ${genderFilter}
    GROUP BY WEEK_NUM, ${dimCol}`

  try {
    const [cyRows, lyRows] = await Promise.all([
      snowflakeQuery<{ WEEK_NUM: number; ITEM: string; REV: number; QTY: number }>(sql(fromDt, toDt)),
      snowflakeQuery<{ WEEK_NUM: number; ITEM: string; REV: number; QTY: number }>(sql(lyFromDt, lyToDt)),
    ])

    type ItemAgg = { item: string; cy: Record<number, number>; ly: Record<number, number>; qty: Record<number, number> }
    const items = new Map<string, ItemAgg>()
    const get = (it: string): ItemAgg => {
      let o = items.get(it)
      if (!o) { o = { item: it, cy: {}, ly: {}, qty: {} }; items.set(it, o) }
      return o
    }

    let maxWeek = 0
    for (const r of cyRows) {
      const w = Number(r.WEEK_NUM)
      const o = get(r.ITEM || '미분류')
      o.cy[w] = (o.cy[w] || 0) + Number(r.REV)
      o.qty[w] = (o.qty[w] || 0) + Number(r.QTY)
      if (w > maxWeek) maxWeek = w
    }
    for (const r of lyRows) {
      const w = Number(r.WEEK_NUM)
      const o = get(r.ITEM || '미분류')
      o.ly[w] = (o.ly[w] || 0) + Number(r.REV)
    }

    return NextResponse.json({ maxWeek, items: Array.from(items.values()), meta: { year } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
