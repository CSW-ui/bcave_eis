'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTargetData } from '@/hooks/useTargetData'
import Link from 'next/link'
import { Upload } from 'lucide-react'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,  Bar,
} from 'recharts'
import { cn } from '@/lib/utils'
import { BRAND_COLORS_KR, brandNameToCode } from '@/lib/constants'
import { fmtW } from '@/lib/formatters'
import { getChannelGroup } from '@/lib/sales-types'

const normBrand = (s: string) => s.replace(/\s+/g, '').toLowerCase()
const BRAND_COLORS = BRAND_COLORS_KR

// 목표 데이터의 shoptypenm을 region 기준으로 필터
function matchTargetRegion(shoptypenm: string | undefined, region: Region): boolean {
  if (region === 'all') return true
  if (!shoptypenm) return true // shoptypenm 없으면 전체로 간주
  const group = getChannelGroup(shoptypenm)
  if (region === 'domestic') return group !== '해외'
  if (region === 'online') return group === '온라인'
  if (region === 'offline') return group === '오프라인'
  if (region === 'overseas') return group === '해외'
  return true
}

type Region = 'all' | 'domestic' | 'overseas' | 'online' | 'offline'

export default function DashboardPage() {
  const { targets } = useTargetData()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [region, setRegion] = useState<Region>('all')

  const fetchData = useCallback(async (r: Region) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?region=${r}`)
      const j = await res.json()
      setData(j)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(region) }, [region, fetchData])


  const handleRegion = (r: Region) => {
    if (r === region) return
    setRegion(r)
  }

  // 지역 필터된 목표 합계
  const getFilteredMonthlyTarget = useCallback((yyyymm: string): number => {
    return targets
      .filter(t => t.yyyymm === yyyymm && matchTargetRegion(t.shoptypenm, region))
      .reduce((sum, t) => sum + t.target, 0)
  }, [targets, region])

  // 차트 데이터: 전년 / 목표 / 달성
  const chartData = useMemo(() => {
    if (!data?.monthly) return []
    return data.monthly.map((m: any) => {
      const uploaded = getFilteredMonthlyTarget(m.yyyymm)
      return {
        month: m.month,
        actual: m.actual || undefined,
        lastYear: m.lastYear || undefined,
        target: uploaded > 0 ? uploaded : undefined,
        cost: m.cost || undefined,
        lyCost: m.lyCost || undefined,
        cogsRate: m.cogsRate ?? null,
        lyCogsRate: m.lyCogsRate ?? null,
        dcRate: m.dcRate ?? null,
        lyDcRate: m.lyDcRate ?? null,
      }
    })
  }, [data, targets, region, getFilteredMonthlyTarget])

  // 브랜드별 금월 목표 vs 달성
  const brandMonthData = useMemo(() => {
    if (!data?.brandMonth || !data?.kpi) return []
    const curMonth = data.kpi.curMonth
    const yyyymm = `${data.kpi.curYear}${String(curMonth).padStart(2, '0')}`

    return (data.brandMonth as { brand: string; cmRev: number }[]).map(b => {
      const bCode = brandNameToCode(b.brand)
      const bNorm = normBrand(b.brand)
      const brandTarget = targets
        .filter(t => {
          if (t.yyyymm !== yyyymm) return false
          if (!matchTargetRegion(t.shoptypenm, region)) return false
          const tCode = brandNameToCode(t.brandnm)
          if (bCode && tCode && bCode === tCode) return true
          if (normBrand(t.brandnm) === bNorm) return true
          return false
        })
        .reduce((sum, t) => sum + t.target, 0)
      const pct = brandTarget > 0 ? Math.round((b.cmRev / brandTarget) * 100) : 0
      return { brand: b.brand, actual: b.cmRev, target: brandTarget || undefined, pct }
    })
  }, [data, targets, region])

  return (
    <div className="space-y-4 p-4 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">비케이브 전체 사업 현황</p>
        </div>
        <div className="flex items-center gap-3">
          {targets.length > 0 ? (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              목표 데이터 적용됨
            </span>
          ) : (
            <Link href="/admin"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-accent border border-surface-border hover:border-brand-accent/50 px-3 py-1.5 rounded-full transition-all">
              <Upload size={12} /> 목표매출 업로드
            </Link>
          )}
          <span className="text-[10px] text-gray-400">전일마감기준</span>
          <span className="w-px h-3 bg-gray-200" />
          <span className="text-[10px] text-gray-400">Snowflake</span>
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* 국내/해외 토글 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {([['all', '전체'], ['domestic', '국내'], ['online', '온라인'], ['offline', '오프라인'], ['overseas', '해외']] as [Region, string][]).map(([key, label]) => (
            <button key={key}
              onClick={() => handleRegion(key)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md font-medium transition-all',
                region === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* YTD 누적 KPI */}
      {!loading && data?.ytd && (() => {
        const y = data.ytd
        // 달성률: 전월 마감까지 목표 합산
        const curMonth = data.kpi?.curMonth ?? 1
        const achTarget = (() => {
          let total = 0
          for (let m = 1; m < curMonth; m++) {
            const yyyymm = `${data.kpi?.curYear}${String(m).padStart(2, '0')}`
            total += getFilteredMonthlyTarget(yyyymm)
          }
          return total
        })()
        const achPct = achTarget > 0 ? Math.round(y.achRev / achTarget * 100) : null
        const cogsChg = Math.round((y.cogsRate - y.lyCogsRate) * 10) / 10
        const dcChg = Math.round((y.dcRate - y.lyDcRate) * 10) / 10
        const nc = data?.normCo
        const ptFmt = (d: number) => d === 0 ? '0p' : `${d > 0 ? '+' : ''}${d}p`
        const ptCls = (d: number, lowerBetter = false) => d === 0 ? 'text-gray-400' : (lowerBetter ? (d < 0 ? 'text-emerald-600' : 'text-red-500') : (d > 0 ? 'text-emerald-600' : 'text-red-500'))

        return (
          <div className={cn('grid gap-3', achPct !== null ? 'grid-cols-5' : 'grid-cols-4')}>
            {/* YTD 매출 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">YTD 매출</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{fmtW(y.rev)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전년동기 {fmtW(y.lyRev)}</p>
              <span className={cn('text-[10px] font-semibold', y.yoy >= 0 ? 'text-emerald-600' : 'text-red-500')}>{y.yoy >= 0 ? '+' : ''}{y.yoy}%</span>
            </div>
            {/* 달성률 */}
            {achPct !== null && (
              <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{curMonth - 1}월까지 달성률</p>
                <p className={cn('text-xl font-bold mt-1', achPct >= 90 ? 'text-emerald-600' : 'text-red-500')}>{achPct}%</p>
                <p className="text-[10px] text-gray-500 mt-0.5">목표 {fmtW(achTarget)}</p>
                <span className="text-[10px] text-gray-500">달성 {fmtW(y.achRev)}</span>
              </div>
            )}
            {/* 정상/이월 비중 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">정상/이월 비중</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{nc?.normRatio ?? 0}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전년동기 {nc?.lyNormRatio ?? 0}%</p>
              <span className={cn('text-[10px] font-semibold', ptCls(Math.round(((nc?.normRatio ?? 0) - (nc?.lyNormRatio ?? 0)) * 10) / 10))}>{ptFmt(Math.round(((nc?.normRatio ?? 0) - (nc?.lyNormRatio ?? 0)) * 10) / 10)}</span>
              <p className="text-[9px] text-gray-400 mt-1">정상 {fmtW(nc?.normRev ?? 0)} · 이월 {fmtW(nc?.coRev ?? 0)}</p>
            </div>
            {/* YTD 매출원가율 + 정상/이월 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">YTD 매출원가율</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{y.cogsRate}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전년동기 {y.lyCogsRate}%</p>
              <span className={cn('text-[10px] font-semibold', ptCls(cogsChg, true))}>{ptFmt(cogsChg)}</span>
              {nc && (
                <p className="text-[9px] text-gray-400 mt-1 border-t border-gray-100 pt-1">
                  정상 <span className="text-gray-600 font-semibold">{nc.normCogsRate}%</span> · 이월 <span className="text-gray-600 font-semibold">{nc.coCogsRate}%</span>
                </p>
              )}
            </div>
            {/* YTD 할인율 + 정상/이월 */}
            <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">YTD 할인율</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{y.dcRate}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전년동기 {y.lyDcRate}%</p>
              <span className={cn('text-[10px] font-semibold', ptCls(dcChg, true))}>{ptFmt(dcChg)}</span>
              {nc && (
                <p className="text-[9px] text-gray-400 mt-1 border-t border-gray-100 pt-1">
                  정상 <span className="text-gray-600 font-semibold">{nc.normDcRate}%</span> · 이월 <span className="text-gray-600 font-semibold">{nc.coDcRate}%</span>
                </p>
              )}
            </div>
          </div>
        )
      })()}


      {/* 차트 영역 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 월별 매출 추이 */}
        <div className="col-span-2 bg-white rounded-xl border border-surface-border shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              월별 매출 추이 <span className="text-xs font-normal text-gray-400 ml-1">({region === 'all' ? '전체' : region === 'domestic' ? '국내' : region === 'online' ? '온라인' : region === 'offline' ? '오프라인' : '해외'})</span>
            </h3>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-400 inline-block" style={{ borderTop: '2px dashed #9ca3af' }} />{data?.kpi?.curYear - 1}년 (전년)</span>
              {targets.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block" style={{ borderTop: '2px dashed #6366f1' }} />{data?.kpi?.curYear}년 목표</span>}
              <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-[#e91e63] inline-block rounded-sm opacity-85" />{data?.kpi?.curYear}년 달성</span>
            </div>
          </div>
          {loading ? <div className="h-52 bg-surface-subtle animate-pulse rounded-lg" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tickFormatter={v => fmtW(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} width={55} />
                <Tooltip
                  formatter={(v, name) => [fmtW(Number(v)), String(name)]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="actual" name="달성" fill="#e91e63" radius={[4, 4, 0, 0]} barSize={24} fillOpacity={0.85} />
                <Line type="monotone" dataKey="lastYear" name="전년" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2.5, fill: '#9ca3af' }} connectNulls />
                {targets.length > 0 && (
                  <Line type="monotone" dataKey="target" name="목표" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} connectNulls />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
          {/* 월별 상세 테이블 */}
          {!loading && chartData.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-t border-gray-100">
                    <th className="py-1.5 px-1 text-left text-gray-400 font-medium w-[72px] whitespace-nowrap">월</th>
                    {chartData.map((d: any) => (
                      <th key={d.month} className="py-1.5 px-1 text-center text-gray-500 font-semibold">{d.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {targets.length > 0 && (
                    <tr className="border-t border-gray-50">
                      <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">목표</td>
                      {chartData.map((d: any) => (
                        <td key={d.month} className="py-1 px-1 text-center text-violet-600">{d.target ? fmtW(d.target) : '—'}</td>
                      ))}
                    </tr>
                  )}
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">달성</td>
                    {chartData.map((d: any) => (
                      <td key={d.month} className="py-1 px-1 text-center font-semibold text-gray-800">{d.actual ? fmtW(d.actual) : '—'}</td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">전년</td>
                    {chartData.map((d: any) => (
                      <td key={d.month} className="py-1 px-1 text-center text-gray-500">{d.lastYear ? fmtW(d.lastYear) : '—'}</td>
                    ))}
                  </tr>
                  {targets.length > 0 && (
                    <tr className="border-t border-gray-50">
                      <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">달성률</td>
                      {chartData.map((d: any) => {
                        const pct = d.target && d.actual ? Math.round((d.actual / d.target) * 100) : null
                        return (
                          <td key={d.month} className={cn('py-1 px-1 text-center font-semibold',
                            pct === null ? 'text-gray-300' : pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'
                          )}>
                            {pct !== null ? `${pct}%` : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  )}
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">신장률</td>
                    {chartData.map((d: any) => {
                      // 당월은 전년 동기간(lyRev) 기준으로 비교
                      const isCurMonth = d.month === `${String(data?.kpi?.curMonth).padStart(2, '0')}월`
                      const lyBase = isCurMonth && data?.kpi?.lyRev ? data.kpi.lyRev : d.lastYear
                      const growth = lyBase && d.actual ? Math.round(((d.actual - lyBase) / lyBase) * 100) : null
                      return (
                        <td key={d.month} className={cn('py-1 px-1 text-center font-medium',
                          growth === null ? 'text-gray-300' : growth >= 0 ? 'text-red-500' : 'text-blue-500'
                        )}>
                          {growth !== null ? `${growth >= 0 ? '+' : ''}${growth}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">매출원가율</td>
                    {chartData.map((d: any) => (
                      <td key={d.month} className="py-1 px-1 text-center text-gray-600">{d.cogsRate != null ? `${d.cogsRate}%` : '—'}</td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">전년비</td>
                    {chartData.map((d: any) => {
                      const chg = d.cogsRate != null && d.lyCogsRate != null ? Math.round((d.cogsRate - d.lyCogsRate) * 10) / 10 : null
                      return (
                        <td key={d.month} className={cn('py-1 px-1 text-center font-medium',
                          chg === null ? 'text-gray-300' : chg > 0 ? 'text-red-500' : chg < 0 ? 'text-blue-500' : 'text-gray-400'
                        )}>
                          {chg !== null ? `${chg > 0 ? '+' : ''}${chg}%p` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">할인율</td>
                    {chartData.map((d: any) => (
                      <td key={d.month} className="py-1 px-1 text-center text-gray-600">
                        {d.dcRate != null ? `${d.dcRate}%` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-gray-50">
                    <td className="py-1 px-1 text-gray-400 font-medium whitespace-nowrap">전년비</td>
                    {chartData.map((d: any) => {
                      const chg = d.dcRate != null && d.lyDcRate != null ? Math.round((d.dcRate - d.lyDcRate) * 10) / 10 : null
                      return (
                        <td key={d.month} className={cn('py-1 px-1 text-center font-medium',
                          chg === null ? 'text-gray-300' : chg > 0 ? 'text-red-500' : chg < 0 ? 'text-blue-500' : 'text-gray-400'
                        )}>
                          {chg !== null ? `${chg > 0 ? '+' : ''}${chg}%p` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 브랜드별 금월 목표 vs 달성 */}
        <div className="col-span-1 bg-white rounded-xl border border-surface-border shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            브랜드별 {data?.kpi?.curMonth ?? ''}월 목표 달성현황
            <span className="text-xs font-normal text-gray-400 ml-1">({region === 'all' ? '전체' : region === 'domestic' ? '국내' : region === 'online' ? '온라인' : region === 'offline' ? '오프라인' : '해외'})</span>
          </h3>
          {loading ? <div className="h-64 bg-surface-subtle animate-pulse rounded-lg" /> : (
            <div className="space-y-4">
              {brandMonthData.map(b => {
                const pctClamped = Math.min(b.pct, 100)
                const pctColor = b.pct >= 90 ? 'bg-emerald-500' : b.pct >= 70 ? 'bg-amber-500' : 'bg-red-500'
                const pctTextColor = b.pct >= 90 ? 'text-emerald-600' : b.pct >= 70 ? 'text-amber-600' : 'text-red-500'

                return (
                  <div key={b.brand}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND_COLORS[b.brand] ?? '#999' }} />
                        <span className="text-xs font-semibold text-gray-800">{b.brand}</span>
                      </div>
                      <span className={cn('text-sm font-bold', pctTextColor)}>
                        {b.target ? `${b.pct}%` : '—'}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', pctColor)}
                        style={{ width: b.target ? `${pctClamped}%` : '0%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500">달성 {fmtW(b.actual)}</span>
                      <span className="text-[10px] text-gray-400">
                        {b.target ? `목표 ${fmtW(b.target)}` : '목표 미설정'}
                      </span>
                    </div>
                  </div>
                )
              })}
              {brandMonthData.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">데이터 없음</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 재고 현황 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          재고 현황
          <span className="text-xs font-normal text-gray-400 ml-1">
            ({region === 'all' ? '전체' : region === 'domestic' ? '국내' : region === 'online' ? '온라인' : region === 'offline' ? '오프라인' : '해외'})
            · TAG(VAT제외) 기준 · 단위: 백만원
          </span>
        </h3>
        {loading ? <div className="h-20 bg-surface-subtle animate-pulse rounded-lg" /> : (
          (() => {
            const rows = data?.invTable ?? []
            if (rows.length === 0) return <div className="text-center py-8 text-xs text-gray-400">데이터 없음</div>

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 font-semibold text-center">
                      <th rowSpan={2} className="py-1.5 px-2 text-left border-r border-gray-100">구분</th>
                      <th colSpan={3} className="py-1 px-1 border-r border-gray-100">기초</th>
                      <th colSpan={3} className="py-1 px-1 border-r border-gray-100">입고</th>
                      <th colSpan={3} className="py-1 px-1 border-r border-gray-100">판매</th>
                      <th colSpan={3} className="py-1 px-1 border-r border-gray-100">실매출</th>
                      <th colSpan={3} className="py-1 px-1">잔여</th>
                    </tr>
                    <tr className="border-b border-gray-200 text-gray-400 font-medium text-center">
                      <th className="py-1 px-1">TAG</th>
                      <th className="py-1 px-1">원가</th>
                      <th className="py-1 px-1 border-r border-gray-100">수량</th>
                      <th className="py-1 px-1">TAG</th>
                      <th className="py-1 px-1">원가</th>
                      <th className="py-1 px-1 border-r border-gray-100">수량</th>
                      <th className="py-1 px-1">TAG</th>
                      <th className="py-1 px-1">수량</th>
                      <th className="py-1 px-1 border-r border-gray-100 text-pink-600">판매율</th>
                      <th className="py-1 px-1">금액</th>
                      <th className="py-1 px-1">할인율</th>
                      <th className="py-1 px-1 border-r border-gray-100">원가율</th>
                      <th className="py-1 px-1">TAG</th>
                      <th className="py-1 px-1">원가</th>
                      <th className="py-1 px-1">수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i: number) => (
                      <tr key={r.year} className={cn('border-b border-gray-50 text-center', i === 0 && 'bg-pink-50/30 font-semibold')}>
                        <td className="py-2 px-2 text-left font-bold text-gray-900 border-r border-gray-100">{r.year}</td>
                        <td className="py-2 px-1 text-right text-gray-700">{r.baseTag > 0 ? fmtW(r.baseTag) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500">{r.baseCost > 0 ? fmtW(r.baseCost) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500 border-r border-gray-100">{r.baseQty > 0 ? r.baseQty.toLocaleString() : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-700">{r.inTag > 0 ? fmtW(r.inTag) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500">{r.inCost > 0 ? fmtW(r.inCost) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500 border-r border-gray-100">{r.inQty > 0 ? r.inQty.toLocaleString() : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-700">{r.saleTag > 0 ? fmtW(r.saleTag) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500">{r.saleQty > 0 ? r.saleQty.toLocaleString() : '—'}</td>
                        {(() => {
                          const total = (r.baseTag > 0 ? r.baseTag : 0) + (r.inTag > 0 ? r.inTag : 0)
                          const sellRate = total > 0 ? Math.round(r.saleTag / total * 1000) / 10 : null
                          return <td className="py-2 px-1 text-right font-bold text-pink-600 border-r border-gray-100">{sellRate != null ? `${sellRate}%` : '—'}</td>
                        })()}
                        <td className="py-2 px-1 text-right font-semibold text-gray-900">{r.saleAmt > 0 ? fmtW(r.saleAmt) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-600">{r.dcRate > 0 ? `${r.dcRate}%` : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-600 border-r border-gray-100">{r.cogsRate > 0 ? `${r.cogsRate}%` : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-700">{r.remTag > 0 ? fmtW(r.remTag) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500">{r.remCost > 0 ? fmtW(r.remCost) : '—'}</td>
                        <td className="py-2 px-1 text-right text-gray-500">{r.remQty > 0 ? r.remQty.toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {(() => {
                      const t = rows.reduce((a: any, r: any) => ({
                        baseTag: a.baseTag + (r.baseTag > 0 ? r.baseTag : 0),
                        baseCost: a.baseCost + (r.baseCost > 0 ? r.baseCost : 0),
                        baseQty: a.baseQty + (r.baseQty > 0 ? r.baseQty : 0),
                        inTag: a.inTag + (r.inTag > 0 ? r.inTag : 0),
                        inCost: a.inCost + (r.inCost > 0 ? r.inCost : 0),
                        inQty: a.inQty + (r.inQty > 0 ? r.inQty : 0),
                        saleTag: a.saleTag + (r.saleTag > 0 ? r.saleTag : 0),
                        saleQty: a.saleQty + (r.saleQty > 0 ? r.saleQty : 0),
                        saleAmt: a.saleAmt + (r.saleAmt > 0 ? r.saleAmt : 0),
                        remTag: a.remTag + (r.remTag > 0 ? r.remTag : 0),
                        remCost: a.remCost + (r.remCost > 0 ? r.remCost : 0),
                        remQty: a.remQty + (r.remQty > 0 ? r.remQty : 0),
                      }), { baseTag:0, baseCost:0, baseQty:0, inTag:0, inCost:0, inQty:0, saleTag:0, saleQty:0, saleAmt:0, remTag:0, remCost:0, remQty:0 })
                      const totalInv = t.baseTag + t.inTag
                      const sellRate = totalInv > 0 ? Math.round(t.saleTag / totalInv * 1000) / 10 : null
                      return (
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold text-center">
                          <td className="py-2 px-2 text-left text-gray-900 border-r border-gray-100">합계</td>
                          <td className="py-2 px-1 text-right text-gray-900">{fmtW(t.baseTag)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">{fmtW(t.baseCost)}</td>
                          <td className="py-2 px-1 text-right text-gray-600 border-r border-gray-100">{t.baseQty.toLocaleString()}</td>
                          <td className="py-2 px-1 text-right text-gray-900">{fmtW(t.inTag)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">{fmtW(t.inCost)}</td>
                          <td className="py-2 px-1 text-right text-gray-600 border-r border-gray-100">{t.inQty.toLocaleString()}</td>
                          <td className="py-2 px-1 text-right text-gray-900">{fmtW(t.saleTag)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">{t.saleQty.toLocaleString()}</td>
                          <td className="py-2 px-1 text-right font-bold text-pink-600 border-r border-gray-100">{sellRate != null ? `${sellRate}%` : '—'}</td>
                          <td className="py-2 px-1 text-right text-gray-900">{fmtW(t.saleAmt)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">—</td>
                          <td className="py-2 px-1 text-right text-gray-600 border-r border-gray-100">—</td>
                          <td className="py-2 px-1 text-right text-gray-900">{fmtW(t.remTag)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">{fmtW(t.remCost)}</td>
                          <td className="py-2 px-1 text-right text-gray-600">{t.remQty.toLocaleString()}</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}
