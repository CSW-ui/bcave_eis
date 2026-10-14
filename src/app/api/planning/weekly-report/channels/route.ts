import { NextResponse } from 'next/server'
import { getServerProfile } from '@/lib/auth'
import { snowflakeQuery } from '@/lib/snowflake'
import { lastClosedSunday, reportWeeks, validReportDate } from '@/lib/planning-weekly-report'
import { toWeeklyChannels, weeklyChannelQuery } from '@/lib/planning-weekly-channels'

export const dynamic='force-dynamic'
export const maxDuration=60
export async function GET(req:Request) {
  const profile=await getServerProfile()
  if(!profile)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401})
  const q=new URL(req.url).searchParams,brand=q.get('brand')||'',style=q.get('style')||'',asOf=q.get('asOf')||''
  if(profile.role==='vendor'||(profile.role!=='admin'&&profile.brands.length&&!profile.brands.includes(brand)))
    return NextResponse.json({error:'해당 브랜드 조회 권한이 없습니다.'},{status:403})
  if(!validReportDate(asOf)||asOf>lastClosedSunday())return NextResponse.json({error:'마감일을 확인해 주세요.'},{status:400})
  let sql:string
  try {sql=weeklyChannelQuery(brand,style,asOf)}catch{return NextResponse.json({error:'브랜드·상품·마감일을 확인해 주세요.'},{status:400})}
  try {
    const rows=await snowflakeQuery<Record<string,unknown>>(sql),weeks=reportWeeks(asOf)
    return NextResponse.json({brand,style,asOf,weekStart:weeks[11].start,channels:toWeeklyChannels(rows),weeks},{headers:{'Cache-Control':'private, no-store'}})
  }catch{
    console.error('Planning weekly channel query failed')
    return NextResponse.json({error:'판매채널 조회에 실패했습니다. 다시 시도해 주세요.'},{status:500})
  }
}
