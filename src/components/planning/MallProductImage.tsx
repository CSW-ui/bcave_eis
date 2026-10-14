'use client'
import {useEffect,useRef,useState} from 'react'
import type {ProductImage} from '@/lib/planning-product-images'
import s from '@/app/(dashboard)/planning/weekly-report/weekly-report.module.css'
const imageCache=new Map<string,ProductImage>()
let runningImages=0
const imageJobs:Array<()=>void>=[]
function queueImage(job:()=>Promise<ProductImage>):Promise<ProductImage> {
  return new Promise((resolve,reject)=>{const run=()=>{runningImages++;job().then(resolve,reject).finally(()=>{runningImages--;imageJobs.shift()?.()})};if(runningImages<3)run();else imageJobs.push(run)})
}
export default function MallImage({product,color,large=false}:{product:{brand:string;style:string;name:string};color:string;large?:boolean}) {
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
