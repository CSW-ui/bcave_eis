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
  // 기준주의 시즌 판별(2~7월=S/S, 그 외=F/W) → 정상 = 당해 연차 + 당해 시즌(반기). 전년주도 같은 시즌과 자동 정렬
  const wsMonth = Number(cy0.slice(4, 6))
  const half = (wsMonth >= 2 && wsMonth <= 7) ? 'SS' : 'FW'
  const HALF_SEASONS = half === 'FW' ? ['가을', '겨울', '하반기', '스탠다드'] : ['봄', '여름', '상반기', '스탠다드']
  const halfIn = HALF_SEASONS.map(s => `'${s}'`).join(',')
  // 정상(N)=판매연도와 상품 연차 일치 + 그 주 시즌(반기) / 이월(C)=그 외
  const VIN = `CASE WHEN sti.YEARCD = SUBSTRING(v.SALEDT, 3, 2) AND sti.SEASONNM IN (${halfIn}) THEN 'N' ELSE 'C' END`

  const shopSql = `
    SELECT v.SHOPCD, MAX(si.SHOPNM) as SHOPNM, v.BRANDCD, v.SHOPTYPENM as CH, ${VIN} as VIN,
      ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV, ${win(cy0, cy1, 'v.SALEQTY')} as CY_QTY, ${win(cy0, cy1, TAG)} as CY_TAG,
      ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV, ${win(pv0, pv1, TAG)} as PV_TAG,
      ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} as LY_REV, ${win(ly0, ly1, 'v.SALEQTY')} as LY_QTY, ${win(ly0, ly1, TAG)} as LY_TAG
    FROM ${SALES_VIEW} v
    LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON v.SHOPCD = si.SHOPCD
    LEFT JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE ${brandWhere} AND ${dateWhere}
    GROUP BY v.SHOPCD, v.BRANDCD, v.SHOPTYPENM, ${VIN}
    HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} <> 0
  `

  const itemSql = `
    SELECT v.BRANDCD, sti.ITEMNM as ITEM, v.SHOPTYPENM as CH, ${VIN} as VIN,
      ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV, ${win(cy0, cy1, 'v.SALEQTY')} as CY_QTY, ${win(cy0, cy1, TAG)} as CY_TAG,
      ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV, ${win(pv0, pv1, TAG)} as PV_TAG,
      ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} as LY_REV, ${win(ly0, ly1, TAG)} as LY_TAG
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE ${brandWhere} AND ${dateWhere}
    GROUP BY v.BRANDCD, sti.ITEMNM, v.SHOPTYPENM, ${VIN}
    HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} <> 0
  `

  // 상품(스타일): 브랜드별 전주 대비 변화 큰 스타일 + 금주 베스트 (시즌·할인율 포함)
  // 베스트용 스타일 — 채널 차원 포함(채널 클릭 필터용) + 재고. 브랜드×채널별 상위 확보
  const styleSql = `
    SELECT * FROM (
      SELECT v.BRANDCD, v.STYLECD, v.SHOPTYPENM as CH, MAX(sti.STYLENM) as STYLENM, MAX(sti.ITEMNM) as ITEM, MAX(sti.SEASONNM) as SEASON, MAX(sti.YEARCD) as YR,
        ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} as CY_REV,
        ${win(cy0, cy1, 'v.SALEQTY')} as CY_QTY,
        ${win(cy0, cy1, TAG)} as CY_TAG,
        ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} as PV_REV,
        ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} as LY_REV,
        ${win(ly0, ly1, 'v.SALEQTY')} as LY_QTY,
        ${win(ly0, ly1, TAG)} as LY_TAG,
        MAX(COALESCE(sinv.SHOP_INV, 0)) as SHOP_INV,
        MAX(COALESCE(winv.WH_AVAIL, 0)) as WH_AVAIL
      FROM ${SALES_VIEW} v
      JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
      LEFT JOIN (SELECT STYLECD, SUM(INVQTY) AS SHOP_INV FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) sinv ON v.STYLECD = sinv.STYLECD
      LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) AS WH_AVAIL FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) winv ON v.STYLECD = winv.STYLECD
      WHERE ${brandWhere} AND (v.SALEDT BETWEEN '${pv0}' AND '${cy1}' OR v.SALEDT BETWEEN '${ly0}' AND '${ly1}')
      GROUP BY v.BRANDCD, v.STYLECD, v.SHOPTYPENM
      HAVING ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(pv0, pv1, 'v.SALEAMT_VAT_EX')} <> 0 OR ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} <> 0
      QUALIFY ROW_NUMBER() OVER (PARTITION BY v.BRANDCD, v.SHOPTYPENM ORDER BY ${win(cy0, cy1, 'v.SALEAMT_VAT_EX')} DESC) <= 25
           OR ROW_NUMBER() OVER (PARTITION BY v.BRANDCD, v.SHOPTYPENM ORDER BY ${win(ly0, ly1, 'v.SALEAMT_VAT_EX')} DESC) <= 25
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
      shopCd: r.SHOPCD, shopNm: r.SHOPNM ?? r.SHOPCD, brandcd: r.BRANDCD, channel: r.CH ?? '', vin: r.VIN === 'N' ? 'N' : 'C',
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG),
      prevRev: num(r.PV_REV), prevTag: num(r.PV_TAG),
      lyRev: num(r.LY_REV), lyQty: num(r.LY_QTY), lyTag: num(r.LY_TAG),
    }))
    const items = itemRows.map(r => ({
      brandcd: r.BRANDCD, item: r.ITEM || '미분류', channel: r.CH ?? '', vin: r.VIN === 'N' ? 'N' : 'C',
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG),
      prevRev: num(r.PV_REV), prevTag: num(r.PV_TAG),
      lyRev: num(r.LY_REV), lyTag: num(r.LY_TAG),
    }))
    const styles = styleRows.map(r => ({
      brandcd: r.BRANDCD, stylecd: r.STYLECD, channel: r.CH ?? '', styleNm: r.STYLENM || r.STYLECD, item: r.ITEM || '', season: r.SEASON || '', year: r.YR || '',
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG), prevRev: num(r.PV_REV),
      lyRev: num(r.LY_REV), lyQty: num(r.LY_QTY), lyTag: num(r.LY_TAG),
      shopInv: num(r.SHOP_INV), whAvail: num(r.WH_AVAIL),
    }))

    return NextResponse.json({
      meta: { weekStart: cy0, weekEnd: cy1, prevStart: pv0, prevEnd: pv1, lyStart: ly0, lyEnd: ly1, yy, half, halfSeasons: HALF_SEASONS },
      shops, items, styles,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
