import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!
const WEATHER_API_KEY = process.env.WEATHER_API_KEY!

export async function POST(req: Request) {
  const { staleStyles, channels, years, brand, question, history } = await req.json()

  // 채팅이 아닌 초기 제안 요청이면 캐시 확인
  if (!question && !history?.length) {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { data: cached } = await supabaseAdmin
        .from('ai_batch_cache')
        .select('result')
        .eq('cache_type', 'carryover')
        .eq('cache_key', brand || 'all')
        .eq('batch_date', today)
        .single()
      if (cached?.result) {
        return NextResponse.json({ ...cached.result, cached: true })
      }
    } catch {} // 캐시 miss → 실시간 호출
  }

  // 기온 조회 (기상청 단기예보 — 0500 발표 기준, 05시 이전이면 전일 2300 사용)
  let weatherInfo = ''
  try {
    const now = new Date()
    const kstHour = now.getHours()  // 서버가 KST 기준
    // 05시 이전이면 전날 23시 발표 데이터 사용
    const useYesterday = kstHour < 6
    const baseD = useYesterday ? new Date(now.getTime() - 86400000) : now
    const baseDate = `${baseD.getFullYear()}${String(baseD.getMonth()+1).padStart(2,'0')}${String(baseD.getDate()).padStart(2,'0')}`
    const baseTime = useYesterday ? '2300' : '0500'
    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(WEATHER_API_KEY)}&pageNo=1&numOfRows=50&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=60&ny=127`
    const wRes = await fetch(url)
    const wJson = await wRes.json()
    const resultCode = wJson.response?.header?.resultCode
    if (resultCode !== '00') {
      console.error('[기상청] 응답 에러:', wJson.response?.header?.resultMsg ?? resultCode)
    }
    const items = wJson.response?.body?.items?.item ?? []
    const tmx = items.find((i: any) => i.category === 'TMX')?.fcstValue
    const tmn = items.find((i: any) => i.category === 'TMN')?.fcstValue
    weatherInfo = tmx || tmn
      ? `서울 오늘 최고 ${tmx ?? '?'}°C, 최저 ${tmn ?? '?'}°C`
      : '기온 데이터 없음'
  } catch (err) {
    console.error('[기상청] API 호출 실패:', err)
    weatherInfo = '기온 데이터 조회 실패'
  }

  const systemPrompt = `당신은 패션기업 B.cave의 이월재고 관리 전문가입니다. 구체적인 할인율과 채널 전략을 제안하세요.

[중요] 사용자가 제공하는 데이터에는 기상청 API에서 실시간으로 조회한 오늘의 기온 정보가 포함되어 있습니다. 이 기온 데이터는 시스템이 자동으로 가져온 실제 데이터이므로, 그대로 활용하여 시즌 적합성과 처분 전략을 판단하세요. "날씨 정보에 접근할 수 없다"고 말하지 마세요.

[규칙]
- 오래된 시즌(YEARCD 낮을수록)부터 우선 처분
- 아울렛: 30~50% 할인으로 대량 소진 가능
- 온라인: 20~40% 할인 + 프로모션으로 젊은층 타겟
- 백화점: 정가 유지 or 소폭 할인(10~20%), 브랜드 이미지 보호
- 기온 고려: 제공된 기온 데이터를 참고하여 시즌 지난 아이템은 빠르게 처분 권고
- 한국어로 구체적으로 답변`

  const dataContext = `[이월재고 데이터]\n브랜드: ${brand}\n기온: ${weatherInfo}\n적체상품: ${(staleStyles ?? []).slice(0,10).join(', ')}\n채널: ${(channels ?? []).join(', ')}\n연도: ${(years ?? []).join(', ')}`

  const messages: any[] = [{ role: 'system', content: systemPrompt }]

  if (question && history?.length) {
    messages.push({ role: 'user', content: dataContext + '\n\n위 데이터를 기반으로 질문에 답해주세요.' })
    messages.push({ role: 'assistant', content: '네, 이월재고 데이터를 확인했습니다. 무엇이든 물어보세요.' })
    for (const m of (history ?? [])) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })
    }
  } else {
    messages.push({ role: 'user', content: `${dataContext}\n\n구체적으로 어떤 상품을 어느 채널에서 몇% 할인으로 판매해야 하는지 제안해주세요.` })
  }

  // system 프롬프트와 대화 메시지 분리 (Claude API 형식)
  const system = messages.find((m: any) => m.role === 'system')?.content ?? ''
  const userMessages = messages.filter((m: any) => m.role !== 'system')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        system,
        messages: userMessages,
        temperature: 0.4,
        max_tokens: 1000,
      }),
    })
    if (!res.ok) {
      console.error('Claude carryover error:', res.status, await res.text().then(t => t.slice(0, 300)))
      return NextResponse.json({ advice: 'AI 분석 오류가 발생했습니다.' })
    }
    const json = await res.json()
    return NextResponse.json({ advice: json.content?.[0]?.text ?? '' })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
