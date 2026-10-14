import { NextResponse } from 'next/server'
import { getServerProfile } from '@/lib/auth'
import { snowflakeQuery } from '@/lib/snowflake'
import { lastClosedSunday, reportWeeks, toWeeklyProduct, validReportDate, weeklyQuery, WEEKLY_BRANDS } from '@/lib/planning-weekly-report'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const profile=await getServerProfile()
  if(!profile) return NextResponse.json({error:'로그인이 필요합니다.'},{status:401})
  if(profile.role==='vendor') return NextResponse.json({error:'접근 권한이 없습니다.'},{status:403})
  const q=new URL(req.url).searchParams, requested=q.get('brand')
  if(!requested) return NextResponse.json({error:'브랜드를 선택하세요.'},{status:400})
  const brands=requested==='all'?[...WEEKLY_BRANDS]:requested.split(',')
  if(profile.role!=='admin'&&profile.brands.length&&brands.some(b=>!profile.brands.includes(b)))
    return NextResponse.json({error:'해당 브랜드 조회 권한이 없습니다.'},{status:403})
  const asOf=q.get('asOf')||lastClosedSunday(),year=q.get('year')||asOf.slice(2,4),seasons=(q.get('season')||'가을,겨울,하반기,스탠다드').split(',')
  if(!validReportDate(asOf)||new Date(asOf).getUTCDay()!==0||asOf>lastClosedSunday()) return NextResponse.json({error:'최근 완료된 일요일까지의 일요일 마감일을 선택하세요.'},{status:400})
  let sql: string
  try {sql=weeklyQuery(brands,year,seasons,asOf)} catch {return NextResponse.json({error:'브랜드·시즌·기준일을 확인해 주세요.'},{status:400})}
  try {
    const rows=await snowflakeQuery<Record<string,unknown>>(sql)
    return NextResponse.json({products:rows.map(toWeeklyProduct),weeks:reportWeeks(asOf),asOf,fetchedAt:new Date().toISOString(),inventoryBasis:'조회 시점의 매장 INVQTY + 창고 AVAILQTY'}, {headers:{'Cache-Control':'private, no-store'}})
  } catch {
    console.error('Planning weekly report query failed')
    return NextResponse.json({error:'주간보고 조회에 실패했습니다. 잠시 후 다시 조회해 주세요.'},{status:500})
  }
}
