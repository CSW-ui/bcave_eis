import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 목표 데이터는 업로드 직후 항상 최신 반영되어야 하므로 캐시 금지
export const dynamic = 'force-dynamic'

// GET: 목표매출 전체 조회
export async function GET() {
  // supabase 기본 1000행 한계 회피 — 페이지네이션으로 전체 수집
  const PAGE = 1000
  const all: any[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('monthly_targets')
      .select('yyyymm, brandnm, target, shoptypenm, shopcd, updated_at')
      .order('yyyymm', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return NextResponse.json({ data: all })
}

// POST: 목표매출 업로드 (upsert)
export async function POST(req: NextRequest) {
  const { targets } = await req.json() as {
    targets: { yyyymm: string; brandnm: string; target: number; shoptypenm?: string; shopcd?: string }[]
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 })
  }

  // 같은 키 조합(yyyymm,brandnm,shoptypenm,shopcd) 합산
  // 기획년도(당해년도/이월/선입고) 등 같은 매장·월·채널 row가 여러 개일 때 합산
  const now = new Date().toISOString()
  const agg = new Map<string, { yyyymm: string; brandnm: string; target: number; shoptypenm: string; shopcd: string; updated_at: string }>()
  for (const t of targets) {
    const shoptypenm = t.shoptypenm || ''
    const shopcd = t.shopcd || ''
    const key = `${t.yyyymm}|${t.brandnm}|${shoptypenm}|${shopcd}`
    const prev = agg.get(key)
    if (prev) prev.target += t.target
    else agg.set(key, { yyyymm: t.yyyymm, brandnm: t.brandnm, target: t.target, shoptypenm, shopcd, updated_at: now })
  }
  const rows = Array.from(agg.values())

  // 1000건씩 배치 처리 (PostgreSQL bind parameter 한계 회피)
  const BATCH = 1000
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await supabaseAdmin
      .from('monthly_targets')
      .upsert(chunk, { onConflict: 'yyyymm,brandnm,shoptypenm,shopcd' })
    if (error) {
      return NextResponse.json(
        { error: `${i}~${i + chunk.length}건 처리 중 실패: ${error.message}` },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ ok: true, count: rows.length })
}

// DELETE: 목표매출 전체 삭제
export async function DELETE() {
  const { error } = await supabaseAdmin
    .from('monthly_targets')
    .delete()
    .neq('id', 0) // 전체 삭제

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
