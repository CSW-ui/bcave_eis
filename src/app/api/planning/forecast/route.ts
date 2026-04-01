import { NextResponse } from 'next/server'
import { snowflakeQuery, SALES_VIEW } from '@/lib/snowflake'
import { VALID_BRANDS } from '@/lib/constants'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 120

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const WEATHER_API_KEY = process.env.WEATHER_API_KEY!

// GET /api/planning/forecast?brand=all&year=26&season=봄,여름&item=반팔티셔츠
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'all'

  // 브랜드 유효성 검증 (SQL 인젝션 방지)
  if (brand !== 'all' && !VALID_BRANDS.has(brand)) {
    return NextResponse.json({ error: 'Invalid brand' }, { status: 400 })
  }
  const year = searchParams.get('year') || '26'
  const seasons = searchParams.get('season')?.split(',') || ['봄']
  const item = searchParams.get('item') || ''
  const forceRefresh = searchParams.get('refresh') === '1'

  if (!item) return NextResponse.json({ error: 'item required' }, { status: 400 })

  // 캐시 확인 (당일 배치 결과가 있으면 반환)
  if (!forceRefresh) {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const cacheKey = `${brand}|${item}`
      const { data: cached } = await supabaseAdmin
        .from('ai_batch_cache')
        .select('result')
        .eq('cache_type', 'forecast')
        .eq('cache_key', cacheKey)
        .eq('batch_date', today)
        .single()
      if (cached?.result) {
        return NextResponse.json({ ...cached.result, cached: true })
      }
    } catch {} // 캐시 miss → 실시간 호출
  }

  const brandWhere = brand === 'all'
    ? `v.BRANDCD IN ('CO','WA','LE','CK','LK')`
    : `v.BRANDCD = '${brand}'`
  const seasonList = seasons.map(s => `'${s}'`).join(',')
  const itemSafe = item.replace(/'/g, "''")
  const lyYear = String(Number(year) - 1)

  try {
    // 1. 품목×채널별 주간 매출 (금년 + 전년)
    const [cyWeekly, lyWeekly, invData] = await Promise.all([
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPTYPENM,
          WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD')) as WK,
          SUM(v.SALEAMT_VAT_EX) as REV, SUM(v.SALEQTY) as QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
          AND v.SALEDT BETWEEN '20${year}0101' AND '20${year}1231'
        GROUP BY v.SHOPTYPENM, WK ORDER BY WK
      `),
      snowflakeQuery<Record<string, string>>(`
        SELECT v.SHOPTYPENM,
          WEEKOFYEAR(TO_DATE(v.SALEDT,'YYYYMMDD')) as WK,
          SUM(v.SALEAMT_VAT_EX) as REV, SUM(v.SALEQTY) as QTY
        FROM ${SALES_VIEW} v
        JOIN BCAVE.SEWON.SW_STYLEINFO si ON v.STYLECD = si.STYLECD AND v.BRANDCD = si.BRANDCD
        WHERE ${brandWhere}
          AND si.YEARCD = '${lyYear}' AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
          AND v.SALEDT BETWEEN '20${lyYear}0101' AND '20${lyYear}1231'
        GROUP BY v.SHOPTYPENM, WK ORDER BY WK
      `),
      // 재고
      snowflakeQuery<Record<string, string>>(`
        SELECT SUM(inv.INVQTY) as SHOP_INV, SUM(wh.AVAILQTY) as WH_AVAIL
        FROM BCAVE.SEWON.SW_STYLEINFO si
        LEFT JOIN (SELECT STYLECD, SUM(INVQTY) as INVQTY FROM BCAVE.SEWON.SW_SHOPINV GROUP BY STYLECD) inv ON si.STYLECD = inv.STYLECD
        LEFT JOIN (SELECT STYLECD, SUM(AVAILQTY) as AVAILQTY FROM BCAVE.SEWON.SW_WHINV GROUP BY STYLECD) wh ON si.STYLECD = wh.STYLECD
        WHERE ${brandWhere.replace(/v\./g, 'si.')}
          AND si.YEARCD = '${year}' AND si.SEASONNM IN (${seasonList})
          AND si.ITEMNM = '${itemSafe}'
      `),
    ])

    // 채널별 주간 데이터 구성
    const _channels = Array.from(new Set(cyWeekly.map(r => r.SHOPTYPENM)))
    const cyByChannel: Record<string, Record<number, number>> = {}
    const lyByChannel: Record<string, Record<number, number>> = {}
    for (const r of cyWeekly) {
      if (!cyByChannel[r.SHOPTYPENM]) cyByChannel[r.SHOPTYPENM] = {}
      cyByChannel[r.SHOPTYPENM][Number(r.WK)] = Number(r.REV) || 0
    }
    for (const r of lyWeekly) {
      if (!lyByChannel[r.SHOPTYPENM]) lyByChannel[r.SHOPTYPENM] = {}
      lyByChannel[r.SHOPTYPENM][Number(r.WK)] = Number(r.REV) || 0
    }

    // 전체 주간 합계
    const cyTotal: Record<number, number> = {}
    const lyTotal: Record<number, number> = {}
    for (let w = 1; w <= 52; w++) {
      cyTotal[w] = Object.values(cyByChannel).reduce((s, ch) => s + (ch[w] || 0), 0)
      lyTotal[w] = Object.values(lyByChannel).reduce((s, ch) => s + (ch[w] || 0), 0)
    }

    const shopInv = Number(invData[0]?.SHOP_INV) || 0
    const whAvail = Number(invData[0]?.WH_AVAIL) || 0

    // 2. 기상청 기온 예보 (05시 이전이면 전일 2300 발표 사용)
    let weatherInfo = ''
    try {
      const now = new Date()
      const kstHour = now.getHours()
      const useYesterday = kstHour < 6
      const baseD = useYesterday ? new Date(now.getTime() - 86400000) : now
      const baseDate = `${baseD.getFullYear()}${String(baseD.getMonth()+1).padStart(2,'0')}${String(baseD.getDate()).padStart(2,'0')}`
      const baseTime = useYesterday ? '2300' : '0500'
      const wRes = await fetch(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(WEATHER_API_KEY)}&pageNo=1&numOfRows=300&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=60&ny=127`)
      const wJson = await wRes.json()
      if (wJson.response?.header?.resultCode !== '00') {
        console.error('[기상청] forecast 응답 에러:', wJson.response?.header?.resultMsg)
      }
      const items = wJson.response?.body?.items?.item ?? []
      const temps = items.filter((i: any) => i.category === 'TMP').map((i: any) => ({ date: i.fcstDate, time: i.fcstTime, temp: Number(i.fcstValue) }))
      const tmx = items.filter((i: any) => i.category === 'TMX').map((i: any) => Number(i.fcstValue))
      const tmn = items.filter((i: any) => i.category === 'TMN').map((i: any) => Number(i.fcstValue))
      weatherInfo = tmx.length || tmn.length
        ? `서울 기온 예보: 최고 ${tmx[0] ?? '?'}°C, 최저 ${tmn[0] ?? '?'}°C. 시간별: ${temps.slice(0, 8).map((t: any) => `${t.time.slice(0,2)}시 ${t.temp}°C`).join(', ')}`
        : '기온 데이터 없음'
    } catch (err) {
      console.error('[기상청] forecast API 호출 실패:', err)
      weatherInfo = '기온 데이터 조회 실패'
    }

    // 3. Claude에 전달
    const maxCyWeek = Math.max(...Object.entries(cyTotal).filter(([, v]) => v > 0).map(([k]) => Number(k)), 0)
    const toOk = (v: number) => (v / 1e8).toFixed(1)

    const dataForAI = {
      품목: item, 브랜드: brand === 'all' ? '전체' : brand,
      현재주차: maxCyWeek,
      금년_주간매출_억: Array.from({ length: maxCyWeek }, (_, i) => ({ w: i + 1, rev: toOk(cyTotal[i + 1] || 0) })),
      전년_주간매출_억: Array.from({ length: 52 }, (_, i) => ({ w: i + 1, rev: toOk(lyTotal[i + 1] || 0) })),
      채널별_금년: Object.entries(cyByChannel).map(([ch, wks]) => ({
        채널: ch,
        주간매출: Array.from({ length: maxCyWeek }, (_, i) => ({ w: i + 1, rev: toOk(wks[i + 1] || 0) })),
      })),
      채널별_전년: Object.entries(lyByChannel).map(([ch, wks]) => ({
        채널: ch,
        주간매출: Array.from({ length: 52 }, (_, i) => ({ w: i + 1, rev: toOk(wks[i + 1] || 0) })),
      })),
      재고: { 매장: shopInv, 창고: whAvail, 총: shopInv + whAvail },
      기온: weatherInfo,
    }

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
        system: `당신은 패션기업 B.cave의 수요 예측 전문가입니다.

[분석 규칙]
1. 전년 채널별 주간 판매 패턴을 베이스라인으로 사용
2. 금년 대비 전년 성장/하락 추세를 채널별로 반영하여 보정
3. 기온 변화 반영: 기온 상승→반팔/린넨 수요↑ 아우터/니트↓, 기온 하락→반대
4. 채널별 특성: 백화점=정가 시즌초반, 아울렛=이월 시즌후반, 온라인=프로모션 영향
5. 재고 소진율 고려: 소진율 낮으면 마크다운 가능성

반드시 아래 JSON 형식으로만 응답:
\`\`\`json
{
  "forecast": [
    {"week": 주차번호, "total": 예상매출_억, "channels": {"백화점": 억, "아울렛": 억, ...}},
    ...향후 8주
  ],
  "status": "정상|위험|기회",
  "statusSummary": "한줄 상태 요약 (예: '판매율 호조, 재고 소진 순항 중')",
  "topFactors": [
    {"factor": "호/부진 원인", "impact": "positive|negative", "detail": "설명"},
    {"factor": "호/부진 원인", "impact": "positive|negative", "detail": "설명"},
    {"factor": "호/부진 원인", "impact": "positive|negative", "detail": "설명"}
  ],
  "pmd": {
    "product": ["리오더/단종/SKU조정/컬러추가 등 Product 관점 제안"],
    "marketing": ["콘텐츠/타겟/셀럽/프로모션 등 Marketing 관점 제안"],
    "distribution": ["채널/할인/재배치/출고조정 등 Distribution 관점 제안"]
  },
  "seasonEndForecast": {
    "expectedSalesRate": "시즌 종료 시 예상 판매율(%)",
    "remainingInventory": "잔여 재고금액 추정(억)",
    "profitOutlook": "예상 손익 코멘트"
  },
  "risks": ["위험요소1", "위험요소2"],
  "summary": "전체 분석 요약 (한국어 3-4문장)"
}
\`\`\``,
        messages: [{ role: 'user', content: JSON.stringify(dataForAI) }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Claude forecast error:', res.status, errText.slice(0, 500))
      throw new Error(`Claude: ${res.status} ${errText.slice(0, 200)}`)
    }
    const aiJson = await res.json()
    const aiText = aiJson.content?.[0]?.text || ''

    // JSON 파싱
    const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/)
    let forecast = null
    if (jsonMatch) {
      try { forecast = JSON.parse(jsonMatch[1]) } catch {}
    }

    return NextResponse.json({
      forecast: forecast?.forecast ?? [],
      status: forecast?.status ?? '정상',
      statusSummary: forecast?.statusSummary ?? '',
      topFactors: forecast?.topFactors ?? [],
      pmd: forecast?.pmd ?? { product: [], marketing: [], distribution: [] },
      seasonEndForecast: forecast?.seasonEndForecast ?? null,
      summary: forecast?.summary ?? aiText,
      risks: forecast?.risks ?? [],
      suggestions: forecast?.suggestions ?? [],
      weather: weatherInfo,
      maxCyWeek,
    })
  } catch (err) {
    console.error('Forecast error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
