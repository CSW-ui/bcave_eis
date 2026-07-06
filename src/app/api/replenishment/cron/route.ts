import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 600

const BRANDS = ['CO', 'LE', 'WA', 'CK', 'LK']
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

// GET /api/replenishment/cron?secret=xxx  (또는 헤더 x-cron-secret)
// 새벽 자동 실행: 5개 브랜드 순차 보충 계산
// CRON_SECRET 환경변수 필수 — 미설정 시 항상 401
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret') ?? req.headers.get('x-cron-secret')

  if (!verifyCronSecret(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  const orderDate = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`
  const startTime = Date.now()
  const results: { brand: string; status: string; savedCount?: number; shopCount?: number; error?: string; elapsed?: number }[] = []

  console.log(`[CRON] 보충출고 자동 실행 시작: ${orderDate}`)

  // 실행 로그 시작 (테이블 없으면 무시)
  await supabaseAdmin.from('replenishment_logs').insert({
    run_date: orderDate,
    status: 'running',
    started_at: new Date().toISOString(),
  }).then(() => {}, () => {})

  for (const brand of BRANDS) {
    const brandStart = Date.now()
    try {
      console.log(`[CRON] ${brand} 계산 시작...`)
      const res = await fetch(`${BASE_URL}/api/replenishment/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': process.env.CRON_SECRET ?? '',
        },
        body: JSON.stringify({ brand }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ brand, status: 'error', error: err, elapsed: Date.now() - brandStart })
        console.error(`[CRON] ${brand} 실패:`, err)
        continue
      }

      const json = await res.json()
      results.push({
        brand,
        status: 'success',
        savedCount: json.savedCount,
        shopCount: json.shopCount,
        elapsed: Date.now() - brandStart,
      })
      console.log(`[CRON] ${brand} 완료: ${json.savedCount}건, ${json.shopCount}매장, ${Math.round((Date.now() - brandStart) / 1000)}초`)
    } catch (err) {
      results.push({ brand, status: 'error', error: String(err), elapsed: Date.now() - brandStart })
      console.error(`[CRON] ${brand} 에러:`, err)
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000)
  const successCount = results.filter(r => r.status === 'success').length
  const totalSaved = results.reduce((s, r) => s + (r.savedCount || 0), 0)

  // 실행 로그 완료 업데이트 (테이블 없으면 무시)
  await supabaseAdmin.from('replenishment_logs').update({
    status: successCount === BRANDS.length ? 'completed' : 'partial',
    completed_at: new Date().toISOString(),
    total_saved: totalSaved,
    brand_results: results,
    elapsed_seconds: totalElapsed,
  }).eq('run_date', orderDate).eq('status', 'running').then(() => {}, () => {})

  console.log(`[CRON] 전체 완료: ${successCount}/${BRANDS.length} 브랜드, ${totalSaved}건, ${totalElapsed}초`)

  return NextResponse.json({
    success: true,
    date: orderDate,
    elapsed: `${totalElapsed}초`,
    brands: results,
    summary: `${successCount}/${BRANDS.length} 브랜드 완료, 총 ${totalSaved}건 보충 제안`,
  })
}
