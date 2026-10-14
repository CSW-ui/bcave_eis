export interface ProductImage { imageUrl: string | null; productUrl: string | null; code: string; status: 'connected' | 'missing' | 'unsupported' }
const HOSTS: Record<string,string>={CO:'https://www.covernat.co.kr',LE:'https://leekorea.co.kr',WA:'https://www.wackywilly.co.kr'}
const cache=new Map<string,{value:ProductImage;expires:number}>()
const pending=new Map<string,Promise<ProductImage>>()
const unescapeHtml=(s:string)=>s.replace(/&amp;/g,'&').replace(/&#34;|&quot;/g,'"').replace(/&#39;/g,"'")
function attribute(tag:string,name:string) { const m=tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`,'i'));return m?unescapeHtml(m[2]):'' }
function safeImage(raw:string,base:string) {
  try {const u=new URL(raw,base);return u.protocol==='https:'&&['bmbx-prd.my.commercecloud.salesforce.com','leekorea.co.kr','www.leekorea.co.kr'].includes(u.hostname)?u.href:null} catch{return null}
}
export function extractMallImage(html:string,brand:string,code:string,pageUrl:string):string|null {
  if(brand==='CO'||brand==='WA') {
    for(const tag of html.match(/<img\b[^>]*>/gi)||[]) {
      const raw=attribute(tag,'src'),url=safeImage(raw,pageUrl)
      if(url&&new URL(url).pathname.includes('/'+code+'_')&&url.includes('/dw/image/'))return url
    }
    return null
  }
  // Lee 상품 페이지 자체의 모델코드 일치가 확인된 경우에만 대표 이미지를 사용한다.
  const meta=html.match(/<meta\b[^>]*>/gi)||[]
  const description=meta.filter(t=>['description','og:description'].includes(attribute(t,'name')||attribute(t,'property'))).map(t=>attribute(t,'content')).join(' ')
  if(!new RegExp(code+'(?![A-Z0-9])','i').test(description))return null
  const og=meta.find(t=>attribute(t,'property')==='og:image')
  return og?safeImage(attribute(og,'content'),pageUrl):null
}
async function getHTML(url:string) {
  const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; BcaveEIS/1.0)'},signal:AbortSignal.timeout(7000),redirect:'error',cache:'no-store'})
  if(!res.ok)return null
  const body=await res.text();return body.length<=5000000?body:null
}
export function leeSearchCandidates(html:string):string[] {
  const start=html.indexOf('xans-search-result')
  if(start<0)return []
  const end=html.indexOf('xans-search-paging',start)
  const results=html.slice(start,end<0?start+60000:end)
  return Array.from(new Set(Array.from(results.matchAll(/anchorBoxId_(\d+)/g),m=>m[1])))
}
async function resolveUncached(brand:string,code:string):Promise<ProductImage> {
  const base=HOSTS[brand]
  if(!base)return {imageUrl:null,productUrl:null,code,status:'unsupported'}
  if(brand!=='LE') {
    const productUrl=base+'/product/'+encodeURIComponent(code),html=await getHTML(productUrl)
    const imageUrl=html?extractMallImage(html,brand,code,productUrl):null
    return {code,imageUrl,productUrl:imageUrl?productUrl:null,status:imageUrl?'connected':'missing'}
  }
  const search=await getHTML(base+'/product/search.html?keyword='+encodeURIComponent(code))
  const ids=new Set<string>()
  // 기존에 확인한 모델코드-상품번호 연결도 실제 상품 페이지를 다시 검증한다.
  if(code==='LE2603IP32BR')ids.add('18390')
  for(const id of leeSearchCandidates(search||''))ids.add(id)
  for(const id of Array.from(ids).slice(0,3)) {
    const productUrl=base+'/product/detail.html?product_no='+id,html=await getHTML(productUrl)
    const imageUrl=html?extractMallImage(html,brand,code,productUrl):null
    if(imageUrl)return {code,imageUrl,productUrl,status:'connected'}
  }
  return {code,imageUrl:null,productUrl:null,status:'missing'}
}
export async function resolveProductImage(brand:string,style:string,color:string):Promise<ProductImage> {
  if(!/^[A-Z]{2}[A-Z0-9]{4,24}$/.test(style)||!style.startsWith(brand)||! /^[A-Z0-9]{1,6}$/.test(color))throw Error('Invalid product code')
  const code=style+color,key=brand+'|'+code,hit=cache.get(key)
  if(hit&&hit.expires>Date.now())return hit.value
  if(pending.has(key))return pending.get(key)!
  const promise=resolveUncached(brand,code).catch(()=>({code,imageUrl:null,productUrl:null,status:'missing'} as ProductImage)).then(value=>{
    if(cache.size>=1000)cache.delete(cache.keys().next().value!)
    cache.set(key,{value,expires:Date.now()+(value.status==='connected'?86400000:600000)})
    return value
  }).finally(()=>pending.delete(key))
  pending.set(key,promise);return promise
}
