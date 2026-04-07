import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

// GET /api/sales/weekly?brand=all&toDt=20260308&channelGroup=오프라인&channel=백화점
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam   = searchParams.get('brand') || 'all'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  const { valid: brandValid, inClause: brandInClause } = parseBrandParam(brandParam)
  if (!brandValid) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const toDt         = searchParams.get('toDt')  || '20261231'
  const channelGroup = searchParams.get('channelGroup') || ''  // 오프라인|온라인|해외
  const channel      = searchParams.get('channel') || ''       // 특정 채널명 (우선순위↑)
  const channels     = searchParams.get('channels') || ''     // 다중 채널 (콤마 구분)

  const year    = toDt.slice(0, 4)
  const lyYear  = String(parseInt(year) - 1)
  const fromDt  = `${year}0101`
  const lyFromDt = `${lyYear}0101`
  const lyToDt   = `${lyYear}1231`

  const stylecd      = searchParams.get('stylecd') || ''

  const gender = searchParams.get('gender') || ''
  // weekly API는 테이블 별칭이 없으므로 서브쿼리 IN절로 성별 필터 적용
  const genderValues = gender === '유니' ? `'공통','남성','키즈공통'` : gender === '여성' ? `'여성','키즈여자'` : ''
  const genderFilter = genderValues ? `AND STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE GENDERNM IN (${genderValues}))` : ''
  const genderFilterSl = genderValues ? `AND sl.STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE GENDERNM IN (${genderValues}))` : ''

  const brandClause = `BRANDCD IN ${brandInClause}`
  const styleFilter = stylecd ? `AND STYLECD = '${stylecd.replace(/'/g, "''")}'` : ''

  // 채널 필터 SQL 생성
  function buildChannelFilter(tableAlias = ''): string {
    const col = tableAlias ? `${tableAlias}.SHOPTYPENM` : 'SHOPTYPENM'
    // 다중 채널 (콤마 구분)
    if (channels) {
      const chList = channels.split(',').map(c => `'${c.trim().replace(/'/g, "''")}'`).join(',')
      return `AND ${col} IN (${chList})`
    }
    if (channel) return `AND ${col} = '${channel.replace(/'/g, "''")}'`
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

  const chFilter = buildChannelFilter()

  try {
    // 채널 필터 (VW_SALES_VAT용)
    const chFilterSl = buildChannelFilter('sh')

    const [cyRows, lyRows, cyDcRows, lyDcRows] = await Promise.all([
      // 금년 주간 집계
      snowflakeQuery<{ WEEK_NUM: number; WEEK_START: string; REVENUE: number; QTY: number }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
           TO_VARCHAR(DATE_TRUNC('WEEK', TO_DATE(SALEDT, 'YYYYMMDD')), 'YYYYMMDD') AS WEEK_START,
           SUM(SALEAMT_VAT_EX) AS REVENUE,
           SUM(SALEQTY) AS QTY
         FROM ${SALES_VIEW}
         WHERE ${brandClause}
           AND SALEDT BETWEEN '${fromDt}' AND '${toDt}'
           ${chFilter}
           ${styleFilter}
           ${genderFilter}
         GROUP BY WEEK_NUM, WEEK_START
         ORDER BY WEEK_NUM`
      ),
      // 전년 주간 집계 (전체 연도)
      snowflakeQuery<{ WEEK_NUM: number; REVENUE: number }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
           SUM(SALEAMT_VAT_EX) AS REVENUE
         FROM ${SALES_VIEW}
         WHERE ${brandClause}
           AND SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
           ${chFilter}
           ${styleFilter}
           ${genderFilter}
         GROUP BY WEEK_NUM
         ORDER BY WEEK_NUM`
      ),
      // 할인율용: 금년 주간 VW_SALES_VAT
      snowflakeQuery<{ WEEK_NUM: number; TAG: number; SALE: number }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
           SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG,
           SUM(v.SALEAMT_VAT_EX) AS SALE
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           AND v.SALEDT BETWEEN '${fromDt}' AND '${toDt}'
           ${buildChannelFilter('v')}
           ${styleFilter ? styleFilter.replace(/STYLECD/g, 'v.STYLECD') : ''}
           ${genderValues ? `AND v.STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE GENDERNM IN (${genderValues}))` : ''}
         GROUP BY WEEK_NUM
         ORDER BY WEEK_NUM`
      ),
      // 할인율용: 전년 주간 VW_SALES_VAT
      snowflakeQuery<{ WEEK_NUM: number; TAG: number; SALE: number }>(
        `SELECT
           WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD')) AS WEEK_NUM,
           SUM((si.TAGPRICE / 1.1) * v.SALEQTY) AS TAG,
           SUM(v.SALEAMT_VAT_EX) AS SALE
         FROM ${SALES_VIEW} v
         JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
         WHERE v.BRANDCD IN ${brandInClause}
           AND v.SALEDT BETWEEN '${lyFromDt}' AND '${lyToDt}'
           ${buildChannelFilter('v')}
           ${styleFilter ? styleFilter.replace(/STYLECD/g, 'v.STYLECD') : ''}
           ${genderValues ? `AND v.STYLECD IN (SELECT STYLECD FROM BCAVE.SEWON.SW_STYLEINFO WHERE GENDERNM IN (${genderValues}))` : ''}
         GROUP BY WEEK_NUM
         ORDER BY WEEK_NUM`
      ),
    ])

    // 1-52주 배열 빌드 (없는 주는 null)
    const lyMap = new Map(lyRows.map(r => [Number(r.WEEK_NUM), Number(r.REVENUE)]))
    const cyMap = new Map(cyRows.map(r => [
      Number(r.WEEK_NUM),
      { revenue: Number(r.REVENUE), qty: Number(r.QTY), weekStart: r.WEEK_START },
    ]))
    const cyDcMap = new Map(cyDcRows.map(r => [Number(r.WEEK_NUM), { tag: Number(r.TAG) || 0, sale: Number(r.SALE) || 0 }]))
    const lyDcMap = new Map(lyDcRows.map(r => [Number(r.WEEK_NUM), { tag: Number(r.TAG) || 0, sale: Number(r.SALE) || 0 }]))

    const weeks = Array.from({ length: 52 }, (_, i) => {
      const weekNum = i + 1
      const cy = cyMap.get(weekNum)
      const cyDc = cyDcMap.get(weekNum)
      const lyDc = lyDcMap.get(weekNum)
      return {
        weekNum,
        weekStart: cy?.weekStart ?? null,
        cy:       cy ? cy.revenue : null,
        ly:       lyMap.get(weekNum) ?? null,
        qty:      cy ? cy.qty : null,
        dcRate:   cyDc && cyDc.tag > 0 ? Math.round((1 - cyDc.sale / cyDc.tag) * 1000) / 10 : null,
        lyDcRate: lyDc && lyDc.tag > 0 ? Math.round((1 - lyDc.sale / lyDc.tag) * 1000) / 10 : null,
      }
    })

    const cyTotal = cyRows.reduce((s, r) => s + Number(r.REVENUE), 0)
    const lyTotal = lyRows.reduce((s, r) => s + Number(r.REVENUE), 0)
    const maxWeek = cyRows.length > 0 ? Math.max(...cyRows.map(r => Number(r.WEEK_NUM))) : 0

    return NextResponse.json({ weeks, meta: { cyTotal, lyTotal, maxWeek } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
