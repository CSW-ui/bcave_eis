'use client'

import { useState, useCallback, useEffect } from 'react'
import { Download, Bot, ChevronDown, ChevronRight, Save, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_COLORS } from '@/lib/constants'
import { fmtW, fmtToday } from '@/lib/formatters'
import { useAuth } from '@/contexts/AuthContext'
import * as XLSX from 'xlsx'

const BRAND_TABS = [
  { label: '커버낫', value: 'CO' }, { label: '리(Lee)', value: 'LE' },
  { label: '와키윌리', value: 'WA' }, { label: '커버낫 키즈', value: 'CK' }, { label: 'Lee Kids', value: 'LK' },
]
const GRADES = ['A', 'B', 'C', 'D']
const WEEKDAYS = ['일','월','화','수','목','금','토']

export default function ReplenishmentPage() {
  const { allowedBrands } = useAuth()
  const defaultBrand = allowedBrands?.length === 1 ? allowedBrands[0] : 'CO'
  const [brand, setBrand] = useState(defaultBrand)
  const [tab, setTab] = useState<'replenishment' | 'grades'>('replenishment')

  // 출고 현황
  const [data, setData] = useState<any>(null)
  const [expandedShop, setExpandedShop] = useState<string | null>(null)

  // 매장등급
  const [shops, setShops] = useState<any[]>([])
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeSaving, setGradeSaving] = useState(false)
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [gradeSearch, setGradeSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  const visibleBrands = allowedBrands
    ? BRAND_TABS.filter(b => allowedBrands.includes(b.value))
    : BRAND_TABS

  // 페이지 로드 시 기존 결과 자동 조회
  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const res = await fetch(`/api/replenishment/results?brand=${brand}&date=${today}`)
        const json = await res.json()
        if (json.shops?.length > 0) {
          setData({ kpi: json.kpi, shops: json.shops, days: json.days, aiSummary: '', savedCount: json.kpi.skuCount })
        }
      } catch {}
    })()
  }, [brand])

  // (자동 실행으로 전환: 수동 calculate 제거)

  // 매장 목록 로드
  const loadShops = useCallback(async () => {
    setGradeLoading(true)
    try {
      const res = await fetch(`/api/replenishment/shops?brand=${brand}`)
      const json = await res.json()
      setShops(json.shops ?? [])
      setDirty(false)
    } catch {}
    finally { setGradeLoading(false) }
  }, [brand])

  useEffect(() => { if (tab === 'grades') loadShops() }, [tab, brand])

  // 등급 변경
  const changeGrade = (shopCd: string, grade: string) => {
    setShops(prev => prev.map(s => s.shopCd === shopCd ? { ...s, grade } : s))
    setDirty(true)
  }

  // 등급 저장
  const saveGrades = async () => {
    setGradeSaving(true)
    try {
      const res = await fetch('/api/replenishment/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, grades: shops.map(s => ({ shopCd: s.shopCd, grade: s.grade })) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setDirty(false)
      alert(`${json.saved}개 매장 등급 저장 완료`)
    } catch (e) { alert('저장 실패: ' + String(e)) }
    finally { setGradeSaving(false) }
  }

  // 엑셀 다운로드
  const downloadExcel = () => {
    if (!data?.shops) return
    const rows: any[] = []
    for (const shop of data.shops) {
      for (const item of shop.items) {
        rows.push({
          '매장코드': item.shopCd, '매장명': item.shopNm, '매장유형': item.shopType,
          '지역': item.area, '등급': item.grade, '상품코드': item.styleCd,
          '상품명': item.styleNm, '컬러': item.colorCd, '사이즈': item.sizeCd,
          '정가': item.tagPrice, '7일판매': item.totalQty7d, '일평균': item.dailyAvg,
          '현재고': item.currentInv, '목표재고': item.targetInv,
          '출고추천': item.recommended, '출고금액': item.amount,
        })
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '출고지시서')
    XLSX.writeFile(wb, `출고지시서_${brand}_${fmtToday().replace(/\./g,'')}.xlsx`)
  }

  const today = new Date()
  const dayLabel = `${fmtToday()} (${WEEKDAYS[today.getDay()]})`

  // 매장등급 필터링
  const shopTypes = Array.from(new Set(shops.map(s => s.shopType).filter(Boolean))).sort()

  const filteredShops = shops.filter(s => {
    if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false
    if (typeFilter !== 'all' && s.shopType !== typeFilter) return false
    if (gradeSearch && !s.shopNm.toLowerCase().includes(gradeSearch.toLowerCase()) && !s.shopCd.includes(gradeSearch)) return false
    return true
  })

  // 등급별 카운트
  const gradeCounts = GRADES.reduce((acc, g) => ({ ...acc, [g]: shops.filter(s => s.grade === g).length }), {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-4 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bot size={20} className="text-purple-500" />
            보충출고 자동화
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {dayLabel} · AI 기반 수요 예측
            {data?.savedCount ? ` · ${data.savedCount}개 SKU 분석 완료` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {visibleBrands.map(b => (
              <button key={b.value} onClick={() => { setBrand(b.value); setData(null) }}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px" style={{ background: BRAND_COLORS[b.value] }} />
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-surface-subtle rounded-lg p-0.5 w-fit">
        <button onClick={() => setTab('replenishment')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
            tab === 'replenishment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Bot size={13} /> 출고 현황
        </button>
        <button onClick={() => setTab('grades')}
          className={cn('flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-colors',
            tab === 'grades' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Settings size={13} /> 매장등급 설정
        </button>
      </div>

      {/* ── 출고 현황 탭 ── */}
      {tab === 'replenishment' && (
        <>
          {!data ? (
            <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
              <div className="flex flex-col items-center py-16">
                <Bot size={48} className="text-gray-200 mb-4" />
                <h2 className="text-sm font-semibold text-gray-500 mb-1">오늘의 보충출고 결과가 없습니다</h2>
                <p className="text-xs text-gray-400 text-center">매일 새벽 AI가 자동으로 보충 수량을 계산합니다<br />결과는 오전 출근 시 자동으로 표시됩니다</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { title: '대상 매장', value: `${data.kpi.shopCount}개`, color: '' },
                  { title: '대상 SKU', value: `${data.kpi.skuCount}개`, color: '' },
                  { title: '출고예정 수량', value: data.kpi.totalQty.toLocaleString(), color: 'text-purple-700' },
                  { title: '출고예정 금액', value: fmtW(data.kpi.totalAmt), color: 'text-blue-700' },
                  { title: '결품 SKU', value: `${data.kpi.stockoutCount ?? 0}개`, color: 'text-red-600' },
                ].map(k => (
                  <div key={k.title} className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{k.title}</p>
                    <p className={cn('text-xl font-bold mt-1', k.color || 'text-gray-900')}>{k.value}</p>
                  </div>
                ))}
              </div>

              {data.aiSummary && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot size={14} className="text-purple-500" />
                    <span className="text-xs font-semibold text-purple-700">AI 분석 요약</span>
                  </div>
                  <div className="text-xs text-purple-800 leading-relaxed whitespace-pre-line">{
                (data.aiSummary || '').replace(/#{1,3}\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim()
              }</div>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button onClick={downloadExcel}
                  className="flex items-center gap-1.5 text-xs font-medium bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                  <Download size={14} /> 출고지시서 다운로드
                </button>
              </div>

              <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-surface-border bg-surface-subtle">
                  <h3 className="text-xs font-semibold text-gray-700">매장별 보충출고 현황</h3>
                </div>
                <div className="overflow-auto" style={{ maxHeight: 600 }}>
                  <table className="w-full text-[11px] border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                        <th className="text-left px-3 py-2 w-6" />
                        <th className="text-left px-2 py-2">매장명</th>
                        <th className="text-center px-2 py-2">유형</th>
                        <th className="text-center px-2 py-2">지역</th>
                        <th className="text-center px-2 py-2">등급</th>
                        <th className="text-right px-2 py-2">출고 SKU</th>
                        <th className="text-right px-2 py-2">출고 수량</th>
                        <th className="text-right px-2 py-2">출고 금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.shops.map((shop: any, i: number) => {
                        const isExp = expandedShop === shop.shopCd
                        return [
                          <tr key={shop.shopCd} onClick={() => setExpandedShop(isExp ? null : shop.shopCd)}
                            className={cn('border-b border-surface-border/50 cursor-pointer transition-colors',
                              isExp ? 'bg-purple-50/50' : i % 2 === 0 ? 'bg-white hover:bg-surface-subtle' : 'bg-gray-50/30 hover:bg-surface-subtle')}>
                            <td className="px-3 py-2">
                              {isExp ? <ChevronDown size={12} className="text-purple-500" /> : <ChevronRight size={12} className="text-gray-400" />}
                            </td>
                            <td className="px-2 py-2 font-medium text-gray-800">{shop.shopNm}</td>
                            <td className="px-2 py-2 text-center text-gray-500">{shop.shopType}</td>
                            <td className="px-2 py-2 text-center text-gray-500">{shop.area}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                                shop.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                                shop.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                                shop.grade === 'C' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600')}>
                                {shop.grade}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-gray-700">{shop.skuCount}</td>
                            <td className="px-2 py-2 text-right font-mono font-semibold text-purple-700">{shop.totalQty}</td>
                            <td className="px-2 py-2 text-right font-mono text-gray-700">{fmtW(shop.totalAmt)}</td>
                          </tr>,
                          isExp && (
                            <tr key={`${shop.shopCd}-detail`}>
                              <td colSpan={8} className="bg-purple-50/30 px-4 py-2">
                                <table className="w-full text-[10px]">
                                  <thead>
                                    <tr className="text-purple-600 font-medium border-b border-purple-100">
                                      <th className="text-left py-1 px-1">상품코드</th>
                                      <th className="text-left py-1 px-1">상품명</th>
                                      <th className="text-center py-1 px-1">컬러</th>
                                      <th className="text-center py-1 px-1">사이즈</th>
                                      {(data.days ?? ['','','','','','','']).map((d: string, di: number) => (
                                        <th key={di} className="text-right py-1 px-1 text-purple-400 font-normal text-[9px]">{d ? `${d.slice(0,2)}/${d.slice(2)}` : `D${di+1}`}</th>
                                      ))}
                                      <th className="text-right py-1 px-1">합계</th>
                                      <th className="text-right py-1 px-1">현재고</th>
                                      <th className="text-right py-1 px-1">목표재고</th>
                                      <th className="text-right py-1 px-1 font-bold">출고추천</th>
                                    <th className="text-left py-1 px-1">출고소스</th>
                                    <th className="text-left py-1 px-1">AI 근거</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {shop.items.map((item: any, j: number) => (
                                      <tr key={j} className="border-b border-purple-50 hover:bg-purple-50/50">
                                        <td className="py-1 px-1 font-mono text-gray-400">{item.styleCd}</td>
                                        <td className="py-1 px-1 text-gray-800 truncate max-w-[180px]">{item.styleNm}</td>
                                        <td className="py-1 px-1 text-center text-gray-500">{item.colorCd}</td>
                                        <td className="py-1 px-1 text-center text-gray-500">{item.sizeCd}</td>
                                        {(item.daily?.length ? item.daily : [0,0,0,0,0,0,0]).map((qty: number, di: number) => (
                                          <td key={di} className={cn('py-1 px-1 text-right font-mono text-[9px]',
                                            qty === 0 ? 'text-gray-300' : qty >= 5 ? 'text-purple-700 font-semibold' : 'text-gray-600')}>
                                            {qty || '-'}
                                          </td>
                                        ))}
                                        <td className="py-1 px-1 text-right font-mono text-gray-700 font-semibold">{item.totalQty7d ?? 0}</td>
                                        <td className="py-1 px-1 text-right font-mono text-gray-600">{item.currentInv}</td>
                                        <td className="py-1 px-1 text-right font-mono text-gray-600">{item.targetInv}</td>
                                        <td className="py-1 px-1 text-right font-mono font-bold text-purple-700">{item.recommended}</td>
                                      <td className="py-1 px-1 text-left">
                                        {item.source === 'rt' ? (
                                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                            RT {item.rtFrom}
                                          </span>
                                        ) : (
                                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                            창고
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1 px-1 text-left text-[9px] text-gray-500 max-w-[200px] truncate">
                                        {item.reason || ''}
                                      </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          ),
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── 매장등급 설정 탭 ── */}
      {tab === 'grades' && (
        <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border bg-surface-subtle flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-gray-700">매장등급 설정</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                등급별: A {gradeCounts.A ?? 0}개 · B {gradeCounts.B ?? 0}개 · C {gradeCounts.C ?? 0}개 · D {gradeCounts.D ?? 0}개
                {' '}· 총 {shops.length}개 매장
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <button onClick={saveGrades} disabled={gradeSaving}
                  className="flex items-center gap-1.5 text-xs font-medium bg-brand-accent text-white px-4 py-2 rounded-lg hover:bg-brand-accent-hover transition-colors disabled:opacity-50">
                  <Save size={13} /> {gradeSaving ? '저장 중...' : '등급 저장'}
                </button>
              )}
            </div>
          </div>

          {/* 필터 */}
          <div className="px-4 py-2 border-b border-surface-border flex items-center gap-3">
            <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
              <button onClick={() => setGradeFilter('all')}
                className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  gradeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>전체</button>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGradeFilter(g)}
                  className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                    gradeFilter === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>{g}</button>
              ))}
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-brand-accent">
              <option value="all">전체 유형</option>
              {shopTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" value={gradeSearch} onChange={e => setGradeSearch(e.target.value)}
              placeholder="매장명 검색..." className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-brand-accent" />
          </div>

          <div className="overflow-auto" style={{ maxHeight: 600 }}>
            {gradeLoading ? (
              <div className="p-4 space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-10 bg-surface-subtle animate-pulse rounded" />)}</div>
            ) : (
              <table className="w-full text-[12px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-surface-border text-gray-500 font-semibold">
                    <th className="text-left px-4 py-2">매장코드</th>
                    <th className="text-left px-3 py-2">매장명</th>
                    <th className="text-center px-3 py-2">유형</th>
                    <th className="text-center px-3 py-2">지역</th>
                    <th className="text-center px-3 py-2">등급</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map((shop, i) => (
                    <tr key={shop.shopCd} className={cn('border-b border-surface-border/50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <td className="px-4 py-2 font-mono text-gray-400">{shop.shopCd}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{shop.shopNm}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{shop.shopType}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{shop.area}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          {GRADES.map(g => (
                            <button key={g} onClick={() => changeGrade(shop.shopCd, g)}
                              className={cn('w-7 h-7 rounded-lg text-[11px] font-bold transition-all',
                                shop.grade === g
                                  ? g === 'A' ? 'bg-emerald-500 text-white shadow-sm'
                                    : g === 'B' ? 'bg-blue-500 text-white shadow-sm'
                                    : g === 'C' ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-gray-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
