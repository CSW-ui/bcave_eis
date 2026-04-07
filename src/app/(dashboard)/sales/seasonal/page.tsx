'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { BRAND_TABS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

// ── 포맷 헬퍼 ────────────────────────────────────────────────────
const fmtW = (v: number) => {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e4).toLocaleString()}만`
  return v.toLocaleString()
}

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

const fmtDiff = (v: number | null | undefined) => {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%p`
}

const yoy = (cy: number, ly: number) => {
  if (!ly) return null
  return Math.round((cy / ly - 1) * 1000) / 10
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

// ── 시즌 옵션 ─────────────────────────────────────────────────────
const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄',  year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
]

// ── KPI 데이터 타입 ──────────────────────────────────────────────
interface KpiData {
  normRev: number
  coRev: number
  totalRev: number
  normRatio: number
  lyNormRev: number
  lyCoRev: number
  lyTotalRev: number
  normDcRate: number
  coDcRate: number
  lyNormDcRate: number
  lyCoDcRate: number
  normCogsRate: number
  coCogsRate: number
}

interface WeeklyRow {
  week: string
  normCy: number
  coCy: number
  normLy: number
  coLy: number
}

interface ChannelRow {
  channel: string
  normRev: number
  coRev: number
  lyNormRev: number
  lyCoRev: number
}

interface ItemRow {
  item: string
  category: string
  normRev: number
  coRev: number
  normQty: number
  coQty: number
}

interface ApiResponse {
  kpi: KpiData
  weekly: WeeklyRow[]
  channels: ChannelRow[]
  items: ItemRow[]
}

// ── 툴팁 ─────────────────────────────────────────────────────────
function WeeklyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3 mt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-medium">{p.value != null ? fmtW(p.value) : '—'}</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI 카드 ─────────────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  sub?: string
  subColor?: string
  badge?: string
  badgeColor?: string
}
function KpiCard({ label, value, sub, subColor, badge, badgeColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4 flex flex-col gap-1">
      <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {sub && (
          <span className={cn('text-[11px] font-medium', subColor ?? 'text-gray-500')}>{sub}</span>
        )}
        {badge && (
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badgeColor ?? 'bg-gray-100 text-gray-500')}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function SeasonalPage() {
  const { allowedBrands } = useAuth()

  const [brand, setBrand] = useState('all')
  const [seasonIdx, setSeasonIdx] = useState(0)
  const [fromDt, setFromDt] = useState('2026-01-01')
  const [toDt, setToDt] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand

  const visibleBrands = allowedBrands
    ? [
        ...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
        ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value)),
      ]
    : BRAND_TABS

  const sel = SEASON_OPTIONS[seasonIdx]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const from = fromDt.replace(/-/g, '')
      const to = toDt.replace(/-/g, '')
      const url = `/api/sales/seasonal?brand=${apiBrand}&year=${sel.year}&season=${encodeURIComponent(sel.season)}&fromDt=${from}&toDt=${to}`
      const res = await fetch(url)
      const json = await res.json()
      if (json?.kpi) setData(json)
    } catch {}
    finally { setLoading(false) }
  }, [apiBrand, sel.year, sel.season, fromDt, toDt])

  useEffect(() => { fetchData() }, [fetchData])

  const kpi = data?.kpi
  const weekly = data?.weekly ?? []
  const channels = data?.channels ?? []
  const items = data?.items ?? []

  // 총매출 전년비
  const totalYoy = kpi ? yoy(kpi.totalRev, kpi.lyTotalRev) : null
  const normYoy  = kpi ? yoy(kpi.normRev, kpi.lyNormRev) : null
  const coYoy    = kpi ? yoy(kpi.coRev, kpi.lyCoRev) : null
  const coRatio  = kpi && kpi.totalRev ? (kpi.coRev / kpi.totalRev * 100) : null

  // 할인율 전년 차이
  const normDcDiff = kpi != null ? kpi.normDcRate - kpi.lyNormDcRate : null
  const coDcDiff   = kpi != null ? kpi.coDcRate   - kpi.lyCoDcRate   : null

  const yoyColor = (v: number | null) =>
    v == null ? 'text-gray-400' : v >= 0 ? 'text-emerald-600' : 'text-red-500'
  const yoyStr = (v: number | null) =>
    v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}% YoY`

  return (
    <div className="p-4 space-y-4 animate-fade-in">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">정상/이월 매출</h1>
          <p className="text-xs text-gray-400 mt-0.5">시즌 상품 vs 이월 상품 매출 분리 분석</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3 flex flex-wrap items-center gap-3">

        {/* 브랜드 */}
        <div className="flex items-center gap-1">
          {visibleBrands.map(b => (
            <button
              key={b.value}
              onClick={() => setBrand(b.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                brand === b.value
                  ? 'bg-[#e91e63] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* 시즌 */}
        <div className="flex items-center gap-1">
          {SEASON_OPTIONS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSeasonIdx(i)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                seasonIdx === i
                  ? 'bg-[#e91e63] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200" />

        {/* 기간 */}
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <input
            type="date"
            value={fromDt}
            onChange={e => setFromDt(e.target.value)}
            className="border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={toDt}
            onChange={e => setToDt(e.target.value)}
            className="border border-surface-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
          />
        </div>
      </div>

      {/* KPI 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-surface-border shadow-sm p-4 h-24 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="총 매출"
            value={kpi ? fmtW(kpi.totalRev) : '—'}
            sub={yoyStr(totalYoy)}
            subColor={yoyColor(totalYoy)}
          />
          <KpiCard
            label="정상 매출"
            value={kpi ? fmtW(kpi.normRev) : '—'}
            sub={yoyStr(normYoy)}
            subColor={yoyColor(normYoy)}
            badge={kpi ? `${kpi.normRatio.toFixed(1)}%` : undefined}
            badgeColor="bg-pink-50 text-[#e91e63]"
          />
          <KpiCard
            label="이월 매출"
            value={kpi ? fmtW(kpi.coRev) : '—'}
            sub={yoyStr(coYoy)}
            subColor={yoyColor(coYoy)}
            badge={coRatio != null ? `${coRatio.toFixed(1)}%` : undefined}
            badgeColor="bg-amber-50 text-amber-600"
          />
          <KpiCard
            label="정상 할인율"
            value={kpi ? fmtPct(kpi.normDcRate) : '—'}
            sub={fmtDiff(normDcDiff)}
            subColor={normDcDiff != null ? (normDcDiff > 0 ? 'text-red-500' : 'text-emerald-600') : 'text-gray-400'}
          />
          <KpiCard
            label="이월 할인율"
            value={kpi ? fmtPct(kpi.coDcRate) : '—'}
            sub={fmtDiff(coDcDiff)}
            subColor={coDcDiff != null ? (coDcDiff > 0 ? 'text-red-500' : 'text-emerald-600') : 'text-gray-400'}
          />
          <KpiCard
            label="정상 매출원가율"
            value={kpi ? fmtPct(kpi.normCogsRate) : '—'}
            sub={kpi ? `이월 ${fmtPct(kpi.coCogsRate)}` : undefined}
            subColor="text-gray-400"
          />
        </div>
      )}

      {/* 주별 차트 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">주별 정상/이월 매출 추이</h2>
        {loading ? (
          <div className="h-56 animate-pulse bg-gray-50 rounded-lg" />
        ) : weekly.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-gray-400">데이터 없음</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={v => fmtW(v)}
                tick={{ fontSize: 10 }}
                width={52}
              />
              <Tooltip content={<WeeklyTooltip />} />
              <Line
                type="monotone"
                dataKey="normCy"
                name="정상(금년)"
                stroke="#e91e63"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="coCy"
                name="이월(금년)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="normLy"
                name="정상(전년)"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="coLy"
                name="이월(전년)"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-[#e91e63] inline-block" /> 정상(금년)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-0.5 bg-amber-400 inline-block" /> 이월(금년)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-px border-t-2 border-dashed border-gray-400 inline-block" /> 정상(전년)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-px border-t-2 border-dotted border-gray-400 inline-block" /> 이월(전년)
          </span>
        </div>
      </div>

      {/* 하단 2컬럼 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 채널별 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">채널별 정상/이월</h2>
          {loading ? (
            <div className="h-40 animate-pulse bg-gray-50 rounded-lg" />
          ) : channels.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 pr-2 font-semibold text-gray-500">채널</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-[#e91e63]">정상매출</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-amber-500">이월매출</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-gray-500">정상비중</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-gray-500">정상전년비</th>
                    <th className="text-right py-1.5 pl-1 font-semibold text-gray-500">이월전년비</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row, i) => {
                    const total = row.normRev + row.coRev
                    const normPct = total > 0 ? (row.normRev / total * 100) : 0
                    const normYoyVal = yoy(row.normRev, row.lyNormRev)
                    const coYoyVal = yoy(row.coRev, row.lyCoRev)
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-1.5 pr-2 text-gray-700 font-medium">{row.channel}</td>
                        <td className="py-1.5 px-1 text-right text-gray-800 font-medium">{fmtW(row.normRev)}</td>
                        <td className="py-1.5 px-1 text-right text-gray-800">{fmtW(row.coRev)}</td>
                        <td className="py-1.5 px-1 text-right text-gray-500">{normPct.toFixed(1)}%</td>
                        <td className={cn('py-1.5 px-1 text-right font-medium', yoyColor(normYoyVal))}>
                          {normYoyVal != null ? `${normYoyVal >= 0 ? '+' : ''}${normYoyVal.toFixed(1)}%` : '—'}
                        </td>
                        <td className={cn('py-1.5 pl-1 text-right font-medium', yoyColor(coYoyVal))}>
                          {coYoyVal != null ? `${coYoyVal >= 0 ? '+' : ''}${coYoyVal.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 품목별 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">품목별 정상/이월</h2>
          {loading ? (
            <div className="h-40 animate-pulse bg-gray-50 rounded-lg" />
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 pr-1 font-semibold text-gray-500">품목</th>
                    <th className="text-left py-1.5 pr-2 font-semibold text-gray-400">카테고리</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-[#e91e63]">정상매출</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-amber-500">이월매출</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-gray-500">정상비중</th>
                    <th className="text-right py-1.5 px-1 font-semibold text-gray-500">정상수량</th>
                    <th className="text-right py-1.5 pl-1 font-semibold text-gray-500">이월수량</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const total = row.normRev + row.coRev
                    const normPct = total > 0 ? (row.normRev / total * 100) : 0
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-1.5 pr-1 text-gray-800 font-medium">{row.item}</td>
                        <td className="py-1.5 pr-2 text-gray-400">{row.category}</td>
                        <td className="py-1.5 px-1 text-right text-gray-800 font-medium">{fmtW(row.normRev)}</td>
                        <td className="py-1.5 px-1 text-right text-gray-700">{fmtW(row.coRev)}</td>
                        <td className="py-1.5 px-1 text-right text-gray-500">{normPct.toFixed(1)}%</td>
                        <td className="py-1.5 px-1 text-right text-gray-600">{row.normQty.toLocaleString()}</td>
                        <td className="py-1.5 pl-1 text-right text-gray-500">{row.coQty.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
