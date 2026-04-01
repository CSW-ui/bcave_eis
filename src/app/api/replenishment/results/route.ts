import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { snowflakeQuery } from '@/lib/snowflake'

// GET /api/replenishment/results?brand=CO&date=20260316
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'CO'
  const today = new Date()
  const defaultDate = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
  const date = searchParams.get('date') || defaultDate

  // Supabase에서 AI 추천 결과 조회
  const { data, error } = await supabaseAdmin
    .from('replenishment_orders')
    .select('*')
    .eq('brand_cd', brand)
    .eq('order_date', date)
    .order('recommended_qty', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ shops: [], kpi: { shopCount: 0, skuCount: 0, totalQty: 0, totalAmt: 0, stockoutCount: 0 }, date })

  const shopCds = Array.from(new Set(data.map(r => `'${r.shop_cd}'`)))
  const styleCds = Array.from(new Set(data.map(r => `'${r.style_cd}'`)))

  // 전일 기준 날짜 (월 경계 안전 처리)
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const cutoffDt = fD(yesterday)
  const fromDate = new Date(today); fromDate.setDate(today.getDate() - 8)
  const fromDt = fD(fromDate)

  const days: string[] = []
  for (let i = 7; i >= 1; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    days.push(fD(d))
  }

  // Snowflake에서 보충 데이터 조회
  const [shopInfo, styleInfo, invInfo, saleInfo, gradeRank] = await Promise.all([
    // 매장 정보
    snowflakeQuery<Record<string, string>>(`
      SELECT SHOPCD, SHOPNM, SHOPTYPENM, AREANM FROM BCAVE.SEWON.SW_SHOPINFO WHERE SHOPCD IN (${shopCds.join(',')})
    `),
    // 상품 정보
    snowflakeQuery<Record<string, string>>(`
      SELECT STYLECD, STYLENM, TAGPRICE / 1.1 as TAGPRICE FROM BCAVE.SEWON.SW_STYLEINFO WHERE STYLECD IN (${styleCds.join(',')}) AND BRANDCD='${brand}'
    `),
    // 매장 재고
    snowflakeQuery<Record<string, string>>(`
      SELECT SHOPCD, STYLECD, COLORCD, SIZECD, INVQTY FROM BCAVE.SEWON.SW_SHOPINV
      WHERE SHOPCD IN (${shopCds.join(',')}) AND STYLECD IN (${styleCds.join(',')})
    `),
    // 일별 판매
    snowflakeQuery<Record<string, string>>(`
      SELECT s.SHOPCD, s.STYLECD, s.COLORCD, s.SIZECD,
        SUM(s.SALEQTY) as TOTAL_QTY,
        ${days.map((d, i) => `SUM(CASE WHEN s.SALEDT='${d}' THEN s.SALEQTY ELSE 0 END) as D${i}`).join(',')}
      FROM BCAVE.SEWON.SW_SALEINFO s
      WHERE s.BRANDCD='${brand}' AND s.SHOPCD IN (${shopCds.join(',')}) AND s.STYLECD IN (${styleCds.join(',')})
        AND s.SALEDT BETWEEN '${fromDt}' AND '${cutoffDt}' AND s.PRICETYPE='0' AND s.SALEQTY>0
      GROUP BY s.SHOPCD, s.STYLECD, s.COLORCD, s.SIZECD
    `),
    // 매장명 보완 (판매 데이터에서)
    snowflakeQuery<Record<string, string>>(`
      SELECT DISTINCT SHOPCD, SHOPNM FROM BCAVE.SEWON.SW_SALEINFO
      WHERE BRANDCD='${brand}' AND SHOPCD IN (${shopCds.join(',')}) AND SALEDT>='${date.slice(0,6)}01' LIMIT 500
    `),
  ])

  // 등급 조회
  const { data: sg } = await supabaseAdmin.from('shop_grades').select('shop_cd,grade').eq('brand_cd', brand)
  const sgMap = new Map((sg ?? []).map((r: { shop_cd: string; grade: string }) => [r.shop_cd, r.grade]))

  // 자동 등급
  const rankRes = await snowflakeQuery<Record<string, string>>(`
    SELECT s.SHOPCD, SUM(s.SALEAMT) as AMT FROM BCAVE.SEWON.SW_SALEINFO s
    WHERE s.BRANDCD='${brand}' AND s.SALEDT>=TO_CHAR(DATEADD(DAY,-90,CURRENT_DATE()),'YYYYMMDD')
      AND s.SALEQTY>0 AND s.PRICETYPE='0' GROUP BY s.SHOPCD
  `)
  const rankSorted = [...rankRes].sort((a, b) => (Number(b.AMT) || 0) - (Number(a.AMT) || 0))
  const autoGrade = new Map<string, string>()
  rankSorted.forEach((r, i) => {
    const p = rankSorted.length > 0 ? i / rankSorted.length : 0
    autoGrade.set(r.SHOPCD, p < 0.2 ? 'A' : p < 0.5 ? 'B' : p < 0.8 ? 'C' : 'D')
  })

  // 맵 구성
  const shopMap = new Map(shopInfo.map(r => [r.SHOPCD, { nm: r.SHOPNM, type: r.SHOPTYPENM, area: r.AREANM }]))
  const saleNmMap = new Map(gradeRank.map(r => [r.SHOPCD, r.SHOPNM]))
  const styleMap = new Map(styleInfo.map(r => [r.STYLECD, { nm: r.STYLENM, price: Number(r.TAGPRICE) || 0 }]))
  const invMap = new Map(invInfo.map(r => [`${r.SHOPCD}|${r.STYLECD}|${r.COLORCD}|${r.SIZECD}`, Number(r.INVQTY) || 0]))
  const saleMap = new Map(saleInfo.map(r => [`${r.SHOPCD}|${r.STYLECD}|${r.COLORCD}|${r.SIZECD}`, r]))

  // 매장별 그룹핑
  let stockoutCount = 0
  const byShop = new Map<string, any>()

  for (const row of data) {
    const shopCd = row.shop_cd
    if (!byShop.has(shopCd)) {
      const shop = shopMap.get(shopCd)
      byShop.set(shopCd, {
        shopCd,
        shopNm: shop?.nm ?? saleNmMap.get(shopCd) ?? shopCd,
        shopType: shop?.type ?? '',
        area: shop?.area ?? '',
        grade: sgMap.get(shopCd) ?? autoGrade.get(shopCd) ?? 'B',
        skuCount: 0, totalQty: 0, totalAmt: 0, items: [],
      })
    }

    const s = byShop.get(shopCd)!
    const style = styleMap.get(row.style_cd)
    const invKey = `${shopCd}|${row.style_cd}|${row.color_cd}|${row.size_cd}`
    const currentInv = invMap.get(invKey) ?? 0
    const saleRow = saleMap.get(invKey)
    const amt = (row.recommended_qty || 0) * (style?.price ?? 0)
    const dailyAvg = saleRow ? Number(saleRow.TOTAL_QTY || 0) / 7 : 0
    const daily = saleRow ? days.map((_, i) => Number(saleRow[`D${i}`]) || 0) : []
    const targetInv = Math.ceil(dailyAvg * 7)

    if (currentInv <= 0) stockoutCount++

    s.skuCount++
    s.totalQty += row.recommended_qty || 0
    s.totalAmt += amt
    s.items.push({
      styleCd: row.style_cd,
      styleNm: style?.nm ?? row.style_cd,
      colorCd: row.color_cd,
      sizeCd: row.size_cd,
      tagPrice: style?.price ?? 0,
      totalQty7d: saleRow ? Number(saleRow.TOTAL_QTY || 0) : 0,
      dailyAvg: Math.round(dailyAvg * 100) / 100,
      daily,
      currentInv,
      targetInv,
      whAvail: 0,
      recommended: row.recommended_qty,
      amount: amt,
      source: 'warehouse',
      rtFrom: '',
      reason: row.ai_reasoning || '',
    })
  }

  const shops = Array.from(byShop.values()).sort((a, b) => b.totalQty - a.totalQty)
  const totalQty = data.reduce((s, r) => s + (r.recommended_qty || 0), 0)
  const totalAmt = shops.reduce((s, sh) => s + sh.totalAmt, 0)

  return NextResponse.json({
    shops,
    days: days.map(d => d.slice(4)),
    kpi: { shopCount: shops.length, skuCount: data.length, totalQty, totalAmt, stockoutCount },
    date,
  })
}
