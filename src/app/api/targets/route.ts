import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: 목표매출 전체 조회
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('monthly_targets')
    .select('yyyymm, brandnm, target, shoptypenm, shopcd, updated_at')
    .order('yyyymm', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

// POST: 목표매출 업로드 (upsert)
export async function POST(req: NextRequest) {
  const { targets } = await req.json() as {
    targets: { yyyymm: string; brandnm: string; target: number; shoptypenm?: string; shopcd?: string }[]
  }

  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: '데이터가 없습니다.' }, { status: 400 })
  }

  // upsert: 같은 키 조합이면 target 값 업데이트
  const rows = targets.map(t => ({
    yyyymm: t.yyyymm,
    brandnm: t.brandnm,
    target: t.target,
    shoptypenm: t.shoptypenm || '',
    shopcd: t.shopcd || '',
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin
    .from('monthly_targets')
    .upsert(rows, { onConflict: 'yyyymm,brandnm,shoptypenm,shopcd' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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
