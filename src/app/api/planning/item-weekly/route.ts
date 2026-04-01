import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/item-weekly?brand=all&year=26&season=봄,여름&item=반팔티셔츠
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand   = searchParams.get('brand') || 'all'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const year    = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄']
  const item    = searchParams.get('item') || ''

  const stylecd    = searchParams.get('stylecd') || ''
  const channel    = searchParams.get('channel') || ''

  if (!item) return NextResponse.json({ error: 'item required' }, { status: 400 })

  const brandWhere = brand === 'all'
    ? `v.BRANDCD IN ('CO','WA','LE','CK','LK')`
    : `v.BRANDCD = '${brand}'`
  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const styleFilter = stylecd ? `AND si.STYLECD = '${stylecd.replace(/'/g, "''")}'` : ''
  const channelFilter = channel ? `AND v.SHOPTYPENM = '${channel.replace(/'/g, "''")}'` : ''

  // 금년은 전주 일요일까지만
  const today = new Date()
  const dow = today.getDay()
  const lastSun = new Date(today)
  lastSun.setDate(today.getDate() - (dow === 0 ? 7 : dow))
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

  const cyFrom = `20${year}0101`
  const cyTo   = year === String(today.getFullYear()).slice(2) ? fD(lastSun) : `20${year}1231`
  const lyYear = String(Number(year) - 1)
  const lyFrom = `20${lyYear}0101`
  const lyTo   = `20${lyYear}1231`

  try {
    const [cyRows, lyRows] = await Promise.all([
      snowflakeQuery<{ WEEK_NUM: number; WEEK_START: string; REVENUE: number; QTY: number }>(`
        SELECT
          WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
          TO_VARCHAR(DATE_TRUNC('WEEK', TO_DATE(v.SALEDT, 'YYYYMMDD')), 'YYYYMMDD') AS WEEK_START,
          SUM(v.SALEAMT_VAT_EX) AS REVENUE,
          SUM(v.SALEQTY) AS QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND si.YEARCD = '${year}'
          AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${item.replace(/'/g, "''")}'
          AND v.SALEDT BETWEEN '${cyFrom}' AND '${cyTo}'
          ${styleFilter}
          ${channelFilter}
        GROUP BY WEEK_NUM, WEEK_START
        ORDER BY WEEK_NUM
      `),
      snowflakeQuery<{ WEEK_NUM: number; REVENUE: number; QTY: number }>(`
        SELECT
          WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
          SUM(v.SALEAMT_VAT_EX) AS REVENUE,
          SUM(v.SALEQTY) AS QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND si.YEARCD = '${lyYear}'
          AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${item.replace(/'/g, "''")}'
          AND v.SALEDT BETWEEN '${lyFrom}' AND '${lyTo}'
          ${styleFilter}
          ${channelFilter}
        GROUP BY WEEK_NUM
        ORDER BY WEEK_NUM
      `),
    ])

    const lyMap = new Map(lyRows.map(r => [Number(r.WEEK_NUM), Number(r.REVENUE)]))
    const cyMap = new Map(cyRows.map(r => [Number(r.WEEK_NUM), { revenue: Number(r.REVENUE), weekStart: r.WEEK_START }]))

    const weeks = Array.from({ length: 52 }, (_, i) => {
      const weekNum = i + 1
      const cy = cyMap.get(weekNum)
      return {
        weekNum,
        weekStart: cy?.weekStart ?? null,
        cy: cy ? cy.revenue : null,
        ly: lyMap.get(weekNum) ?? null,
      }
    })

    const cyTotal = cyRows.reduce((s, r) => s + Number(r.REVENUE), 0)
    const lyTotal = lyRows.reduce((s, r) => s + Number(r.REVENUE), 0)

    return NextResponse.json({ weeks, meta: { cyTotal, lyTotal } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
