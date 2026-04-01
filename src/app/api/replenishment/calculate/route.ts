import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'
import { supabaseAdmin } from '@/lib/supabase'
import { VALID_BRANDS } from '@/lib/constants'

export const maxDuration = 300

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

// POST /api/replenishment/calculate
export async function POST(req: Request) {
  const { brand } = await req.json() as { brand: string }

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (!VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  const today = new Date()
  const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const orderDate = fD(today)
  const cutoffDt = fD(new Date(today.getTime() - 86400000))
  const fromDt = fD(new Date(today.getTime() - 8 * 86400000))
  const days: string[] = []
  for (let i = 7; i >= 1; i--) { const d = new Date(today); d.setDate(today.getDate() - i); days.push(fD(d)) }
  const curYr = String(today.getFullYear()).slice(2)

  try {
    // ═══ STEP 1: 전체 데이터 정확히 조회 ═══

    const [salesData, whData] = await Promise.all([
      snowflakeQuery<Record<string, string>>(`
        SELECT s.SHOPCD, MAX(s.SHOPNM) as SHOPNM, s.STYLECD, s.COLORCD, s.SIZECD,
          SUM(s.SALEQTY) as TOTAL_QTY, ROUND(SUM(s.SALEQTY)/7, 2) as DAILY_AVG,
          ${days.map((d, i) => `SUM(CASE WHEN s.SALEDT='${d}' THEN s.SALEQTY ELSE 0 END) as D${i}`).join(',')}
        FROM BCAVE.SEWON.SW_SALEINFO s
        LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON s.SHOPCD = si.SHOPCD
        WHERE s.BRANDCD='${brand}' AND s.SALEDT BETWEEN '${fromDt}' AND '${cutoffDt}'
          AND s.SALEQTY>0 AND s.PRICETYPE='0'
          AND COALESCE(si.SHOPTYPENM,'') NOT LIKE '%면세%'
          AND COALESCE(si.SHOPTYPENM,'') NOT LIKE '%해외%'
          AND COALESCE(si.SHOPTYPENM,'') NOT LIKE '%온라인%'
          AND COALESCE(si.SHOPTYPENM,'') NOT LIKE '%B2B%'
          AND COALESCE(si.SHOPTYPENM,'') NOT LIKE '%오프라인 위탁%'
        GROUP BY s.SHOPCD, s.STYLECD, s.COLORCD, s.SIZECD HAVING SUM(s.SALEQTY)>0
      `),
      snowflakeQuery<Record<string, string>>(`SELECT STYLECD, SUM(AVAILQTY) as WH FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD`),
    ])

    const skuKeys = Array.from(new Set(salesData.map(r => `'${r.STYLECD}'`))).slice(0, 1000)
    const shopKeys = Array.from(new Set(salesData.map(r => `'${r.SHOPCD}'`))).slice(0, 500)

    const [invData, shopData, styleData] = await Promise.all([
      skuKeys.length && shopKeys.length
        ? snowflakeQuery<Record<string, string>>(`SELECT SHOPCD,STYLECD,COLORCD,SIZECD,INVQTY FROM BCAVE.SEWON.SW_SHOPINV WHERE SHOPCD IN (${shopKeys.join(',')}) AND STYLECD IN (${skuKeys.join(',')})`)
        : Promise.resolve([]),
      snowflakeQuery<Record<string, string>>(`SELECT SHOPCD,SHOPNM,SHOPTYPENM,AREANM FROM BCAVE.SEWON.SW_SHOPINFO`),
      snowflakeQuery<Record<string, string>>(`SELECT STYLECD,STYLENM,TAGPRICE / 1.1 as TAGPRICE,YEARCD,SEASONNM FROM BCAVE.SEWON.SW_STYLEINFO WHERE BRANDCD='${brand}'`),
    ])

    // 등급
    const { data: sg } = await supabaseAdmin.from('shop_grades').select('shop_cd,grade').eq('brand_cd', brand)
    const sgMap = new Map((sg ?? []).map((r: { shop_cd: string; grade: string }) => [r.shop_cd, r.grade]))

    // 3개월 매출 기반 자동 등급
    const rankData = await snowflakeQuery<Record<string, string>>(`
      SELECT s.SHOPCD, SUM(s.SALEAMT) as AMT FROM BCAVE.SEWON.SW_SALEINFO s
      WHERE s.BRANDCD='${brand}' AND s.SALEDT>=TO_CHAR(DATEADD(DAY,-90,CURRENT_DATE()),'YYYYMMDD')
        AND s.SALEQTY>0 AND s.PRICETYPE='0' GROUP BY s.SHOPCD
    `)
    const rankSorted = [...rankData].sort((a, b) => (Number(b.AMT) || 0) - (Number(a.AMT) || 0))
    const autoGrade = new Map<string, string>()
    rankSorted.forEach((r, i) => {
      const p = rankSorted.length > 0 ? i / rankSorted.length : 0
      autoGrade.set(r.SHOPCD, p < 0.2 ? 'A' : p < 0.5 ? 'B' : p < 0.8 ? 'C' : 'D')
    })

    const invMap = new Map(invData.map(r => [`${r.SHOPCD}|${r.STYLECD}|${r.COLORCD}|${r.SIZECD}`, Number(r.INVQTY) || 0]))
    const whMap = new Map(whData.map(r => [r.STYLECD, Number(r.WH) || 0]))
    const shopMap = new Map(shopData.map(r => [r.SHOPCD, { nm: r.SHOPNM, type: r.SHOPTYPENM, area: r.AREANM }]))
    const saleNm = new Map(salesData.map(r => [r.SHOPCD, r.SHOPNM]))
    const styleMap = new Map(styleData.map(r => [r.STYLECD, { nm: r.STYLENM, price: Number(r.TAGPRICE) || 0, yr: r.YEARCD || '', season: r.SEASONNM || '' }]))

    // ═══ STEP 2: 매장별 데이터 구성 ═══

    interface SkuData {
      styleCd: string; styleNm: string; colorCd: string; sizeCd: string
      tagPrice: number; isCarryover: boolean; season: string
      totalQty7d: number; dailyAvg: number; daily: number[]
      currentInv: number; whAvail: number
    }

    const shopSkuMap = new Map<string, { shopCd: string; shopNm: string; shopType: string; area: string; grade: string; skus: SkuData[] }>()

    for (const row of salesData) {
      const shopCd = row.SHOPCD
      const shop = shopMap.get(shopCd)
      const style = styleMap.get(row.STYLECD)
      const invKey = `${shopCd}|${row.STYLECD}|${row.COLORCD}|${row.SIZECD}`
      const inv = invMap.get(invKey) ?? 0
      const wh = whMap.get(row.STYLECD) ?? 0

      if (wh <= 0) continue // 물류 재고 없으면 스킵

      if (!shopSkuMap.has(shopCd)) {
        shopSkuMap.set(shopCd, {
          shopCd,
          shopNm: shop?.nm ?? saleNm.get(shopCd) ?? shopCd,
          shopType: shop?.type ?? '',
          area: shop?.area ?? '',
          grade: sgMap.get(shopCd) ?? autoGrade.get(shopCd) ?? 'B',
          skus: [],
        })
      }

      shopSkuMap.get(shopCd)!.skus.push({
        styleCd: row.STYLECD, styleNm: style?.nm ?? row.STYLECD,
        colorCd: row.COLORCD, sizeCd: row.SIZECD,
        tagPrice: style?.price ?? 0, isCarryover: (style?.yr ?? '') < curYr,
        season: style?.season ?? '',
        totalQty7d: Number(row.TOTAL_QTY) || 0,
        dailyAvg: Number(row.DAILY_AVG) || 0,
        daily: days.map((_, i) => Number(row[`D${i}`]) || 0),
        currentInv: inv, whAvail: wh,
      })
    }

    const allShops = Array.from(shopSkuMap.values())
    console.log(`[보충출고] ${brand}: ${allShops.length}매장, ${allShops.reduce((s, sh) => s + sh.skus.length, 0)} SKU`)

    // ═══ STEP 3: Claude에게 매장 단위로 전달 → 수량 판단 ═══

    await supabaseAdmin.from('replenishment_orders').delete().eq('order_date', orderDate).eq('brand_cd', brand)

    let totalSaved = 0
    let stockoutCount = 0
    const _aiReasons: string[] = []

    // 매장을 5개씩 묶어서 Claude에 전달
    const batchSize = 5
    for (let bi = 0; bi < allShops.length; bi += batchSize) {
      const batch = allShops.slice(bi, bi + batchSize)

      const batchData = batch.map(shop => ({
        매장코드: shop.shopCd, 매장명: shop.shopNm, 유형: shop.shopType, 지역: shop.area, 등급: shop.grade,
        상품목록: shop.skus.map(sku => ({
          상품코드: sku.styleCd, 상품명: sku.styleNm, 컬러: sku.colorCd, 사이즈: sku.sizeCd,
          정가: sku.tagPrice, 이월: sku.isCarryover,
          '7일합계': sku.totalQty7d, 일평균: sku.dailyAvg,
          일별판매: sku.daily.join(','), 현재고: sku.currentInv, 물류재고: sku.whAvail,
        })),
      }))

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4000,
            system: `패션기업 매장 보충출고 전문가. 매장×SKU 데이터를 보고 출고 수량을 판단하세요.

규칙: 목표재고=일평균×7(1주분), 보충=목표-현재고(최대10), 아울렛은 이월우선.
판매 추이(일별 변화)를 고려하여 상승세면 +, 하락세면 - 보정.
현재고 0이면 결품이므로 우선 보충.

반드시 아래 JSON으로만 응답:
[{"shop_cd":"..","style_cd":"..","color_cd":"..","size_cd":"..","qty":숫자,"reason":"근거"}]

보충 불필요(현재고 충분)한 SKU는 제외하세요.`,
            messages: [{ role: 'user', content: JSON.stringify(batchData) }],
          }),
        })

        if (!res.ok) { console.error(`Claude batch ${bi} error:`, res.status); continue }

        const json = await res.json()
        const text = json.content?.[0]?.text || ''

        // JSON 파싱
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]) as { shop_cd: string; style_cd: string; color_cd: string; size_cd: string; qty: number; reason?: string }[]
          const rows = items.filter(i => i.qty > 0).map(i => ({
            order_date: orderDate, brand_cd: brand,
            shop_cd: i.shop_cd, style_cd: i.style_cd,
            color_cd: i.color_cd, size_cd: i.size_cd,
            recommended_qty: Math.min(i.qty, 10),
            ai_reasoning: i.reason || '', status: 'pending',
          }))

          if (rows.length > 0) {
            for (let ri = 0; ri < rows.length; ri += 50) {
              await supabaseAdmin.from('replenishment_orders').insert(rows.slice(ri, ri + 50))
            }
            totalSaved += rows.length
          }
        }
      } catch (err) {
        console.error(`Claude batch ${bi} error:`, err)
      }
    }

    // 결품 카운트
    for (const shop of allShops) {
      for (const sku of shop.skus) {
        if (sku.currentInv <= 0) stockoutCount++
      }
    }

    // ═══ STEP 4: AI 전체 요약 ═══

    let summary = `${brand} 브랜드 ${allShops.length}개 매장, ${totalSaved}개 SKU 보충출고 제안 완료. 결품 ${stockoutCount}건.`
    try {
      const sumRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
          system: '패션기업 보충출고 분석가. 한국어 4-5문장으로 요약.',
          messages: [{ role: 'user', content: `${brand} 보충출고 결과: ${allShops.length}매장, ${totalSaved} SKU 제안, 결품 ${stockoutCount}건. 주요 매장: ${allShops.slice(0, 5).map(s => `${s.shopNm}(${s.grade}등급,${s.skus.length}SKU)`).join(', ')}. 분석 요약해주세요.` }],
        }),
      })
      const sumJson = await sumRes.json()
      summary = sumJson.content?.[0]?.text || summary
    } catch {}

    return NextResponse.json({
      success: true, savedCount: totalSaved, summary,
      shopCount: allShops.length,
      skuTotal: allShops.reduce((s, sh) => s + sh.skus.length, 0),
      stockoutCount,
    })
  } catch (err) {
    console.error('Replenishment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
