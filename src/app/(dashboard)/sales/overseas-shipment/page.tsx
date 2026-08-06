'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Ship } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_NAMES } from '@/lib/constants'

interface Row { shopCd: string; brandcd: string; yr: string; mm: number; amt: number; qty: number }
const YEARS = ['2026', '2025']
// 자사 해외법인 매장코드 → 표시명
const ENTITY: Record<string, string> = { B6055: '대만 B.CAVE', B6057: '일본 B.CAVE', B6063: '중국 B.CAVE' }
const ENTITY_ORDER = ['B6055', 'B6057', 'B6063']

const M = (v: number) => Math.round(v / 1e6).toLocaleString()
const EOK = (v: number) => (v / 1e8).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (c: number, b: number) => b > 0 ? (c / b - 1) * 100 : null
const pctTxt = (v: number | null) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
const chg = (v: number | null) => v == null ? 'text-gray-400' : v >= 0 ? 'text-red-600' : 'text-blue-600'

export default function OverseasShipmentPage() {
  const [year, setYear] = useState('2026')
  const [rows, setRows] = useState<Row[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/sales/overseas-shipment?year=${year}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setRows(json.rows ?? [])
      setMeta(json.meta ?? null)
    } catch (e) { setError(String(e)); setRows([]) }
    finally { setLoading(false) }
  }, [year])
  useEffect(() => { fetchData() }, [fetchData])

  const cy = useMemo(() => rows.filter(r => r.yr === year), [rows, year])
  const ly = useMemo(() => rows.filter(r => r.yr === meta?.lyYear), [rows, meta])

  const months = useMemo(() => Array.from(new Set(cy.map(r => r.mm))).sort((a, b) => a - b), [cy])

  // 법인별 집계
  const entities = useMemo(() => {
    const present = ENTITY_ORDER.filter(s => cy.some(r => r.shopCd === s) || ly.some(r => r.shopCd === s))
    return present.map(s => {
      const c = cy.filter(r => r.shopCd === s)
      const l = ly.filter(r => r.shopCd === s)
      const amt = c.reduce((a, r) => a + r.amt, 0)
      const qty = c.reduce((a, r) => a + r.qty, 0)
      const lyAmt = l.reduce((a, r) => a + r.amt, 0)
      const byBrand = new Map<string, { amt: number; qty: number; lyAmt: number }>()
      for (const r of c) { const e = byBrand.get(r.brandcd) ?? { amt: 0, qty: 0, lyAmt: 0 }; e.amt += r.amt; e.qty += r.qty; byBrand.set(r.brandcd, e) }
      for (const r of l) { const e = byBrand.get(r.brandcd) ?? { amt: 0, qty: 0, lyAmt: 0 }; e.lyAmt += r.amt; byBrand.set(r.brandcd, e) }
      const monthly: Record<number, number> = {}
      for (const r of c) monthly[r.mm] = (monthly[r.mm] ?? 0) + r.amt
      return { shopCd: s, name: ENTITY[s] ?? s, amt, qty, lyAmt, monthly, byBrand }
    })
  }, [cy, ly])

  const tot = useMemo(() => {
    const amt = cy.reduce((a, r) => a + r.amt, 0)
    const qty = cy.reduce((a, r) => a + r.qty, 0)
    const lyAmt = ly.reduce((a, r) => a + r.amt, 0)
    return { amt, qty, lyAmt }
  }, [cy, ly])

  return (
    <div className="flex flex-col gap-4 p-5 min-h-0 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Ship size={18} className="text-gray-400" />
          <h1 className="text-lg font-bold text-gray-900">해외 출고분 (자사 해외법인 이전)</h1>
          <span className="text-xs text-gray-400">대만·일본·중국 B.CAVE · 이전가 기준 · VAT제외</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
            {YEARS.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  year === y ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>{y}년</button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 border border-surface-border rounded-lg px-2.5 py-1.5">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 조회
          </button>
        </div>
      </div>

      <div className="text-[11px] text-gray-500 bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2">
        이 페이지는 <b>계열 해외법인으로의 이전(출고)</b> 물량입니다. 실수요가 아니라 매출·목표·달성률 등 국내 실적 지표에서는 <b>제외</b>되어 있고, 여기서만 별도 추적합니다. 금액은 이전가라 참고용이며, 실판매는 향후 현지 ERP 접목으로 확인 예정 → <b>수량(물량)</b>을 주지표로 보세요.
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 break-all">{error}</div>}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-surface-subtle animate-pulse rounded-xl" />)}</div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">총 출고 수량</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{tot.qty.toLocaleString()}<span className="text-base font-medium text-gray-400 ml-1">개</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">총 출고 금액 (이전가)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{EOK(tot.amt)}<span className="text-base font-medium text-gray-400 ml-1">억</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-border p-4">
              <p className="text-[11px] text-gray-500">전년 대비 (금액)</p>
              <p className={cn('text-3xl font-bold mt-1', chg(pct(tot.amt, tot.lyAmt)))}>{pctTxt(pct(tot.amt, tot.lyAmt))}</p>
              <p className="text-xs text-gray-400 mt-0.5">전년 {EOK(tot.lyAmt)}억</p>
            </div>
          </div>

          {entities.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">해당 연도 출고 데이터가 없습니다.</div>
          ) : (
            <>
              {/* 법인 × 브랜드 */}
              <section>
                <h2 className="text-sm font-bold text-gray-800 mb-2">법인 · 브랜드별 출고</h2>
                <div className="overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-50 text-gray-500"><tr>
                      <th className="text-left px-3 py-2">법인</th>
                      <th className="text-left px-3 py-2">브랜드</th>
                      <th className="text-right px-3 py-2">수량</th>
                      <th className="text-right px-3 py-2">금액(백만)</th>
                      <th className="text-right px-3 py-2">전년비(금액)</th>
                    </tr></thead>
                    <tbody>
                      {entities.map(e => {
                        const brs = Array.from(e.byBrand.entries()).filter(([, v]) => v.amt > 0 || v.lyAmt > 0).sort((a, b) => b[1].amt - a[1].amt)
                        return [
                          <tr key={e.shopCd} className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
                            <td className="text-left px-3 py-1.5 text-gray-900">{e.name}</td>
                            <td className="text-left px-3 py-1.5 text-gray-400">소계</td>
                            <td className="text-right px-3 py-1.5 font-mono text-gray-900">{e.qty.toLocaleString()}</td>
                            <td className="text-right px-3 py-1.5 font-mono text-gray-900">{M(e.amt)}</td>
                            <td className={cn('text-right px-3 py-1.5 font-mono', chg(pct(e.amt, e.lyAmt)))}>{pctTxt(pct(e.amt, e.lyAmt))}</td>
                          </tr>,
                          ...brs.map(([b, v]) => (
                            <tr key={`${e.shopCd}-${b}`} className="border-t border-surface-border/50">
                              <td className="px-3 py-1"></td>
                              <td className="text-left px-3 py-1 text-gray-600">{BRAND_NAMES[b] ?? b}</td>
                              <td className="text-right px-3 py-1 font-mono text-gray-700">{v.qty.toLocaleString()}</td>
                              <td className="text-right px-3 py-1 font-mono text-gray-700">{M(v.amt)}</td>
                              <td className={cn('text-right px-3 py-1 font-mono', chg(pct(v.amt, v.lyAmt)))}>{pctTxt(pct(v.amt, v.lyAmt))}</td>
                            </tr>
                          )),
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 법인 × 월 (금액 백만) */}
              {months.length > 0 && (
                <section>
                  <h2 className="text-sm font-bold text-gray-800 mb-2">법인별 월 출고 추이 <span className="font-normal text-gray-400">· 금액(백만)</span></h2>
                  <div className="overflow-x-auto rounded-xl border border-surface-border">
                    <table className="w-full text-[11px] border-collapse">
                      <thead className="bg-gray-50 text-gray-500"><tr>
                        <th className="text-left px-3 py-2 whitespace-nowrap">법인</th>
                        {months.map(m => <th key={m} className="text-right px-2 py-2">{m}월</th>)}
                        <th className="text-right px-3 py-2 border-l border-surface-border">합계</th>
                      </tr></thead>
                      <tbody>
                        {entities.map(e => (
                          <tr key={e.shopCd} className="border-t border-surface-border/60">
                            <td className="text-left px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">{e.name}</td>
                            {months.map(m => <td key={m} className="text-right px-2 py-1.5 font-mono text-gray-700">{e.monthly[m] ? M(e.monthly[m]) : ''}</td>)}
                            <td className="text-right px-3 py-1.5 font-mono font-semibold text-gray-900 border-l border-surface-border">{M(e.amt)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                          <td className="text-left px-3 py-1.5 text-gray-900">합계</td>
                          {months.map(m => {
                            const s = entities.reduce((a, e) => a + (e.monthly[m] ?? 0), 0)
                            return <td key={m} className="text-right px-2 py-1.5 font-mono">{s ? M(s) : ''}</td>
                          })}
                          <td className="text-right px-3 py-1.5 font-mono border-l border-surface-border">{M(tot.amt)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
