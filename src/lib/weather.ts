const DAY = 86_400_000
const KST = 9 * 60 * 60 * 1000
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const formatDate = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
export function addWeatherDays(date: string, days: number) {
  return formatDate(new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6))) + days * DAY))
}
export function getWeatherSchedule(now = new Date()) {
  const kst = new Date(now.getTime() + KST)
  const today = formatDate(kst)
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes()
  // Conservative publication delay: short 05:00 is available by 06:00;
  // allow ten minutes for the 06:00/18:00 medium-range releases.
  const short = minutes < 360 ? { date: addWeatherDays(today, -1), time: '2300' } : { date: today, time: '0500' }
  const shortFallback = short.time === '0500' ? { date: addWeatherDays(today, -1), time: '2300' } : { date: short.date, time: '2000' }
  const mid = minutes >= 1090 ? { date: today, time: '1800' }
    : minutes >= 370 ? { date: today, time: '0600' } : { date: addWeatherDays(today, -1), time: '1800' }
  const midFallback = mid.time === '1800' ? { date: mid.date, time: '0600' } : { date: addWeatherDays(mid.date, -1), time: '1800' }
  return { today, short, shortFallback, mid, midFallback }
}
export function temperature(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= -90 && number <= 60 ? number : null
}
export function meanTemperature(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v))
  return valid.length ? Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length * 10) / 10 : null
}
export type ShortWeatherItem = { fcstDate: string; fcstTime: string; category: string; fcstValue: string | number }
type KmaItem = Record<string, unknown>

async function fetchKma(endpoint: string, params: Record<string, string>, key: string) {
  const url = new URL(`https://apis.data.go.kr/1360000/${endpoint}`)
  let normalizedKey = key
  try { if (/%[0-9a-f]{2}/i.test(key)) normalizedKey = decodeURIComponent(key) } catch { throw new Error('Weather API key format invalid') }
  url.search = new URLSearchParams({ serviceKey: normalizedKey, pageNo: '1', numOfRows: '1000', dataType: 'JSON', ...params }).toString()
  // Never log this URL or an upstream error: it contains the API key.
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) })
    if (!response.ok) throw new Error('Weather HTTP failure')
    const json = await response.json()
    if (json.response?.header?.resultCode !== '00') throw new Error('Weather provider failure')
    const body = json.response?.body
    const items = body?.items?.item
    if (!Array.isArray(items) || !items.length) throw new Error('Weather forecast missing')
    return { items: items as KmaItem[], total: Number(body.totalCount) || items.length }
  } catch { throw new Error('Weather forecast unavailable') }
}
async function fetchShortRelease(issue: { date: string; time: string }, key: string) {
  const params = { base_date: issue.date, base_time: issue.time, nx: '60', ny: '127' }
  const first = await fetchKma('VilageFcstInfoService_2.0/getVilageFcst', params, key)
  const items = [...first.items]
  // Retrieve every page: truncation can otherwise silently drop later days.
  for (let page = 2; items.length < first.total; page++) {
    if (page > 10) throw new Error('Weather result too large')
    const next = await fetchKma('VilageFcstInfoService_2.0/getVilageFcst', { ...params, pageNo: String(page) }, key)
    items.push(...next.items)
  }
  return items as unknown as ShortWeatherItem[]
}
export async function fetchShortWeather(key: string, now = new Date()) {
  const schedule = getWeatherSchedule(now)
  let primary: ShortWeatherItem[] = []
  try { primary = await fetchShortRelease(schedule.short, key) } catch { /* try previous issue */ }
  const hasDay = (items: ShortWeatherItem[], day: string) => items.some(i => i.fcstDate === day && i.category === 'TMP' && temperature(i.fcstValue) !== null)
  if ([0, 1, 2].every(offset => hasDay(primary, addWeatherDays(schedule.today, offset)))) return { items: primary, issue: schedule.short }
  let fallback: ShortWeatherItem[] = []
  try { fallback = await fetchShortRelease(schedule.shortFallback, key) } catch { /* retain any valid primary data */ }
  const merged = new Map<string, ShortWeatherItem>()
  for (const item of [...fallback, ...primary]) {
    if (['TMP', 'TMX', 'TMN'].includes(item.category) && temperature(item.fcstValue) === null) continue
    merged.set(`${item.fcstDate}:${item.fcstTime}:${item.category}`, item)
  }
  return { items: [...merged.values()], issue: primary.length ? schedule.short : schedule.shortFallback }
}
export async function fetchMidWeather(key: string, now = new Date()) {
  const schedule = getWeatherSchedule(now)
  for (const issue of [schedule.mid, schedule.midFallback]) {
    const results = await Promise.allSettled([
      fetchKma('MidFcstInfoService/getMidTa', { regId: '11B10101', tmFc: issue.date + issue.time }, key),
      fetchKma('MidFcstInfoService/getMidLandFcst', { regId: '11B00000', tmFc: issue.date + issue.time }, key),
    ])
    const [ta, land] = results
    if (ta.status === 'fulfilled') {
      const temperatures = ta.value.items[0]
      const usable = Array.from({ length: 8 }, (_, i) => i + 3).some(d =>
        temperature(temperatures[`taMin${d}`]) !== null && temperature(temperatures[`taMax${d}`]) !== null)
      if (usable) return { issue, temperatures, land: land.status === 'fulfilled' ? land.value.items[0] : null }
    }
  }
  return { issue: schedule.mid, temperatures: null, land: null }
}
const ZONES = [
  { min: 28, label: '한여름', items: ['반팔티셔츠', '반바지', '민소매', '샌들', '원피스', '린넨셔츠'] },
  { min: 23, label: '초여름', items: ['반팔티셔츠', '반바지', '반팔셔츠', '숏팬츠', '원피스', '캡모자'] },
  { min: 17, label: '환절기(봄/가을)', items: ['긴팔티셔츠', '후드티', '가디건', '바람막이', '긴바지', '맨투맨'] },
  { min: 10, label: '쌀쌀', items: ['자켓', '니트', '후드집업', '코트', '긴바지', '맨투맨'] },
  { min: -Infinity, label: '한겨울', items: ['패딩', '코트', '후리스', '머플러', '장갑', '기모바지'] },
]
const SKY: Record<string, string> = { '1': '맑음', '3': '구름', '4': '흐림' }
const PTY: Record<string, string> = { '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' }
function midWeather(value: unknown) {
  const text = typeof value === 'string' ? value : ''
  if (text.includes('비/눈')) return '비/눈'
  if (text.includes('소나기')) return '소나기'
  if (text.includes('눈')) return '눈'
  if (text.includes('비')) return '비'
  if (text.includes('흐림') || text.includes('흐리고')) return '흐림'
  if (text.includes('구름')) return '구름'
  return text === '맑음' ? '맑음' : ''
}
export type DailyWeather = { date: string; dateLabel: string; day: string; tmx: number | null; tmn: number | null; avg: number | null; weather: string; rainPct: number | null; source: 'short' | 'mid' | 'missing' }
export function buildWeatherReport(now: Date, short: ShortWeatherItem[], mid: { issue: { date: string; time: string }; temperatures: KmaItem | null; land: KmaItem | null }) {
  const { today } = getWeatherSchedule(now)
  const shortByDate = new Map<string, ShortWeatherItem[]>()
  for (const item of short) { const items = shortByDate.get(item.fcstDate) ?? []; items.push(item); shortByDate.set(item.fcstDate, items) }
  const temps: DailyWeather[] = Array.from({ length: 10 }, (_, offset) => {
    const date = addWeatherDays(today, offset)
    const dayDate = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00Z`)
    const rows = shortByDate.get(date) ?? []
    const values = rows.filter(r => r.category === 'TMP').map(r => temperature(r.fcstValue)).filter((v): v is number => v !== null)
    const max = rows.find(r => r.category === 'TMX' && temperature(r.fcstValue) !== null)
    const min = rows.find(r => r.category === 'TMN' && temperature(r.fcstValue) !== null)
    let tmx = max ? temperature(max.fcstValue) : values.length ? Math.max(...values) : null
    let tmn = min ? temperature(min.fcstValue) : values.length ? Math.min(...values) : null
    let avg = values.length ? meanTemperature(values) : tmx !== null && tmn !== null ? meanTemperature([tmx, tmn]) : null
    const rain = rows.find(r => r.category === 'PTY' && PTY[String(r.fcstValue)])
    const skies = rows.filter(r => r.category === 'SKY' && SKY[String(r.fcstValue)]).map(r => String(r.fcstValue))
    const sky = skies.sort((a, b) => skies.filter(s => s === b).length - skies.filter(s => s === a).length)[0]
    let weather = rain ? PTY[String(rain.fcstValue)] : SKY[sky] ?? ''
    let source: DailyWeather['source'] = avg !== null ? 'short' : 'missing'
    let rainPct: number | null = null
    // Medium-range offsets are relative to the issue's KST date, not the host's today.
    const midOffset = Array.from({ length: 8 }, (_, i) => i + 3).find(d => addWeatherDays(mid.issue.date, d) === date)
    if (midOffset !== undefined && mid.temperatures) {
      if (avg === null) {
        tmx = temperature(mid.temperatures[`taMax${midOffset}`])
        tmn = temperature(mid.temperatures[`taMin${midOffset}`])
        avg = tmx !== null && tmn !== null ? meanTemperature([tmx, tmn]) : null
        if (avg !== null) source = 'mid'
      }
      if (mid.land && source !== 'short') {
        const suffix = midOffset <= 7 ? `${midOffset}Pm` : String(midOffset)
        weather = midWeather(mid.land[`wf${suffix}`] ?? mid.land[`wf${midOffset}Am`])
        const pcts = (midOffset <= 7 ? [`rnSt${midOffset}Am`, `rnSt${midOffset}Pm`] : [`rnSt${midOffset}`]).map(k => mid.land![k]).filter(v => v !== null && v !== undefined && String(v).trim() !== '').map(Number).filter(v => Number.isFinite(v) && v >= 0 && v <= 100)
        rainPct = pcts.length ? Math.max(...pcts) : null
      }
    }
    return { date, dateLabel: `${date.slice(4, 6)}/${date.slice(6)}`, day: DAYS[dayDate.getUTCDay()], tmx, tmn, avg, weather, rainPct, source }
  })
  const firstDays = temps.slice(0, 3)
  const avgDays = firstDays.filter(t => t.avg !== null).length
  const avgTemp = meanTemperature(firstDays.map(t => t.avg))
  const laterAvg = meanTemperature(temps.slice(5).map(t => t.avg))
  const recommendations: { label: string; items: string[]; period: string }[] = []
  for (const [value, period] of [[avgTemp, '이번 주'], [laterAvg, '다음 주']] as const) {
    if (value === null) continue
    const zone = ZONES.find(z => value >= z.min)!
    if (!recommendations.some(r => r.label === zone.label)) recommendations.push({ label: zone.label, items: zone.items, period })
  }
  const missingDates = temps.filter(t => t.avg === null).map(t => t.dateLabel)
  const alerts: string[] = []
  if (missingDates.length) alerts.push(`예보 미수신: ${missingDates.join(', ')} — 미수신 기온은 평균에서 제외했습니다.`)
  let tempTrend: string | null = null
  const first = temps[0].avg, last = temps[9].avg
  if (first !== null && last !== null) {
    const diff = Math.round((last - first) * 10) / 10
    if (diff >= 8) { tempTrend = `10일간 급격한 기온 상승 (+${diff.toFixed(1)}°C)`; alerts.push('반팔/반바지 물량 긴급 확대 필요', '아우터/니트 마크다운 검토') }
    else if (diff >= 5) { tempTrend = `기온 상승 추세 (+${diff.toFixed(1)}°C)`; alerts.push('여름 상품 VMD 전환 준비') }
    else if (diff <= -8) { tempTrend = `10일간 급격한 기온 하강 (${diff.toFixed(1)}°C)`; alerts.push('아우터/후리스 긴급 배치', '여름 상품 조기 마크다운 검토') }
    else if (diff <= -5) { tempTrend = `기온 하강 추세 (${diff.toFixed(1)}°C)`; alerts.push('F/W 상품 보충출고 확대') }
  }
  const wideRange = temps.find(t => t.tmx !== null && t.tmn !== null && t.tmx - t.tmn >= 15)
  if (wideRange) alerts.push(`${wideRange.dateLabel} 일교차 ${(wideRange.tmx! - wideRange.tmn!).toFixed(0)}°C — 레이어링 아이템(가디건/후드집업) 추천`)
  const weekendAvg = meanTemperature(temps.filter(t => t.day === '토' || t.day === '일').map(t => t.avg))
  if (weekendAvg !== null && avgTemp !== null && Math.abs(weekendAvg - avgTemp) >= 3) alerts.push(`주말 평균 ${weekendAvg}°C — 매장 VMD 주말 전 조정 권장`)
  const rainy = temps.filter(t => t.rainPct !== null && t.rainPct >= 60)
  if (rainy.length >= 3) alerts.push(`향후 10일 중 ${rainy.length}일 강수확률 60%↑ — 우천 대비 상품(방수자켓/레인부츠) 및 매장 VM 조정 권장`)
  else if (rainy.length) alerts.push(`강수 예보: ${rainy.map(t => `${t.dateLabel}(${t.rainPct}%)`).join(', ')} — 해당일 야외 행사/촬영 일정 확인`)
  if (avgTemp !== null && laterAvg !== null) {
    const a = ZONES.find(z => avgTemp >= z.min)!, b = ZONES.find(z => laterAvg >= z.min)!
    if (a.label !== b.label) alerts.push(`기온대 전환: ${a.label}(${avgTemp}°C) → ${b.label}(${laterAvg}°C) — 상품 구성 전환 필요`)
  }
  return { temps, avgTemp, avgDays, laterAvg, recommendations, tempTrend, alerts, missingDates, forecastDate: today, timeZone: 'Asia/Seoul' }
}
