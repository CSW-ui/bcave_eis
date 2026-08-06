import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'

export const dynamic = 'force-dynamic'

// GET /api/sales/weekly-report?weekStart=YYYYMMDD
//   지난 완료주(월~일) · 전주 · 전년동주(364일 전, 동요일) 집계
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
const shift = (d: Date, days: number) => { const n = new Date(d); n.setDate(d.getDate() + days); return n }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wsParam = (searchParams.get('weekStart') || '').replace(/[^0-9]/g, '')

  let weekStart: Date
  if (/^\d{8}$/.test(wsParam)) {
    weekStart = new Date(Number(wsParam.slice(0, 4)), Number(wsParam.slice(4, 6)) - 1, Number(wsParam.slice(6, 8)))
  } else {
    const now = new Date()
    const thisMon = shift(now, -(((now.getDay() + 6) % 7)))
    weekStart = shift(thisMon, -7)
  }
  const weekEnd = shift(weekStart, 6)
  const cy0 = ymd(weekStart), cy1 = ymd(weekEnd)
  const pv0 = ymd(shift(weekStart, -7)), pv1 = ymd(shift(weekEnd, -7))
  const ly0 = ymd(shift(weekStart, -364)), ly1 = ymd(shift(weekEnd, -364))
  const yy = cy0.slice(2, 4) // 당해년도 2자리 (소진율/정상 기준)

  const win = (a: string, b: string, col: string) => `SUM(CASE WHEN v.SALEDT BETWEEN '${a}' AND '${b}' THEN ${col} ELSE 0 END)`
  const TAG = `(sti.TAGPRICE / 1.1) * v.SALEQTY`
  const dateWhere = `(v.SALEDT BETWEEN '${ly0}' AND '${ly1}' OR v.SALEDT BETWEEN '${pv0}' AND '${pv1}' OR v.SALEDT BETWEEN '${cy0}' AND '${cy1}')`
  const brandWhere = `v.BRANDCD IN ('CO','WA','LE','CK','LK')`

  const shopSql = `
    SELECT v.SHOPCD, MAX(si.SHOPNM) as SHOPNM, v.BRANDCD, v.SHOPTYPENM as CH,
      ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV, ${win(cy0, cy1, 'v.SALEQTY')} as CY_QTY, ${win(cy0, cy1, TAG)} as CY_TAG,
      ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV, ${win(pv0, pv1, TAG)} as PV_TAG,
      ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} as LY_REV, ${win(ly0, ly1, 'v.SALEQTY')} as LY_QTY, ${win(ly0, ly1, TAG)} as LY_TAG
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON v.SHOPCD = si.SHOPCD
    LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE ${brandWhere} AND ${dateWhere}
    GROUP BY v.SHOPCD, v.BRANDCD, v.SHOPTYPENM
    HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} <> 0
  `

  const itemSql = `
    SELECT v.BRANDCD, sti.ITEMNM as ITEM,
      ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV, ${win(cy0, cy1, 'v.SALEQTY')} as CY_QTY, ${win(cy0, cy1, TAG)} as CY_TAG,
      ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV, ${win(pv0, pv1, TAG)} as PV_TAG,
      ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} as LY_REV, ${win(ly0, ly1, TAG)} as LY_TAG
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE ${brandWhere} AND ${dateWhere}
    GROUP BY v.BRANDCD, sti.ITEMNM
    HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} <> 0
  `

  // 상품(스타일): 브랜드별 전주 대비 변화 큰 스타일 + 금주 베스트 (시즌·할인율 포함)
  const styleSql = `
    SELECT * FROM (
      SELECT v.BRANDCD, v.STYLECD, MAX(sti.STYLENM) as STYLENM, MAX(sti.ITEMNM) as ITEM, MAX(sti.SEASONNM) as SEASON, MAX(sti.YEARCD) as YR,
        ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV,
        ${win(cy0, cy1, TAG)} as CY_TAG,
        ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV
      FROM ${SALES_VIEW} v
      JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
      WHERE ${brandWhere} AND v.SALEDT BETWEEN '${pv0}' AND '${cy1}'
      GROUP BY v.BRANDCD, v.STYLECD
      HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} <> 0
      QUALIFY ROW_NUMBER() OVER (PARTITION BY v.BRANDCD ORDER BY ABS(${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} - ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')}) DESC) <= 24
           OR ROW_NUMBER() OVER (PARTITION BY v.BRANDCD ORDER BY ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} DESC) <= 10
    )
  `

  try {
    const num = (v: string) => Number(v) || 0
    const [shopRows, itemRows, styleRows] = await Promise.all([
      snowflakeQuery<Record<string, string>>(shopSql),
      snowflakeQuery<Record<string, string>>(itemSql),
      snowflakeQuery<Record<string, string>>(styleSql),
    ])
    const shops = shopRows.map(r => ({
      shopCd: r.SHOPCD, shopNm: r.SHOPNM ?? r.SHOPCD, brandcd: r.BRANDCD, channel: r.CH ?? '',
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG),
      prevRev: num(r.PV_REV), prevTag: num(r.PV_TAG),
      lyRev: num(r.LY_REV), lyQty: num(r.LY_QTY), lyTag: num(r.LY_TAG),
    }))
    const items = itemRows.map(r => ({
      brandcd: r.BRANDCD, item: r.ITEM || '미분류',
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG),
      prevRev: num(r.PV_REV), prevTag: num(r.PV_TAG),
      lyRev: num(r.LY_REV), lyTag: num(r.LY_TAG),
    }))
    const styles = styleRows.map(r => ({
      brandcd: r.BRANDCD, stylecd: r.STYLECD, styleNm: r.STYLENM || r.STYLECD, item: r.ITEM || '', season: r.SEASON || '', year: r.YR || '',
      cyRev: num(r.CY_REV), cyTag: num(r.CY_TAG), prevRev: num(r.PV_REV),
    }))

    return NextResponse.json({
      meta: { weekStart: cy0, weekEnd: cy1, prevStart: pv0, prevEnd: pv1, lyStart: ly0, lyEnd: ly1, yy },
      shops, items, styles,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
