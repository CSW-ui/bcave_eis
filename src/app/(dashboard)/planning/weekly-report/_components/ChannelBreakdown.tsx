'use client'

import { useEffect, useState } from 'react'
import type { WeeklyChannelData } from '@/lib/planning-weekly-channels'
import s from '../weekly-report.module.css'

const qty=(v:number)=>v.toLocaleString('ko-KR',{maximumFractionDigits:0})
const money=(v:number)=>(v/1e6).toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1})
const pct=(v:number|null)=>v===null?'—':(Math.round(v*1000)/10).toFixed(1)+'%'

function ChannelTrend({values,labels,mode}:{values:number[];labels:string[];mode:'q'|'a'}) {
  const W=700,H=152,L=24,T=24,B=28,lo=Math.min(0,...values),hi=Math.max(1,...values)
  const y=(v:number)=>T+(hi-v)/(hi-lo)*(H-T-B),zero=y(0),gap=(W-L-12)/Math.max(values.length,1)
  return <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`선택 채널 최근 12주 ${mode==='q'?'판매수량':'순매출'}`}>
    <line x1={L} y1={zero} x2={W-8} y2={zero} stroke="#deddd5"/>
    {values.map((v,i)=><g key={labels[i]}><rect x={L+i*gap+gap*.15} y={Math.min(y(v),zero)} width={gap*.7} height={Math.abs(y(v)-zero)} fill={v<0?'#c04a32':'#586650'}/><text x={L+i*gap+gap*.5} y={v>=0?y(v)-5:y(v)+12} textAnchor="middle">{mode==='q'?qty(v):money(v)}</text><text x={L+i*gap+gap*.5} y={H-7} textAnchor="middle">{labels[i]}</text></g>)}
  </svg>
}

export function ChannelBreakdownView({data,initialMode}:{data:WeeklyChannelData;initialMode:'q'|'a'}) {
  const [channel,setChannel]=useState(''),[chartMode,setChartMode]=useState(initialMode)
  const selected=data.channels.find(c=>c.channel===channel)||data.channels[0]
  const hasReturns=data.channels.some(c=>c.revenue<0)
  const totalRevenue=data.channels.reduce((a,c)=>a+c.revenue,0)
  if(!data.channels.length)return <div className={s.channelEmpty}>선택 마감일까지 기록된 채널 판매 실적이 없습니다.</div>
  return <>
    <div className={s.channelHeading}><div><h3>판매채널별 실적</h3><p>누적: 2025.01.01 — {data.asOf} · 기준주: {data.weekStart} — {data.asOf}</p></div><span>순매출 · VAT 제외</span></div>
    <div className={s.channelTableWrap}><table className={s.channelTable}>
      <thead><tr><th scope="col">판매채널</th><th scope="col">누적 매출<small>백만원</small></th><th scope="col">판매수량<small>개</small></th><th scope="col">매출 비중</th><th scope="col" title="1 − 누적 순매출 × 1.1 ÷ 판매 당시 정상가 금액">할인율</th><th scope="col">기준주 매출<small>백만원</small></th><th scope="col">전주 대비<small>매출 기준</small></th></tr></thead>
      <tbody>{data.channels.map(c=><tr key={c.channel} className={selected?.channel===c.channel?s.channelSelected:''}>
        <th scope="row"><button onClick={()=>setChannel(c.channel)} aria-pressed={selected?.channel===c.channel}>{c.channel}</button></th>
        <td className={c.revenue<0?s.warning:''}>{money(c.revenue)}</td><td>{qty(c.qty)}</td>
        <td><span>{pct(c.revenueShare)}</span><div className={s.shareTrack}><i style={{width:`${Math.min(100,Math.max(0,(c.revenueShare??0)*100))}%`}}/></div></td>
        <td>{pct(c.discountRate)}</td><td>{money(c.weekRevenue)}</td>
        <td className={c.wow!==null?(c.wow<0?s.warning:c.wow>0?s.up:''):''} title={`전주 ${money(c.previousRevenue)}백만원`}>{c.wow===null?'—':`${c.wow>0?'+':''}${pct(c.wow)}`}</td>
      </tr>)}</tbody>
    </table></div>
    <p className={s.channelNote}>채널명을 누르면 아래 추이가 바뀝니다. 할인율은 누적 실질할인율입니다. 전주 매출이 0 이하이면 전주 대비는 ‘—’로 표시합니다.{totalRevenue<=0?' 전체 순매출이 0 이하이므로 매출 비중은 계산하지 않습니다.':hasReturns?' 반품이 포함되어 채널 비중이 음수이거나 100%를 넘을 수 있습니다.':''}</p>
    {selected&&<section className={s.channelTrend}><div className={s.channelHeading}><h3>{selected.channel} · 주간 추이</h3><div className={s.channelMode} role="group" aria-label="채널 추이 표시 기준"><button aria-pressed={chartMode==='q'} className={chartMode==='q'?s.active:''} onClick={()=>setChartMode('q')}>판매수량</button><button aria-pressed={chartMode==='a'} className={chartMode==='a'?s.active:''} onClick={()=>setChartMode('a')}>순매출</button></div></div><ChannelTrend values={selected.weeks.map(w=>chartMode==='q'?w.qty:w.revenue)} labels={data.weeks.map(w=>w.label)} mode={chartMode}/><p className={s.channelNote}>{chartMode==='q'?'단위: 개':'단위: 백만원'} · 음수는 반품을 포함한 순실적입니다.</p></section>}
  </>
}

export default function ChannelBreakdown({brand,style,asOf,mode}:{brand:string;style:string;asOf:string;mode:'q'|'a'}) {
  const [data,setData]=useState<WeeklyChannelData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0)
  useEffect(()=>{
    const controller=new AbortController();setData(null);setLoading(true);setError('')
    const params=new URLSearchParams({brand,style,asOf})
    fetch('/api/planning/weekly-report/channels?'+params,{signal:controller.signal}).then(async res=>{const json=await res.json();if(!res.ok)throw Error(json.error||'판매채널 조회 실패');return json as WeeklyChannelData})
      .then(value=>{if(!controller.signal.aborted)setData(value)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[brand,style,asOf,retry])
  if(loading)return <div className={s.channelEmpty} role="status">판매채널별 실적을 조회하고 있습니다…</div>
  if(error)return <div className={s.channelError} role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>다시 조회</button></div>
  return data?<ChannelBreakdownView key={`${brand}|${style}|${asOf}`} data={data} initialMode={mode}/>:null
}
