'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, Calendar, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { BRAND_TABS, BRAND_COLORS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

// ── 포매팅 ────────────────────────────────────────────────────────
const fmtW = (v: number) => {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e4).toLocaleString()}만`
  return v.toLocaleString()
}
const fmtPct = (v: number | null | undefined) =>
  v == null || !isFinite(v) ? '—' : `${v.toFixed(1)}%`
const fmtYoy = (v: number | null | undefined) => {
  if (v == null || !isFinite(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}
const fmtDeltaPt = (cur: number, prev: number) => {
  if (cur == null || prev == null) return '—'
  const d = cur - prev
  return `${d >= 0 ? '+' : ''}${d.toFixed(1)}p`
}
const calcYoy = (cy: number, ly: number) =>
  ly ? ((cy - ly) / Math.abs(ly)) * 100 : null

// ── 시즌 옵션 ──────────────────────────────────────────────────────
const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄', year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
]

// ── 타입 ─────────────────────────────────────────────────────────
interface PeriodKPI {
  rev: number
  lyRev: number
  yoy: number
  qty: number
  lyQty: number
  dcRate: number
  lyDcRate: number
  cogsRate: number
  lyCogsRate: number
}

interface WeekPoint { week: string; cy: number; ly: number }
interface BrandRow { brand: string; rev: number; lyRev: number }
interface ChannelRow { channel: string; rev: number; lyRev: number }
interface TopItem { item: string; rev: number; lyRev: number; qty: number }

interface PeriodData {
  kpi: PeriodKPI
  weekly: WeekPoint[]
  brands: BrandRow[]
  channels: ChannelRow[]
  topItems: TopItem[]
}

// ── 기본 날짜 헬퍼 ────────────────────────────────────────────────
function getDefaultDates() {
  const now = new Date()
  const year = now.getFullYear()
  const toDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const startOfYear = new Date(year, 0, 1)
  const lyStart = new Date(year - 1, 0, 1)
  const lyEnd = new Date(year - 1, now.getMonth(), now.getDate())
  return {
    cyFrom: toDate(startOfYear),
    cyTo: toDate(now),
    lyFrom: toDate(lyStart),
    lyTo: toDate(lyEnd),
  }
}

// ── 툴팁 ─────────────────────────────────────────────────────────
function WeekTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-surface-border rounded-lg shadow-lg p-3 text-xs min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}주</p>
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

// ── 메인 ─────────────────────────────────────────────────────────
export default function PeriodAnalysisPage() {
  const { allowedBrands, loading: authLoading } = useAuth()

  // 브랜드 탭
  const visibleBrandTabs = useMemo(() => {
    if (!allowedBrands) return BRAND_TABS
    return [
      ...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
      ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value)),
    ]
  }, [allowedBrands])

  const [brand, setBrand] = useState('all')
  useEffect(() => {
    if (authLoading) return
    if (allowedBrands?.length === 1) setBrand(allowedBrands[0])
  }, [allowedBrands, authLoading])

  // 모드 토글
  const [mode, setMode] = useState<'season' | 'period'>('season')

  // 시즌 모드
  const [seasonIdx, setSeasonIdx] = useState(0)

  // 기간 모드
  const defaults = getDefaultDates()
  const [cyFrom, setCyFrom] = useState(defaults.cyFrom)
  const [cyTo, setCyTo] = useState(defaults.cyTo)
  const [lyFrom, setLyFrom] = useState(defaults.lyFrom)
  const [lyTo, setLyTo] = useState(defaults.lyTo)

  // 데이터 상태
  const [data, setData] = useState<PeriodData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ brand: apiBrand })
      if (mode === 'season') {
        const sel = SEASON_OPTIONS[seasonIdx]
        params.set('year', sel.year)
        params.set('season', sel.season)
      } else {
        const toSf = (d: string) => d.replace(/-/g, '')
        params.set('fromDt', toSf(cyFrom))
        params.set('toDt', toSf(cyTo))
        params.set('lyFromDt', toSf(lyFrom))
        params.set('lyToDt', toSf(lyTo))
      }
      const res = await fetch(`/api/sales/period?${params.toString()}`)
      if (!res.ok) throw new Error('API error')
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [apiBrand, mode, seasonIdx, cyFrom, cyTo, lyFrom, lyTo])

  useEffect(() => {
    if (!authLoading) fetchData()
  }, [authLoading, fetchData])

  // 파생 계산
  const totalRev = data?.brands.reduce((s, r) => s + r.rev, 0) || 1
  const totalChRev = data?.channels.reduce((s, r) => s + r.rev, 0) || 1
  const totalItemRev = data?.topItems.reduce((s, r) => s + r.rev, 0) || 1

  const kpi = data?.kpi

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">시즌/기간 분석</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            시즌 또는 사용자 정의 기간의 매출 실적을 분석합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[11px] text-gray-400">{lastUpdated} 기준</span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white border border-surface-border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            새로고침
          </button>
        </div>
      </div>

      {/* ── 필터 ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4 space-y-3">
        {/* 브랜드 탭 */}
        <div className="flex items-center gap-1 flex-wrap">
          {visibleBrandTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setBrand(tab.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                brand === tab.value
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
              style={brand === tab.value ? { backgroundColor: tab.value === 'all' ? '#e91e63' : (BRAND_COLORS[tab.value] || '#e91e63') } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 모드 토글 + 선택 */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex rounded-lg border border-surface-border overflow-hidden">
            <button
              onClick={() => setMode('season')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mode === 'season' ? 'bg-[#e91e63] text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              시즌 모드
            </button>
            <button
              onClick={() => setMode('period')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-surface-border transition-colors',
                mode === 'period' ? 'bg-[#e91e63] text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              기간비교 모드
            </button>
          </div>

          {mode === 'season' ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {SEASON_OPTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSeasonIdx(i)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    seasonIdx === i
                      ? 'bg-[#e91e63] text-white border-[#e91e63]'
                      : 'bg-white text-gray-600 border-surface-border hover:bg-gray-50',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 w-8">금년</span>
                <input
                  type="date"
                  value={cyFrom}
                  onChange={e => setCyFrom(e.target.value)}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
                />
                <span className="text-[11px] text-gray-400">~</span>
                <input
                  type="date"
                  value={cyTo}
                  onChange={e => setCyTo(e.target.value)}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-gray-500 w-8">전년</span>
                <input
                  type="date"
                  value={lyFrom}
                  onChange={e => setLyFrom(e.target.value)}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
                />
                <span className="text-[11px] text-gray-400">~</span>
                <input
                  type="date"
                  value={lyTo}
                  onChange={e => setLyTo(e.target.value)}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#e91e63]"
                />
              </div>
              <button
                onClick={fetchData}
                className="px-4 py-1.5 bg-[#e91e63] text-white rounded-lg text-xs font-medium hover:bg-[#c2185b] transition-colors"
              >
                조회
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── KPI 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 매출 */}
        <KpiCard
          label="매출"
          value={kpi ? fmtW(kpi.rev) : '—'}
          sub={kpi ? `전년 ${fmtW(kpi.lyRev)}` : '전년 —'}
          badge={kpi ? fmtYoy(kpi.yoy) : null}
          positive={kpi ? kpi.yoy >= 0 : null}
          loading={loading}
          accent
        />
        {/* 수량 */}
        <KpiCard
          label="수량"
          value={kpi ? kpi.qty.toLocaleString() : '—'}
          sub={kpi ? `전년 ${kpi.lyQty.toLocaleString()}` : '전년 —'}
          badge={kpi ? fmtYoy(calcYoy(kpi.qty, kpi.lyQty)) : null}
          positive={kpi && kpi.lyQty ? kpi.qty >= kpi.lyQty : null}
          loading={loading}
        />
        {/* 할인율 */}
        <KpiCard
          label="할인율"
          value={kpi ? fmtPct(kpi.dcRate) : '—'}
          sub={kpi ? `전년 ${fmtPct(kpi.lyDcRate)}` : '전년 —'}
          badge={kpi ? fmtDeltaPt(kpi.dcRate, kpi.lyDcRate) : null}
          positive={kpi ? kpi.dcRate <= kpi.lyDcRate : null}
          loading={loading}
          lowerBetter
        />
        {/* 매출원가율 */}
        <KpiCard
          label="매출원가율"
          value={kpi ? fmtPct(kpi.cogsRate) : '—'}
          sub={kpi ? `전년 ${fmtPct(kpi.lyCogsRate)}` : '전년 —'}
          badge={kpi ? fmtDeltaPt(kpi.cogsRate, kpi.lyCogsRate) : null}
          positive={kpi ? kpi.cogsRate <= kpi.lyCogsRate : null}
          loading={loading}
          lowerBetter
        />
      </div>

      {/* ── 주별 차트 ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">주별 매출 추이</h2>
        {loading ? (
          <div className="h-56 flex items-center justify-center text-xs text-gray-400">
            데이터 로딩 중...
          </div>
        ) : !data?.weekly?.length ? (
          <div className="h-56 flex items-center justify-center text-xs text-gray-400">
            데이터 없음
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={data.weekly} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={v => fmtW(v)}
                width={56}
              />
              <Tooltip content={<WeekTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="cy"
                name="금년"
                stroke="#e91e63"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="ly"
                name="전년"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 브랜드 / 채널 테이블 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 브랜드별 실적 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-gray-800">브랜드별 실적</h2>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                <th className="px-3 py-2 text-left text-gray-500 font-medium">브랜드</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">매출</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">전년</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">YoY</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">로딩 중...</td>
                </tr>
              ) : !data?.brands?.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">데이터 없음</td>
                </tr>
              ) : (
                data.brands.map((row, i) => {
                  const yoy = calcYoy(row.rev, row.lyRev)
                  const share = totalRev > 0 ? (row.rev / totalRev) * 100 : 0
                  return (
                    <tr key={i} className="border-b border-surface-border last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 font-medium">{row.brand}</td>
                      <td className="px-3 py-2 text-right text-gray-800 font-semibold">{fmtW(row.rev)}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{fmtW(row.lyRev)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', yoy == null ? 'text-gray-400' : yoy >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {fmtYoy(yoy)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmtPct(share)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 채널별 실적 */}
        <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <h2 className="text-sm font-semibold text-gray-800">채널별 실적</h2>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                <th className="px-3 py-2 text-left text-gray-500 font-medium">채널</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">매출</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">전년</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">YoY</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">로딩 중...</td>
                </tr>
              ) : !data?.channels?.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400">데이터 없음</td>
                </tr>
              ) : (
                data.channels.map((row, i) => {
                  const yoy = calcYoy(row.rev, row.lyRev)
                  const share = totalChRev > 0 ? (row.rev / totalChRev) * 100 : 0
                  return (
                    <tr key={i} className="border-b border-surface-border last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700 font-medium">{row.channel}</td>
                      <td className="px-3 py-2 text-right text-gray-800 font-semibold">{fmtW(row.rev)}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{fmtW(row.lyRev)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', yoy == null ? 'text-gray-400' : yoy >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {fmtYoy(yoy)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmtPct(share)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 베스트 품목 TOP 20 ── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-gray-800">베스트 품목 TOP 20</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                <th className="px-3 py-2 text-center text-gray-500 font-medium w-10">순위</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">품목</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">매출</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">전년</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">YoY</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">수량</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">로딩 중...</td>
                </tr>
              ) : !data?.topItems?.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">데이터 없음</td>
                </tr>
              ) : (
                data.topItems.slice(0, 20).map((row, i) => {
                  const yoy = calcYoy(row.rev, row.lyRev)
                  const share = totalItemRev > 0 ? (row.rev / totalItemRev) * 100 : 0
                  return (
                    <tr key={i} className={cn('border-b border-surface-border last:border-0 hover:bg-gray-50', i < 3 && 'bg-pink-50/30')}>
                      <td className="px-3 py-2 text-center">
                        <span className={cn(
                          'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                          i === 0 ? 'bg-yellow-400 text-white' :
                          i === 1 ? 'bg-gray-300 text-white' :
                          i === 2 ? 'bg-amber-600 text-white' :
                          'text-gray-500',
                        )}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 font-medium max-w-[200px] truncate">{row.item}</td>
                      <td className="px-3 py-2 text-right text-gray-800 font-semibold">{fmtW(row.rev)}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{fmtW(row.lyRev)}</td>
                      <td className={cn('px-3 py-2 text-right font-medium', yoy == null ? 'text-gray-400' : yoy >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                        {fmtYoy(yoy)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">{row.qty.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{fmtPct(share)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── KPI 카드 컴포넌트 ──────────────────────────────────────────────
interface KpiCardProps {
  label: string
  value: string
  sub: string
  badge: string | null
  positive: boolean | null
  loading: boolean
  accent?: boolean
  lowerBetter?: boolean
}

function KpiCard({ label, value, sub, badge, positive, loading, accent, lowerBetter }: KpiCardProps) {
  const badgeColor = badge == null || badge === '—'
    ? 'text-gray-400 bg-gray-100'
    : positive
      ? 'text-emerald-700 bg-emerald-50'
      : 'text-red-600 bg-red-50'

  return (
    <div className={cn(
      'bg-white rounded-xl border shadow-sm p-4',
      accent ? 'border-pink-200' : 'border-surface-border',
    )}>
      <p className={cn('text-[11px] font-medium mb-1', accent ? 'text-[#e91e63]' : 'text-gray-500')}>
        {label}
      </p>
      {loading ? (
        <div className="h-7 w-24 bg-gray-100 animate-pulse rounded" />
      ) : (
        <p className="text-xl font-bold text-gray-900 tracking-tight">{value}</p>
      )}
      <div className="flex items-center gap-1.5 mt-1">
        <p className="text-[10px] text-gray-400">{sub}</p>
        {badge && badge !== '—' && (
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', badgeColor)}>
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
