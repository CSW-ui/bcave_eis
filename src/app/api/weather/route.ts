import { NextResponse } from 'next/server'

const WEATHER_API_KEY = process.env.WEATHER_API_KEY!
const MID_WEATHER_API_KEY = WEATHER_API_KEY

// 품목 × 기온 매핑
const TEMP_ITEM_MAP: { min: number; max: number; items: string[]; label: string }[] = [
  { min: 28, max: 99, label: '한여름', items: ['반팔티셔츠', '반바지', '민소매', '샌들', '원피스', '린넨셔츠'] },
  { min: 23, max: 27, label: '초여름', items: ['반팔티셔츠', '반바지', '반팔셔츠', '숏팬츠', '원피스', '캡모자'] },
  { min: 17, max: 22, label: '환절기(봄/가을)', items: ['긴팔티셔츠', '후드티', '가디건', '바람막이', '긴바지', '맨투맨'] },
  { min: 10, max: 16, label: '쌀쌀', items: ['자켓', '니트', '후드집업', '코트', '긴바지', '맨투맨'] },
  { min: -99, max: 9, label: '한겨울', items: ['패딩', '코트', '후리스', '머플러', '장갑', '기모바지'] },
]

const fD = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`

// GET /api/weather — 기상청 단기(3일) + 중기(10일) 기온 + 추천 품목
export async function GET() {
  try {
    const now = new Date()
    const kstHour = now.getHours()
    const useYesterday = kstHour < 6
    const baseD = useYesterday ? new Date(now.getTime() - 86400000) : now
    const baseDate = fD(baseD)
    const baseTime = useYesterday ? '2300' : '0500'

    // 중기예보 발표시각: 06시, 18시 → 가장 최근 발표 기준
    const midBaseDate = kstHour < 6
      ? fD(new Date(now.getTime() - 86400000))  // 전날
      : fD(now)
    const midBaseTime = kstHour >= 18 ? '1800' : '0600'
    const midTmFc = `${midBaseDate}${midBaseTime}`

    // 단기예보 + 중기기온 동시 호출 (중기 실패 시 단기만 사용)
    const shortRes = await fetch(`https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(WEATHER_API_KEY)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=60&ny=127`)
    const shortJson = await shortRes.json()

    // 중기기온 + 중기육상예보 동시 호출
    let midJson: any = null
    let midLandJson: any = null
    const [midTaRes, midLandRes] = await Promise.allSettled([
      fetch(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?serviceKey=${MID_WEATHER_API_KEY}&pageNo=1&numOfRows=10&dataType=JSON&regId=11B10101&tmFc=${midTmFc}`),
      fetch(`https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst?serviceKey=${MID_WEATHER_API_KEY}&pageNo=1&numOfRows=10&dataType=JSON&regId=11B00000&tmFc=${midTmFc}`),
    ])
    if (midTaRes.status === 'fulfilled' && midTaRes.value.ok) {
      try { midJson = await midTaRes.value.json() } catch { console.error('[기상청] 중기기온 JSON 파싱 실패') }
    }
    if (midLandRes.status === 'fulfilled' && midLandRes.value.ok) {
      try { midLandJson = await midLandRes.value.json() } catch { console.error('[기상청] 중기육상 JSON 파싱 실패') }
    }

    // ── 단기예보 파싱 ──
    const DAYS = ['일', '월', '화', '수', '목', '금', '토']
    // SKY: 1=맑음, 3=구름많음, 4=흐림 / PTY: 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기
    const SKY_MAP: Record<string, string> = { '1': '맑음', '3': '구름', '4': '흐림' }
    const PTY_MAP: Record<string, string> = { '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' }

    const shortItems = shortJson.response?.body?.items?.item ?? []
    const dateMap = new Map<string, { tmx: number | null; tmn: number | null; temps: number[]; skys: string[]; ptys: string[] }>()
    for (const item of shortItems) {
      const d = item.fcstDate as string
      if (!dateMap.has(d)) dateMap.set(d, { tmx: null, tmn: null, temps: [], skys: [], ptys: [] })
      const entry = dateMap.get(d)!
      if (item.category === 'TMX') entry.tmx = Number(item.fcstValue)
      if (item.category === 'TMN') entry.tmn = Number(item.fcstValue)
      if (item.category === 'TMP') entry.temps.push(Number(item.fcstValue))
      if (item.category === 'SKY') entry.skys.push(String(item.fcstValue))
      if (item.category === 'PTY') entry.ptys.push(String(item.fcstValue))
    }

    const dailyTemps: { date: string; dateLabel: string; day: string; tmx: number | null; tmn: number | null; avg: number | null; weather: string; source: 'short' | 'mid' }[] = []

    for (const [date, v] of Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const avg = v.temps.length > 0 ? Math.round(v.temps.reduce((s, t) => s + t, 0) / v.temps.length * 10) / 10 : null
      const d = new Date(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6)))
      const dayLabel = DAYS[d.getDay()]
      // 강수 있으면 강수 우선, 없으면 하늘상태 최빈값
      const hasRain = v.ptys.find(p => p !== '0')
      let weather = ''
      if (hasRain) {
        weather = PTY_MAP[hasRain] ?? '비'
      } else if (v.skys.length > 0) {
        const freq: Record<string, number> = {}
        v.skys.forEach(s => { freq[s] = (freq[s] || 0) + 1 })
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]
        weather = SKY_MAP[top] ?? '맑음'
      }
      dailyTemps.push({
        date,
        dateLabel: `${date.slice(4, 6)}/${date.slice(6)}`,
        day: dayLabel,
        tmx: v.tmx ?? (v.temps.length > 0 ? Math.max(...v.temps) : null),
        tmn: v.tmn ?? (v.temps.length > 0 ? Math.min(...v.temps) : null),
        avg,
        weather,
        source: 'short',
      })
    }

    // ── 중기기온 + 중기육상예보 파싱 (3일~10일후) ──
    const midData = midJson?.response?.body?.items?.item?.[0]
    const midLandData = midLandJson?.response?.body?.items?.item?.[0]

    // 중기육상예보 날씨 텍스트 → 간략화
    const MID_WEATHER_MAP: Record<string, string> = {
      '맑음': '맑음', '구름많음': '구름', '구름많고 비': '비', '구름많고 눈': '눈',
      '구름많고 비/눈': '비/눈', '구름많고 소나기': '소나기',
      '흐림': '흐림', '흐리고 비': '비', '흐리고 눈': '눈',
      '흐리고 비/눈': '비/눈', '흐리고 소나기': '소나기',
    }

    if (midData) {
      for (let d = 3; d <= 10; d++) {
        const tmn = Number(midData[`taMin${d}`]) || null
        const tmx = Number(midData[`taMax${d}`]) || null
        const futureDate = new Date(now)
        futureDate.setDate(now.getDate() + d)
        const dateStr = fD(futureDate)

        // 단기예보와 중복되면 스킵
        if (dailyTemps.some(t => t.date === dateStr)) continue

        // 중기육상예보에서 날씨/강수확률 추출
        // 3~7일: wf3Am/wf3Pm, rnSt3Am/rnSt3Pm / 8~10일: wf8, rnSt8
        let weather = ''
        let rainPct: number | null = null
        if (midLandData) {
          if (d <= 7) {
            const amW = midLandData[`wf${d}Am`] || ''
            const pmW = midLandData[`wf${d}Pm`] || ''
            const amR = Number(midLandData[`rnSt${d}Am`]) || 0
            const pmR = Number(midLandData[`rnSt${d}Pm`]) || 0
            // 오후 날씨 우선 (외출 시간대)
            const rawW = pmW || amW
            weather = MID_WEATHER_MAP[rawW] ?? rawW
            rainPct = Math.max(amR, pmR)
          } else {
            const rawW = midLandData[`wf${d}`] || ''
            weather = MID_WEATHER_MAP[rawW] ?? rawW
            rainPct = Number(midLandData[`rnSt${d}`]) || 0
          }
        }

        const avg = tmn != null && tmx != null ? Math.round((tmn + tmx) / 2 * 10) / 10 : null
        const md = new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(4, 6)) - 1, Number(dateStr.slice(6)))
        dailyTemps.push({
          date: dateStr,
          dateLabel: `${dateStr.slice(4, 6)}/${dateStr.slice(6)}`,
          day: DAYS[md.getDay()],
          tmx,
          tmn,
          avg,
          weather,
          rainPct,
          source: 'mid',
        })
      }
    }

    // 날짜순 정렬, 최대 10일
    dailyTemps.sort((a, b) => a.date.localeCompare(b.date))
    const temps10 = dailyTemps.slice(0, 10)

    // 향후 3일 평균 기온 기반 추천
    const next3days = temps10.slice(0, 3)
    const avgTemp = next3days.length > 0
      ? Math.round(next3days.reduce((s, d) => s + (d.avg ?? 0), 0) / next3days.length * 10) / 10
      : null

    // 후반 기온 (7~10일 후) 추천도 추가
    const laterDays = temps10.slice(5)
    const laterAvg = laterDays.length > 0
      ? Math.round(laterDays.reduce((s, d) => s + (d.avg ?? 0), 0) / laterDays.length * 10) / 10
      : null

    const recommendations: { label: string; items: string[]; period: string }[] = []
    if (avgTemp !== null) {
      const match = TEMP_ITEM_MAP.find(m => avgTemp >= m.min && avgTemp <= m.max)
      if (match) recommendations.push({ label: match.label, items: match.items, period: '이번 주' })
    }
    if (laterAvg !== null && laterAvg !== avgTemp) {
      const match = TEMP_ITEM_MAP.find(m => laterAvg >= m.min && laterAvg <= m.max)
      if (match && match.label !== recommendations[0]?.label) {
        recommendations.push({ label: match.label, items: match.items, period: '다음 주' })
      }
    }

    // 기온 변화 감지 + 상세 조언
    let tempTrend: string | null = null
    const alerts: string[] = []

    if (temps10.length >= 3) {
      const first = temps10[0].avg ?? 0
      const last = temps10[temps10.length - 1].avg ?? 0
      const diff = last - first

      if (diff >= 8) {
        tempTrend = `10일간 급격한 기온 상승 (+${diff.toFixed(1)}°C)`
        alerts.push('반팔/반바지 물량 긴급 확대 필요')
        alerts.push('아우터/니트 마크다운 검토')
      } else if (diff >= 5) {
        tempTrend = `기온 상승 추세 (+${diff.toFixed(1)}°C)`
        alerts.push('여름 상품 VMD 전환 준비')
      } else if (diff <= -8) {
        tempTrend = `10일간 급격한 기온 하강 (${diff.toFixed(1)}°C)`
        alerts.push('아우터/후리스 긴급 배치')
        alerts.push('여름 상품 조기 마크다운 검토')
      } else if (diff <= -5) {
        tempTrend = `기온 하강 추세 (${diff.toFixed(1)}°C)`
        alerts.push('F/W 상품 보충출고 확대')
      }

      // 일교차 큰 날 감지
      for (const t of temps10) {
        if (t.tmx != null && t.tmn != null && t.tmx - t.tmn >= 15) {
          alerts.push(`${t.dateLabel} 일교차 ${(t.tmx - t.tmn).toFixed(0)}°C — 레이어링 아이템(가디건/후드집업) 추천`)
          break
        }
      }

      // 주말 기온 별도 체크
      const weekend = temps10.filter(t => {
        const d = new Date(Number(t.date.slice(0, 4)), Number(t.date.slice(4, 6)) - 1, Number(t.date.slice(6)))
        return d.getDay() === 0 || d.getDay() === 6
      })
      if (weekend.length > 0) {
        const wkAvg = Math.round(weekend.reduce((s, t) => s + (t.avg ?? 0), 0) / weekend.length)
        if (avgTemp != null && Math.abs(wkAvg - avgTemp) >= 3) {
          alerts.push(`주말 평균 ${wkAvg}°C — 매장 VMD 주말 전 조정 권장`)
        }
      }

      // 강수 예보 감지 (중기육상예보 강수확률 60% 이상)
      const rainyDays = temps10.filter(t => (t as any).rainPct >= 60)
      if (rainyDays.length >= 3) {
        alerts.push(`향후 10일 중 ${rainyDays.length}일 강수확률 60%↑ — 우천 대비 상품(방수자켓/레인부츠) 및 매장 VM 조정 권장`)
      } else if (rainyDays.length > 0) {
        const rdLabels = rainyDays.map(t => `${t.dateLabel}(${(t as any).rainPct}%)`).join(', ')
        alerts.push(`강수 예보: ${rdLabels} — 해당일 야외 행사/촬영 일정 확인`)
      }

      // 이번주 vs 다음주 기온대 전환 감지
      if (avgTemp != null && laterAvg != null) {
        const curZone = TEMP_ITEM_MAP.find(m => avgTemp >= m.min && avgTemp <= m.max)
        const nextZone = TEMP_ITEM_MAP.find(m => laterAvg >= m.min && laterAvg <= m.max)
        if (curZone && nextZone && curZone.label !== nextZone.label) {
          alerts.push(`기온대 전환: ${curZone.label}(${avgTemp}°C) → ${nextZone.label}(${laterAvg}°C) — 상품 구성 전환 필요`)
        }
      }
    }

    return NextResponse.json({
      temps: temps10,
      avgTemp,
      laterAvg,
      recommendations,
      tempTrend,
      alerts,
      baseDate,
      baseTime,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), temps: [], recommendations: [] }, { status: 500 })
  }
}
