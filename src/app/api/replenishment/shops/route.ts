import { NextResponse } from 'next/server'
import { snowflakeQuery } from '@/lib/snowflake'
import { supabaseAdmin } from '@/lib/supabase'
import { VALID_BRANDS } from '@/lib/constants'
import { REPLENISHMENT_NORMAL_SALE, REPLENISHMENT_RETAIL_SHOP, SHOP_CODE_ALIASES } from '@/lib/sales-scope'

// GET /api/replenishment/shops?brand=CO
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'CO'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (!VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }

  try {
    // Snowflake에서 오프라인 매장 목록 (면세/해외/온라인/B2B 제외)
    const shops = await snowflakeQuery<Record<string, string>>(`
      SELECT COALESCE(alias.SHOPCD, s.SHOPCD) AS SHOPCD, MAX(si.SHOPNM) as SHOPNM,
        MAX(si.OLD_SHOPCD) AS OLD_SHOPCD,
        MAX(si.SHOPTYPENM) as SHOPTYPENM, MAX(si.AREANM) as AREANM
      FROM BCAVE.SEWON.SW_SALEINFO s
      LEFT JOIN ${SHOP_CODE_ALIASES} alias ON s.SHOPCD = alias.OLD_SHOPCD
      LEFT JOIN BCAVE.SEWON.SW_SHOPINFO si ON COALESCE(alias.SHOPCD, s.SHOPCD) = si.SHOPCD
      WHERE s.BRANDCD = '${brand}'
        AND s.SALEDT >= TO_CHAR(DATEADD(DAY, -30, CURRENT_DATE()), 'YYYYMMDD')
        AND s.SALEQTY > 0
        AND ${REPLENISHMENT_NORMAL_SALE}
        AND ${REPLENISHMENT_RETAIL_SHOP}
      GROUP BY 1
      ORDER BY SHOPTYPENM, SHOPNM
    `)

    // Supabase에서 기존 등급 조회
    const { data: grades } = await supabaseAdmin
      .from('shop_grades')
      .select('shop_cd, grade')
      .eq('brand_cd', brand)

    const gradeMap = new Map((grades ?? []).map((g: { shop_cd: string; grade: string }) => [g.shop_cd, g.grade]))

    // 매장별 최근 3개월 정상 매출 집계 (자동 등급 산정용, 행사 제외)
    const salesRank = await snowflakeQuery<Record<string, string>>(`
      SELECT COALESCE(alias.SHOPCD, s.SHOPCD) AS SHOPCD, SUM(s.SALEAMT) as SALE_AMT
      FROM BCAVE.SEWON.SW_SALEINFO s
      LEFT JOIN ${SHOP_CODE_ALIASES} alias ON s.SHOPCD = alias.OLD_SHOPCD
      WHERE s.BRANDCD = '${brand}'
        AND s.SALEDT >= TO_CHAR(DATEADD(DAY, -90, CURRENT_DATE()), 'YYYYMMDD')
        AND s.SALEQTY > 0 AND ${REPLENISHMENT_NORMAL_SALE}
      GROUP BY 1
    `)
    const salesMap = new Map(salesRank.map(r => [r.SHOPCD, Number(r.SALE_AMT) || 0]))

    // 매출 순 정렬 후 자동 등급 (수동 설정 없는 매장만)
    const shopCodes = shops.map(s => s.SHOPCD)
    const salesSorted = shopCodes
      .map(cd => ({ cd, amt: salesMap.get(cd) ?? 0 }))
      .sort((a, b) => b.amt - a.amt)
    const total = salesSorted.length
    const autoGradeMap = new Map<string, string>()
    salesSorted.forEach((s, i) => {
      const pct = total > 0 ? i / total : 0
      autoGradeMap.set(s.cd, pct < 0.2 ? 'A' : pct < 0.5 ? 'B' : pct < 0.8 ? 'C' : 'D')
    })

    const result = shops.map(s => ({
      shopCd: s.SHOPCD,
      shopNm: s.SHOPNM ?? s.SHOPCD,
      shopType: s.SHOPTYPENM ?? '',
      area: s.AREANM ?? '',
      grade: gradeMap.get(s.SHOPCD) ?? gradeMap.get(s.OLD_SHOPCD) ?? autoGradeMap.get(s.SHOPCD) ?? 'B',
      saleAmt: salesMap.get(s.SHOPCD) ?? 0,
      autoGrade: autoGradeMap.get(s.SHOPCD) ?? 'B',
    }))

    return NextResponse.json({ shops: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/replenishment/shops — 등급 일괄 저장
export async function POST(req: Request) {
  const { brand, grades } = await req.json() as {
    brand: string
    grades: { shopCd: string; grade: string }[]
  }

  try {
    const rows = grades.map(g => ({
      shop_cd: g.shopCd,
      brand_cd: brand,
      grade: g.grade,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabaseAdmin
      .from('shop_grades')
      .upsert(rows, { onConflict: 'shop_cd,brand_cd' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ saved: rows.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
