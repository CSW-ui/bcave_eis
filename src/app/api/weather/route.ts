import { NextResponse } from 'next/server'
import { buildWeatherReport, fetchShortWeather, fetchMidWeather } from '@/lib/weather'

// Weather must never be frozen into the production build or a CDN response.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const now = new Date()
  const key = process.env.WEATHER_API_KEY || ''
  const [short, mid] = await Promise.all([fetchShortWeather(key, now), fetchMidWeather(key, now)])
  return NextResponse.json({
    ...buildWeatherReport(now, short.items, mid),
    baseDate: short.issue.date, baseTime: short.issue.time,
    midBaseDate: mid.issue.date, midBaseTime: mid.issue.time,
  }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}
