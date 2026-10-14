'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useAuth } from '@/contexts/AuthContext'
import { BRAND_NAMES, FW_SEASONS, SS_SEASONS } from '@/lib/constants'
import { lastClosedSunday, type PlanningWeeklyData, type PlanningWeeklyProduct as Product } from '@/lib/planning-weekly-report'
import type { ProductImage } from '@/lib/planning-product-images'
import s from './weekly-report.module.css'

type Mode='q'|'a'
const n=(v:number|null)=>v===null?'—':v.toLocaleString('ko-KR',{maximumFractionDigits:0})
const pct=(v:number|null)=>v===null?'—':(v*100).toFixed(0)+'%'
const amount=(v:number)=> (v/1e6).toLocaleString('ko-KR',{maximumFractionDigits:1})
const sum=(rows:Product[],key:keyof Product)=>rows.reduce((a,p)=>a+Number(p[key]||0),0)
const rate=(rows:Product[])=>sum(rows,'netInbound')>0?sum(rows,'sales')/sum(rows,'netInbound'):null
const groups=(rows:Product[],key:'gender'|'item')=>Array.from(new Set(rows.map(p=>p[key]))).map(name=>({name,rows:rows.filter(p=>p[key]===name)}))
const key=(p:Product)=>p.brand+'|'+p.style
const imageCache=new Map<string,ProductImage>()
let runningImages=0
const imageJobs:Array<()=>void>=[]
function queueImage(job:()=>Promise<ProductImage>):Promise<ProductImage> {
  return new Promise((resolve,reject)=>{const run=()=>{runningImages++;job().then(resolve,reject).finally(()=>{runningImages--;imageJobs.shift()?.()})};if(runningImages<3)run();else imageJobs.push(run)})
}
function MallImage({product,color,large=false}:{product:Product;color:string;large?:boolean}) {
  const container=useRef<HTMLDivElement>(null),[image,setImage]=useState<ProductImage|null>(null),[status,setStatus]=useState('이미지 확인 중'),[failed,setFailed]=useState(false)
  useEffect(()=>{
    let cancelled=false,started=false;setImage(null);setFailed(false);setStatus(color?'이미지 확인 중':'등록 컬러 없음')
    if(!color||!['CO','LE','WA'].includes(product.brand)){setStatus('연결 이미지 없음');return}
    const cacheKey=[product.brand,product.style,color].join('|')
    const load=()=>{if(started)return;started=true;const cached=imageCache.get(cacheKey);if(cached){setImage(cached);setStatus(cached.imageUrl?'':'연결 이미지 없음');return}
      queueImage(async()=>{const q=new URLSearchParams({brand:product.brand,style:product.style,color});const res=await fetch('/api/planning/product-image?'+q);if(!res.ok)throw Error();return res.json() as Promise<ProductImage>}).then(value=>{imageCache.set(cacheKey,value);if(!cancelled){setImage(value);setStatus(value.imageUrl?'':'연결 이미지 없음')}}).catch(()=>{if(!cancelled)setStatus('이미지 조회 실패')})}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){load();observer.disconnect()}},{rootMargin:'100px'})
    if(large)load();else if(container.current)observer.observe(container.current)
    return()=>{cancelled=true;observer.disconnect()}
  },[product.brand,product.style,color,large])
  return <div ref={container} className={large?s.largeImage:s.thumb}>
    {image?.imageUrl&&!failed?<img src={image.imageUrl} alt={`${product.name} ${color}`} loading="lazy" onError={()=>setFailed(true)}/>:<span>{failed?'이미지 없음':status}</span>}
    {large&&image?.productUrl&&<a href={image.productUrl} target="_blank" rel="noopener noreferrer">자사몰에서 보기 ↗</a>}
  </div>
}
function WeeklyChart({values,labels,small=false}:{values:number[];labels:string[];small?:boolean}) {
  const W=small?150:720,H=small?32:154,L=small?2:16,B=small?2:28,T=small?3:22
  const lo=Math.min(0,...values),hi=Math.max(1,...values),y=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B),zero=y(0),gap=(W-L-8)/Math.max(values.length,1)
  if(small)return <svg className={s.spark} viewBox={`0 0 ${W} ${H}`} aria-hidden="true"><path d={values.map((v,i)=>`${i?'L':'M'}${L+i*(W-6)/Math.max(1,values.length-1)},${y(v)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>
  return <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="최근 12주 판매수량"><line x1={L} y1={zero} x2={W-5} y2={zero} stroke="#deddd5"/>{values.map((v,i)=><g key={i}><rect x={L+i*gap+gap*.12} y={Math.min(zero,y(v))} width={gap*.76} height={Math.abs(zero-y(v))} fill={v<0?'#bd4b37':v===hi?'#26352c':'#888b81'}/><text x={L+i*gap+gap*.5} y={v>=0?y(v)-5:y(v)+12} textAnchor="middle">{n(v)}</text><text x={L+i*gap+gap*.5} y={H-8} textAnchor="middle">{labels[i]}</text></g>)}</svg>
}
function ProductDetail({product,data,mode}:{product:Product;data:PlanningWeeklyData;mode:Mode}) {
  const [color,setColor]=useState(product.colors[0]?.code||'')
  const val=(q:number,a:number)=>mode==='q'?n(q):amount(a)
  return <><Dialog.Title className={s.modalTitle}>{product.name}</Dialog.Title><p className={s.sub}>{BRAND_NAMES[product.brand]} · {product.style} · {product.season} · {product.item}</p>
    <div className={s.modalGrid}><div><MallImage product={product} color={color} large/><div className={s.colorChoices}>{product.colors.map(c=><button key={c.code} className={color===c.code?s.active:''} onClick={()=>setColor(c.code)}>{c.code} · {c.name}</button>)}</div><p className={s.hint}>이미지는 선택한 컬러 기준입니다. 실적은 전체 컬러를 합한 스타일 기준입니다.</p></div>
    <div className={s.detailBox}><h3>입고 · 판매 · 현재 재고 ({mode==='q'?'개':'백만원'})</h3><div className={s.detailValues}>{[
      ['발주',val(product.order,product.orderAmount)],['총입고',val(product.inbound,product.inboundAmount)],['메인 입고',val(product.mainIn,product.mainInAmount)],['리오더 입고',val(product.reorderIn,product.reorderInAmount)],['미입고 리오더',val(product.upcoming,product.upcomingAmount)],['누적 판매',val(product.sales,product.revenue)],['현재 재고',val(product.stock,product.stockAmount)],['판매율',pct(product.sellThrough)]
    ].map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className={s.hint}>해외법인 이전 {n(product.transfer)}개를 입고에서 차감한 수량 {n(product.netInbound)}개가 판매율의 분모입니다.</p></div>
    <div><div className={s.detailBox}><h3>주간 판매 추이 · 수량</h3><WeeklyChart values={product.weeks} labels={data.weeks.map(w=>w.label)}/></div><div className={s.detailBox}><h3>재고 진단</h3><p>최근 4주 주평균 {n(product.weeks.slice(-4).reduce((a,b)=>a+b,0)/4)}개</p><p>재고 소진 예상 {product.woh===null?'계산 불가':product.woh.toFixed(1)+'주'}</p><p>{product.poor?'부진: 소진 예상 40주 이상 또는 최근 4주 순판매 0 이하':'부진 조건에 해당하지 않음'}</p><p className={s.hint}>재고는 조회 시점 기준이며, 최근 판매 속도로 단순 계산합니다. 계절성 마감 예측은 포함하지 않습니다.</p></div></div></div></>
}
export default function PlanningWeeklyReportPage() {
  const {allowedBrands,loading:authLoading}=useAuth()
  const [brand,setBrand]=useState(''),[year,setYear]=useState(()=>lastClosedSunday().slice(2,4)),[season,setSeason]=useState(()=>{const m=Number(lastClosedSunday().slice(5,7));return m>=2&&m<=7?'SS':'FW'}),[asOf,setAsOf]=useState(lastClosedSunday)
  const [mode,setMode]=useState<Mode>('q'),[data,setData]=useState<PlanningWeeklyData|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0)
  const [gender,setGender]=useState('전체'),[item,setItem]=useState(''),[poorOnly,setPoorOnly]=useState(false),[trend,setTrend]=useState('전체'),[search,setSearch]=useState(''),[sort,setSort]=useState('sales'),[showUpcoming,setShowUpcoming]=useState(false),[page,setPage]=useState(1),[selected,setSelected]=useState<Product|null>(null)
  const allowedKey=allowedBrands?.join(',')||'all'
  useEffect(()=>{if(!authLoading)setBrand(allowedBrands?.[0]||'CO')},[authLoading,allowedKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const apiBrand=brand==='all'&&allowedBrands?.length?allowedBrands.join(','):brand
  useEffect(()=>{
    if(authLoading||!apiBrand)return
    const controller=new AbortController();setLoading(true);setError('');setData(null);setPage(1);setSelected(null)
    const q=new URLSearchParams({brand:apiBrand,year,season:season==='SS'?SS_SEASONS:FW_SEASONS,asOf})
    fetch('/api/planning/weekly-report?'+q,{signal:controller.signal}).then(async r=>{const json=await r.json();if(!r.ok)throw Error(json.error||'조회 실패');return json as PlanningWeeklyData}).then(value=>{setData(value);setGender('전체');setItem('')}).catch(e=>{if(e.name!=='AbortError')setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[authLoading,apiBrand,year,season,asOf,refresh])
  useEffect(()=>setPage(1),[gender,item,poorOnly,trend,search,sort,mode])
  const products=data?.products||[]
  const filtered=useMemo(()=>products.filter(p=>(gender==='전체'||p.gender===gender)&&(!item||p.item===item)&&(!poorOnly||p.poor)&&(trend==='전체'||p.trend===trend)&&(!search||[p.style,p.name,...p.colors.map(c=>c.code+' '+c.name)].join(' ').toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b)=>{
    if(sort==='name')return a.name.localeCompare(b.name,'ko')
    if(sort==='rate')return (a.sellThrough??-Infinity)-(b.sellThrough??-Infinity)
    return sort==='stock'?b.stock-a.stock:mode==='q'?b.sales-a.sales:b.revenue-a.revenue
  }),[products,gender,item,poorOnly,trend,search,sort,mode])
  const visible=filtered.slice((page-1)*50,page*50),maxPages=Math.max(1,Math.ceil(filtered.length/50))
  const val=(q:number,a:number)=>mode==='q'?n(q):amount(a), unit=mode==='q'?'개':'백만원'
  const reset=()=>{setGender('전체');setItem('');setPoorOnly(false);setTrend('전체');setSearch('');setSort('sales');setPage(1)}
  const totals=[['스타일 수',n(products.length),'개',`${products.reduce((a,p)=>a+p.colors.length,0)}개 스타일·컬러`],
    ['발주',val(sum(products,'order'),sum(products,'orderAmount')),unit,'기준일까지 등록 발주'],
    ['총입고',val(sum(products,'inbound'),sum(products,'inboundAmount')),unit,`메인 ${val(sum(products,'mainIn'),sum(products,'mainInAmount'))} · 리오더 ${val(sum(products,'reorderIn'),sum(products,'reorderInAmount'))}`],
    ['미입고 리오더',val(sum(products,'upcoming'),sum(products,'upcomingAmount')),unit,'차수·컬러별 미입고 잔량'],
    [mode==='q'?'판매':'순매출',val(sum(products,'sales'),sum(products,'revenue')),unit,'해외법인 이전 제외'],
    ['현재 재고',val(sum(products,'stock'),sum(products,'stockAmount')),unit,'매장 재고 + 창고 가용'],
    ['전체 판매율',pct(rate(products)),'','이전 차감 입고 대비 · 수량'],
    ['부진 스타일',n(products.filter(p=>p.poor).length),'개','소진 40주 이상 또는 판매 정체']]
  return <div className={s.report}>
    <div className={s.modeBar}><div>{(['q','a'] as Mode[]).map(m=><button key={m} aria-pressed={mode===m} className={mode===m?s.active:''} onClick={()=>setMode(m)}>{m==='q'?'수량 기준':'금액 기준'}</button>)}</div></div>
    <header className={s.header}><div><h1>주간보고</h1><span>상품기획 · {brand==='all'?'전체 브랜드':BRAND_NAMES[brand]} {year}{season==='SS'?' S/S':' F/W'} 판매 현황</span></div><span>{asOf} 마감 · 스타일 기준</span></header>
    <div className={s.controls}><label>브랜드<select value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">전체 브랜드</option>{['CO','LE','WA','CK','LK'].filter(b=>!allowedBrands||allowedBrands.includes(b)).map(b=><option key={b} value={b}>{BRAND_NAMES[b]}</option>)}</select></label><label>연도<select value={year} onChange={e=>setYear(e.target.value)}>{Array.from({length:Math.max(1,Number(lastClosedSunday().slice(2,4))-23)},(_,i)=>String(Number(lastClosedSunday().slice(2,4))+1-i)).map(y=><option key={y}>{y}</option>)}</select></label><label>시즌<select value={season} onChange={e=>setSeason(e.target.value)}><option value="SS">S/S</option><option value="FW">F/W</option></select></label><label>마감일<input aria-label="마감일" type="date" value={asOf} min="2025-01-05" max={lastClosedSunday()} step={7} onChange={e=>e.target.value&&setAsOf(e.target.value)}/></label><button onClick={()=>setRefresh(v=>v+1)} disabled={loading} className={s.refresh}>{loading?'조회 중…':'새로고침'}</button></div>
    <p className={s.basis}>매출·입고는 선택 마감일까지, 재고는 조회 시점 기준입니다. 매출은 VAT 제외 순매출, 발주·입고·재고 금액은 VAT 제외 태그가 기준입니다. 누적 판매 조회는 2025년부터입니다.</p>
    {loading&&<div role="status" className={s.loading}>Snowflake 실적을 조회하고 있습니다…</div>}
    {error&&<div role="alert" className={s.error}>{error} <button onClick={()=>setRefresh(v=>v+1)}>다시 조회</button></div>}
    {data&&<>
      <section className={s.kpis}>{totals.map(([label,value,u,sub],i)=><div key={label} className={i===7?s.poorKpi:''}><span>{label}</span><strong>{value}<small>{u}</small></strong><em>{sub}</em></div>)}</section>
      <section className={s.split}><div className={s.panel}><div className={s.panelHead}><h2>라인별 판매</h2><span>입고 · 판매 · 현재 재고</span></div><table><thead><tr><th>라인</th><th>입고</th><th>{mode==='q'?'판매':'매출'}</th><th>재고</th><th>판매율</th></tr></thead><tbody>{groups(products,'gender').map(g=><tr key={g.name}><td>{g.name}</td><td>{val(sum(g.rows,'inbound'),sum(g.rows,'inboundAmount'))}</td><td>{val(sum(g.rows,'sales'),sum(g.rows,'revenue'))}</td><td>{val(sum(g.rows,'stock'),sum(g.rows,'stockAmount'))}</td><td>{pct(rate(g.rows))}</td></tr>)}</tbody></table></div><div className={s.panel}><div className={s.panelHead}><h2>주간 판매 추이</h2><span>{data.weeks[0].start} — {asOf} · 수량</span></div><WeeklyChart values={data.weeks.map((_,i)=>products.reduce((a,p)=>a+p.weeks[i],0))} labels={data.weeks.map(w=>w.label)}/></div></section>
      <div className={s.panelHead}><h2>아이템별 판매 · 클릭하면 해당 품목만 필터</h2><span>{item?item+' 적용 중':'전체 조회 대상'}</span></div><section className={s.items}>{groups(products,'item').sort((a,b)=>sum(b.rows,'sales')-sum(a.rows,'sales')).map(g=><button key={g.name} aria-pressed={item===g.name} className={item===g.name?s.active:''} onClick={()=>setItem(item===g.name?'':g.name)}><b>{g.name}</b><span>{g.rows.length}개 스타일 · {val(sum(g.rows,'sales'),sum(g.rows,'revenue'))}{unit}</span><strong>{pct(rate(g.rows))}</strong><i><i style={{width:Math.max(0,Math.min(100,(rate(g.rows)||0)*100))+'%'}}/></i></button>)}</section>
      <section className={s.filters}><label>라인<select value={gender} onChange={e=>setGender(e.target.value)}><option>전체</option>{groups(products,'gender').map(g=><option key={g.name}>{g.name}</option>)}</select></label><button aria-pressed={poorOnly} className={poorOnly?s.active:''} onClick={()=>setPoorOnly(!poorOnly)}>부진만</button><label>추이<select value={trend} onChange={e=>setTrend(e.target.value)}><option>전체</option><option value="up">↑ 상승</option><option value="down">↓ 하락</option><option value="flat">— 보합</option></select></label><select aria-label="정렬" value={sort} onChange={e=>setSort(e.target.value)}><option value="sales">{mode==='q'?'판매수량':'매출액'} 많은순</option><option value="stock">재고 많은순</option><option value="rate">판매율 낮은순</option><option value="name">상품명순</option></select><label><input type="checkbox" checked={showUpcoming} onChange={e=>setShowUpcoming(e.target.checked)}/>미입고 리오더</label><input className={s.search} aria-label="상품 검색" placeholder="스타일코드, 상품명, 컬러 검색…" value={search} onChange={e=>setSearch(e.target.value)}/><button onClick={reset}>초기화</button></section>
      <div className={s.count}><span><b>{n(filtered.length)}</b>개 스타일 · 컬러 실적 합산</span><span>필터 합계 · 입고 <b>{val(sum(filtered,'inbound'),sum(filtered,'inboundAmount'))}</b> · 판매 <b>{val(sum(filtered,'sales'),sum(filtered,'revenue'))}</b> · 현재 재고 <b>{val(sum(filtered,'stock'),sum(filtered,'stockAmount'))} {unit}</b> · 판매율 <b>{pct(rate(filtered))}</b></span></div>
      <div className={s.tableWrap}><table className={s.products}><thead><tr><th>#</th><th>대표 컬러</th><th>스타일 / 상품</th><th>시즌</th><th>소비자가</th><th>총입고</th>{showUpcoming&&<th>미입고 리오더</th>}<th>{mode==='q'?'판매':'순매출'}</th><th>현재 재고</th><th>판매율</th><th>소진 예상</th><th>주간 판매 추이</th></tr></thead><tbody>{visible.map((p,i)=><tr key={key(p)} className={p.poor?s.poorRow:''}><td>{String((page-1)*50+i+1).padStart(3,'0')}</td><td><button className={s.imageButton} onClick={()=>setSelected(p)} aria-label={p.name+' 상세'}><MallImage product={p} color={p.colors[0]?.code||''}/><small>{p.colors[0]?.code||'—'}</small></button></td><td><button className={s.productButton} onClick={()=>setSelected(p)}><span>{p.style} {p.poor&&<em>부진</em>}</span><b>{p.name}</b><small>{BRAND_NAMES[p.brand]} · {p.gender} · {p.item}</small></button></td><td>{year} {p.season}</td><td>{n(p.price)}원</td><td><strong>{val(p.inbound,p.inboundAmount)}</strong><small>메인 {val(p.mainIn,p.mainInAmount)} · 리오더 {val(p.reorderIn,p.reorderInAmount)}</small></td>{showUpcoming&&<td>{val(p.upcoming,p.upcomingAmount)}</td>}<td><strong>{val(p.sales,p.revenue)}</strong></td><td className={p.stock<0?s.warning:''}><strong>{val(p.stock,p.stockAmount)}</strong></td><td className={p.sellThrough!==null&&p.sellThrough>1?s.warning:''}><strong>{pct(p.sellThrough)}</strong>{p.sellThrough!==null&&p.sellThrough>1&&<small>수치 확인</small>}</td><td>{p.woh===null?'—':p.woh.toFixed(1)+'주'}</td><td className={p.trend==='down'?s.warning:p.trend==='up'?s.up:''}><WeeklyChart small values={p.weeks} labels={data.weeks.map(w=>w.label)}/><small>{p.trend==='up'?'↑ 상승':p.trend==='down'?'↓ 하락':'— 보합'}</small></td></tr>)}</tbody></table>{!filtered.length&&<div className={s.empty}>조건에 맞는 상품이 없습니다.</div>}</div>
      <div className={s.pagination}><span>50개씩 표시 · 이미지는 화면에 표시되는 상품부터 연결</span><div><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>이전</button><span>{page} / {maxPages}</span><button disabled={page===maxPages} onClick={()=>setPage(p=>p+1)}>다음</button></div></div>
      <footer className={s.footer}><span>판매율 = 순판매 ÷ (입고 − 자사 해외법인 이전) · 추이 = 최근 2주와 직전 2주 비교</span><span>조회 {new Date(data.fetchedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</span></footer>
    </>}
    <Dialog.Root open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}><Dialog.Portal><Dialog.Overlay className={s.overlay}/><Dialog.Content className={s.modal} aria-describedby={undefined}>{selected&&data&&<ProductDetail key={key(selected)} product={selected} data={data} mode={mode}/>}<Dialog.Close className={s.close} aria-label="상품 상세 닫기">×</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>
}
