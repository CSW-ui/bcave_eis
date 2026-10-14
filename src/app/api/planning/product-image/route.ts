import { NextResponse } from 'next/server'
import { getServerProfile } from '@/lib/auth'
import { resolveProductImage } from '@/lib/planning-product-images'
export const dynamic='force-dynamic'
export const maxDuration=35
export async function GET(req:Request) {
  const profile=await getServerProfile()
  if(!profile)return NextResponse.json({error:'로그인이 필요합니다.'},{status:401})
  const q=new URL(req.url).searchParams,brand=q.get('brand')||'',style=q.get('style')||'',color=q.get('color')||''
  if(profile.role==='vendor'||(profile.role!=='admin'&&profile.brands.length&&!profile.brands.includes(brand)))return NextResponse.json({error:'해당 브랜드 조회 권한이 없습니다.'},{status:403})
  if(!['CO','LE','WA','CK','LK'].includes(brand))return NextResponse.json({error:'브랜드를 확인해 주세요.'},{status:400})
  try {const image=await resolveProductImage(brand,style,color);return NextResponse.json(image,{headers:{'Cache-Control':'private, max-age=300'}})}
  catch {return NextResponse.json({error:'상품코드를 확인해 주세요.'},{status:400})}
}
