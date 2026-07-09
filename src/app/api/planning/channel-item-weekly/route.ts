import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'

// GET /api/planning/channel-item-weekly?brand=CO,LE&year=26&season=봄,여름&gender=&channel=&item=&only=
// 채널/품목 × 주차 × 정상·이월 실적 (금액·수량·TAG → 할인율 파생, 전년 동주 포함)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandParam = searchParams.get('brand') || 'all'
  const brandList = brandParam === 'all' ? null : brandParam.split(',').filter(b => VALID_BRANDS.has(b))
  if (brandList && brandList.length === 0) return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })

  const brandInClause = brandList ? `(${brandList.map(b => `'${b}'`).join(',')})` : `('CO','WA','LE','CK','LK')`
  const vBrandClause = `v.BRANDCD IN ${brandInClause}`

  const year = (searchParams.get('year') || '26').replace(/[^0-9]/g, '')
  const lyYear = String(Number(year) - 1)
  const seasons = searchParams.get('season')?.split(',') || ['봄', '여름']
  const seasonList = seasons.map(s => `'${s.replace(/'/g, "''")}'`).join(',')
  const gender = searchParams.get('gender') || ''
  const genderWhere = gender === '유니'
    ? `AND si.GENDERNM IN ('공통','남성','키즈공통')`
    : gender === '여성' ? `AND si.GENDERNM IN ('여성','키즈여자')` : ''
  const channel = (searchParams.get('channel') || '').trim()
  const channelWhere = channel ? `AND v.SHOPTYPENM = '${channel.replace(/'/g, "''")}'` : ''
  const item = (searchParams.get('item') || '').trim()
  const itemWhere = item ? `AND si.ITEMNM = '${item.replace(/'/g, "''")}'` : ''
  const stylecd = (searchParams.get('stylecd') || '').trim()
  const styleWhere = stylecd ? `AND v.STYLECD = '${stylecd.replace(/'/g, "''")}'` : ''
  const only = searchParams.get('only') || '' // 'channel' | 'item' | '' (둘 다)
  const gran = searchParams.get('gran') === 'month' ? 'month' : 'week' // 집계 단위

  const cyDate = `v.SALEDT BETWEEN '20${year}0101' AND '20${year}1231'`
  const lyDate = `v.SALEDT BETWEEN '20${lyYear}0101' AND '20${lyYear}1231'`
  const dateWindow = `(${cyDate} OR ${lyDate})`
  // 버킷 = 주차(주 시작 월요일) 또는 월(1~12, 월 시작일). CY/LY는 같은 버킷번호로 매칭(주:동주차, 월:동월)
  const bucketNum = gran === 'month'
    ? `CAST(SUBSTRING(v.SALEDT, 5, 2) AS INT)`
    : `WEEKOFYEAR(TO_DATE(v.SALEDT, 'YYYYMMDD'))`
  const bucketStart = gran === 'month'
    ? `SUBSTRING(v.SALEDT, 1, 6) || '01'`
    : `TO_CHAR(DATE_TRUNC('WEEK', TO_DATE(v.SALEDT, 'YYYYMMDD')), 'YYYYMMDD')`
  // 정상(N)=판매연도와 상품연차 일치 / 이월(C)=그 외(전년 이전 상품)
  const vin = `CASE WHEN si.YEARCD = SUBSTRING(v.SALEDT, 3, 2) THEN 'N' ELSE 'C' END`

  const buildSql = (keyCol: string, extraWhere: string) => `
    SELECT SUBSTRING(v.SALEDT, 1, 4) as YR,
      ${bucketNum} as WK,
      ${bucketStart} as WK_START,
      ${keyCol} as KEY,
      ${vin} as VIN,
      SUM(v.SALEAMT_VAT_EX) as REV,
      SUM(v.SALEQTY) as QTY,
      SUM((si.TAGPRICE / 1.1) * v.SALEQTY) as TAG
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
    WHERE ${vBrandClause} AND si.SEASONNM IN (${seasonList}) ${genderWhere} ${styleWhere} ${extraWhere} AND ${dateWindow}
    GROUP BY YR, WK, ${bucketStart}, ${keyCol}, ${vin}
    ORDER BY WK`

  try {
    const EMPTY = Promise.resolve([] as Record<string, string>[])
    const [chRaw, itemRaw] = await Promise.all([
      only === 'item' ? EMPTY : snowflakeQuery<Record<string, string>>(buildSql('v.SHOPTYPENM', itemWhere)),
      only === 'channel' ? EMPTY : snowflakeQuery<Record<string, string>>(buildSql('si.ITEMNM', channelWhere)),
    ])

    const curFullYear = `20${year}`
    const weekDates: Record<number, string> = {}
    const pivot = (raw: Record<string, string>[]) => {
      const map = new Map<string, { week: number; key: string; vin: string; cyAmt: number; cyQty: number; cyTag: number; lyAmt: number; lyQty: number; lyTag: number }>()
      for (const r of raw) {
        const week = Number(r.WK)
        const key = r.KEY || '미분류'
        const v = r.VIN === 'N' ? 'N' : 'C'
        const mk = `${key}|${v}|${week}`
        let e = map.get(mk)
        if (!e) { e = { week, key, vin: v, cyAmt: 0, cyQty: 0, cyTag: 0, lyAmt: 0, lyQty: 0, lyTag: 0 }; map.set(mk, e) }
        if (r.YR === curFullYear) {
          e.cyAmt += Number(r.REV) || 0; e.cyQty += Number(r.QTY) || 0; e.cyTag += Number(r.TAG) || 0
          if (r.WK_START) weekDates[week] = String(r.WK_START)
        } else {
          e.lyAmt += Number(r.REV) || 0; e.lyQty += Number(r.QTY) || 0; e.lyTag += Number(r.TAG) || 0
        }
      }
      return Array.from(map.values()).filter(e => e.cyAmt !== 0 || e.lyAmt !== 0)
    }

    return NextResponse.json({ channelWeekly: pivot(chRaw), itemWeekly: pivot(itemRaw), weekDates })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
