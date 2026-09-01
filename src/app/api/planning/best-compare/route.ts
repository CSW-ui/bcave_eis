import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW, parseBrandParam } from '@/lib/snowflake'

export const dynamic = 'force-dynamic'

// GET /api/planning/best-compare?brand=all&from=20260101&to=20260630
//   기간 금년 vs 전년동기(-1년) 비교
//   - items: 품목별 전체 집계(금년/전년 × 유니/우먼, 금액/수량) — 그래프용(전체 반영)
//   - styles: 품목별 상위 스타일(금년/전년·금액/수량 각 30) — 베스트 표용(품목 필터 시 충분)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const { valid, inClause } = parseBrandParam(searchParams.get('brand') || 'all')
  if (!valid) return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })

  const from = (searchParams.get('from') || '').replace(/[^0-9]/g, '')
  const to = (searchParams.get('to') || '').replace(/[^0-9]/g, '')
  if (!/^\d{8}$/.test(from) || !/^\d{8}$/.test(to)) return NextResponse.json({ error: 'from/to는 YYYYMMDD' }, { status: 400 })
  const lyFrom = String(Number(from) - 10000)
  const lyTo = String(Number(to) - 10000)

  // 시즌 필터(선택): year 지정 시 금년=해당 연차, 전년동기=연차-1 로 "시즌 정렬" 비교
  const year = (searchParams.get('year') || '').replace(/[^0-9]/g, '').slice(0, 2)
  const lyYear = year ? String(Number(year) - 1).padStart(2, '0') : ''
  const seasons = (searchParams.get('seasons') || '').split(',').map(s => s.trim()).filter(Boolean)
  const seasonClause = seasons.length
    ? ` AND sti.SEASONNM IN (${seasons.map(s => `'${s.replace(/'/g, "''")}'`).join(',')})`
    : ''

  const WOMEN = `sti.GENDERNM IN ('여성','키즈여자')`
  const cyWin = `v.SALEDT BETWEEN '${from}' AND '${to}'`
  const lyWin = `v.SALEDT BETWEEN '${lyFrom}' AND '${lyTo}'`
  // 시즌 선택 시 금년은 해당 연차, 전년은 (연차-1) 상품으로 각각 제한 → 시즌 정렬 비교
  const cyCond = year ? `${cyWin} AND sti.YEARCD = '${year}'${seasonClause}` : cyWin
  const lyCond = year ? `${lyWin} AND sti.YEARCD = '${lyYear}'${seasonClause}` : lyWin
  const dateWhere = `(${cyCond} OR ${lyCond})`
  // styleSql 후보 축소용(시즌 선택 시 두 연차 상품만 스캔)
  const styleSeasonWhere = year ? ` AND sti.YEARCD IN ('${year}','${lyYear}')${seasonClause}` : ''
  const TAG = `(sti.TAGPRICE / 1.1) * v.SALEQTY`
  const COST = `COALESCE(pc.PRECOST, sti.PRODCOST, 0) * v.SALEQTY`
  const PC = `LEFT JOIN (SELECT STYLECD, BRANDCD, AVG(PRECOST) AS PRECOST FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) pc ON sti.STYLECD = pc.STYLECD AND sti.BRANDCD = pc.BRANDCD`

  // 1) 품목별 전체 집계 (그래프)
  const itemSql = `
    SELECT sti.ITEMNM as ITEM,
      SUM(CASE WHEN ${cyCond} AND NOT ${WOMEN} THEN v.SALEAMT_VAT_EX ELSE 0 END) as CY_U_AMT,
      SUM(CASE WHEN ${cyCond} AND ${WOMEN} THEN v.SALEAMT_VAT_EX ELSE 0 END) as CY_W_AMT,
      SUM(CASE WHEN ${cyCond} AND NOT ${WOMEN} THEN v.SALEQTY ELSE 0 END) as CY_U_QTY,
      SUM(CASE WHEN ${cyCond} AND ${WOMEN} THEN v.SALEQTY ELSE 0 END) as CY_W_QTY,
      SUM(CASE WHEN ${lyCond} AND NOT ${WOMEN} THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_U_AMT,
      SUM(CASE WHEN ${lyCond} AND ${WOMEN} THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_W_AMT,
      SUM(CASE WHEN ${lyCond} AND NOT ${WOMEN} THEN v.SALEQTY ELSE 0 END) as LY_U_QTY,
      SUM(CASE WHEN ${lyCond} AND ${WOMEN} THEN v.SALEQTY ELSE 0 END) as LY_W_QTY
    FROM ${SALES_VIEW} v
    JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
    WHERE v.BRANDCD IN ${inClause} AND ${dateWhere}
    GROUP BY sti.ITEMNM
  `

  // 2) 품목별 상위 스타일 (표) — 품목마다 금년/전년·금액/수량 상위 30
  const styleSql = `
    SELECT * FROM (
      SELECT v.BRANDCD, v.STYLECD,
        MAX(sti.STYLENM) as STYLENM, MAX(sti.ITEMNM) as ITEM, MAX(sti.SEASONNM) as SEASON, MAX(sti.YEARCD) as YR, MAX(sti.GENDERNM) as GENDER,
        MAX(od.ORD_QTY) as ORD_QTY,
        SUM(v.SALEQTY) as CUM_QTY,
        SUM(CASE WHEN ${cyCond} THEN v.SALEAMT_VAT_EX ELSE 0 END) as CY_REV,
        SUM(CASE WHEN ${cyCond} THEN v.SALEQTY ELSE 0 END) as CY_QTY,
        SUM(CASE WHEN ${cyCond} THEN ${TAG} ELSE 0 END) as CY_TAG,
        SUM(CASE WHEN ${cyCond} THEN ${COST} ELSE 0 END) as CY_COST,
        SUM(CASE WHEN ${lyCond} THEN v.SALEAMT_VAT_EX ELSE 0 END) as LY_REV,
        SUM(CASE WHEN ${lyCond} THEN v.SALEQTY ELSE 0 END) as LY_QTY,
        SUM(CASE WHEN ${lyCond} THEN ${TAG} ELSE 0 END) as LY_TAG,
        SUM(CASE WHEN ${lyCond} THEN ${COST} ELSE 0 END) as LY_COST
      FROM ${SALES_VIEW} v
      JOIN BCAVE.SEWON.SW_STYLEINFO sti ON v.STYLECD = sti.STYLECD AND v.BRANDCD = sti.BRANDCD
      ${PC}
      LEFT JOIN (SELECT STYLECD, BRANDCD, SUM(ORDQTY) AS ORD_QTY FROM BCAVE.SEWON.SW_STYLEINFO_DETAIL GROUP BY STYLECD, BRANDCD) od ON sti.STYLECD = od.STYLECD AND sti.BRANDCD = od.BRANDCD
      WHERE v.BRANDCD IN ${inClause}${styleSeasonWhere}
      GROUP BY v.BRANDCD, v.STYLECD
      HAVING SUM(CASE WHEN ${cyCond} THEN v.SALEAMT_VAT_EX ELSE 0 END) <> 0 OR SUM(CASE WHEN ${lyCond} THEN v.SALEAMT_VAT_EX ELSE 0 END) <> 0
      QUALIFY ROW_NUMBER() OVER (PARTITION BY MAX(sti.ITEMNM) ORDER BY CY_REV DESC) <= 30
           OR ROW_NUMBER() OVER (PARTITION BY MAX(sti.ITEMNM) ORDER BY LY_REV DESC) <= 30
           OR ROW_NUMBER() OVER (PARTITION BY MAX(sti.ITEMNM) ORDER BY CY_QTY DESC) <= 30
           OR ROW_NUMBER() OVER (PARTITION BY MAX(sti.ITEMNM) ORDER BY LY_QTY DESC) <= 30
    )
  `

  try {
    const num = (v: string) => Number(v) || 0
    const [itemRows, styleRows] = await Promise.all([
      snowflakeQuery<Record<string, string>>(itemSql),
      snowflakeQuery<Record<string, string>>(styleSql),
    ])
    const items = itemRows.map(r => ({
      item: r.ITEM || '기타',
      cyUAmt: num(r.CY_U_AMT), cyWAmt: num(r.CY_W_AMT), cyUQty: num(r.CY_U_QTY), cyWQty: num(r.CY_W_QTY),
      lyUAmt: num(r.LY_U_AMT), lyWAmt: num(r.LY_W_AMT), lyUQty: num(r.LY_U_QTY), lyWQty: num(r.LY_W_QTY),
    }))
    const styles = styleRows.map(r => ({
      brandcd: r.BRANDCD, stylecd: r.STYLECD, styleNm: r.STYLENM || r.STYLECD, item: r.ITEM || '', season: r.SEASON || '', year: r.YR || '', gender: r.GENDER || '',
      ordQty: num(r.ORD_QTY), cumQty: num(r.CUM_QTY),
      cyRev: num(r.CY_REV), cyQty: num(r.CY_QTY), cyTag: num(r.CY_TAG), cyCost: num(r.CY_COST),
      lyRev: num(r.LY_REV), lyQty: num(r.LY_QTY), lyTag: num(r.LY_TAG), lyCost: num(r.LY_COST),
    }))
    return NextResponse.json({ items, styles, meta: { from, to, lyFrom, lyTo, year, lyYear, seasons } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
