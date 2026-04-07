'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, ArrowUpDown, Store, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_TABS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtW = (v: number) => {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toFixed(1)}억`
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e4).toLocaleString()}만`
  return v.toLocaleString()
}
const fmtM = (v: number) => Math.round(v / 1e6).toLocaleString()

const fmtPct = (v: number | null | undefined) => {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%`
}

const fmtDiff = (v: number | null | undefined) => {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(1)}%p`
}

// ── Types ─────────────────────────────────────────────────────────────────────
type TabType = 'top-shops' | 'profitability' | 'shop-pnl'

interface TopShop {
  shopCd: string
  shopNm: string
  shopType: string
  mtdRev: number
  cwRev: number
  pwRev: number
  lyRev: number
  wow: number
  yoy: number
}

interface ProfitabilityRow {
  brand: string
  channel: string
  rev: number
  lyRev: number
  cogsRate: number
  lyCogsRate: number
  dcRate: number
  lyDcRate: number
}

interface ShopPnl {
  shopCd: string
  shopNm: string
  shopType: string
  rev: number
  cost: number
  grossProfit: number
  profitRate: number
  lyRev: number
  lyGrossProfit: number
}

type SortDir = 'asc' | 'desc'

// ── Channel options ───────────────────────────────────────────────────────────
const CHANNEL_OPTIONS = [
  '전체', '백화점', '아울렛', '직영점', '쇼핑몰', '대리점',
  '면세점', '온라인(무신사)', '온라인(위드플)', '온라인(자사몰)', '해외 사입',
]

// ── Item options ──────────────────────────────────────────────────────────────
const ITEM_OPTIONS = [
  '전체', '반팔티셔츠', '긴팔 티셔츠', '후드티', '크루넥', '셔츠',
  '팬츠', '청바지', '반바지', '자켓', '점퍼', '다운파카',
  '백팩', '가방', '모자', '양말',
]

// ── Month helpers ─────────────────────────────────────────────────────────────
function getLast6Months(): { label: string; value: string }[] {
  const now = new Date()
  const months: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    months.push({
      label: `${y}년 ${m}월`,
      value: `${y}${String(m).padStart(2, '0')}`,
    })
  }
  return months
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Sort helpers ──────────────────────────────────────────────────────────────
function useSort<T>(
  data: T[],
  defaultKey: keyof T,
  defaultDir: SortDir = 'desc',
) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const toggle = (key: keyof T) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey] as unknown as number | string
      const bv = b[sortKey] as unknown as number | string
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? ''); const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }, [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggle }
}

function SortIcon<T>({ col, sortKey, sortDir }: { col: keyof T; sortKey: keyof T; sortDir: SortDir }) {
  return (
    <ArrowUpDown
      className={cn(
        'inline ml-0.5 w-3 h-3',
        sortKey === col ? 'text-blue-500' : 'text-gray-300',
      )}
    />
  )
}

// ── Th helper ─────────────────────────────────────────────────────────────────
function Th({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap border-b border-surface-border select-none',
        onClick && 'cursor-pointer hover:text-gray-700',
        className,
      )}
    >
      {children}
    </th>
  )
}

// ── Tab 1: 베스트 매장 ─────────────────────────────────────────────────────────
function TopShopsTab({ shops }: { shops: TopShop[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSort<TopShop>(shops, 'mtdRev', 'desc')
  const top30 = sorted.slice(0, 30)

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <Th className="w-8">#</Th>
            <Th onClick={() => toggle('shopNm')}>
              매장명 <SortIcon col="shopNm" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('shopType')}>
              유통형태 <SortIcon col="shopType" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('mtdRev')} className="text-right">
              MTD매출 <SortIcon col="mtdRev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('cwRev')} className="text-right">
              이번주 <SortIcon col="cwRev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('pwRev')} className="text-right">
              전주 <SortIcon col="pwRev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('wow')} className="text-right">
              WoW <SortIcon col="wow" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('lyRev')} className="text-right">
              전년동기 <SortIcon col="lyRev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('yoy')} className="text-right">
              YoY <SortIcon col="yoy" sortKey={sortKey} sortDir={sortDir} />
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {top30.map((row, i) => (
            <tr key={row.shopCd} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2 text-gray-400 font-medium">{i + 1}</td>
              <td className="px-3 py-2 font-medium text-gray-900">{row.shopNm}</td>
              <td className="px-3 py-2">
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700">
                  {row.shopType}
                </span>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtW(row.mtdRev)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{fmtW(row.cwRev)}</td>
              <td className="px-3 py-2 text-right text-gray-500">{fmtW(row.pwRev)}</td>
              <td className={cn('px-3 py-2 text-right font-medium', row.wow >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {fmtPct(row.wow)}
              </td>
              <td className="px-3 py-2 text-right text-gray-500">{fmtW(row.lyRev)}</td>
              <td className={cn('px-3 py-2 text-right font-medium', row.yoy >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {fmtPct(row.yoy)}
              </td>
            </tr>
          ))}
          {top30.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-12 text-center text-gray-400">데이터가 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab 2: 채널 수익성 ─────────────────────────────────────────────────────────
function ProfitabilityTab({ rows }: { rows: ProfitabilityRow[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSort<ProfitabilityRow>(rows, 'rev', 'desc')

  return (
    <div className="overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="sticky top-0 bg-gray-50 z-10">
          <tr>
            <Th onClick={() => toggle('brand')}>
              브랜드 <SortIcon col="brand" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('channel')}>
              채널 <SortIcon col="channel" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('rev')} className="text-right">
              매출 <SortIcon col="rev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('lyRev')} className="text-right">
              전년 <SortIcon col="lyRev" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th onClick={() => toggle('cogsRate')} className="text-right">
              매출원가율 <SortIcon col="cogsRate" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th className="text-right">전년비(%p)</Th>
            <Th onClick={() => toggle('dcRate')} className="text-right">
              할인율 <SortIcon col="dcRate" sortKey={sortKey} sortDir={sortDir} />
            </Th>
            <Th className="text-right">전년비(%p)</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((row, i) => {
            const cogsDiff = row.cogsRate - row.lyCogsRate
            const dcDiff = row.dcRate - row.lyDcRate
            const cogsWorse = row.cogsRate > row.lyCogsRate
            return (
              <tr
                key={`${row.brand}-${row.channel}-${i}`}
                className={cn(
                  'transition-colors hover:bg-gray-50',
                  cogsWorse && 'bg-red-50 hover:bg-red-100',
                )}
              >
                <td className="px-3 py-2 font-medium text-gray-900">{row.brand}</td>
                <td className="px-3 py-2 text-gray-700">{row.channel}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmtW(row.rev)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmtW(row.lyRev)}</td>
                <td className={cn('px-3 py-2 text-right font-medium', cogsWorse ? 'text-red-600' : 'text-gray-700')}>
                  {row.cogsRate.toFixed(1)}%
                </td>
                <td className={cn('px-3 py-2 text-right', cogsDiff > 0 ? 'text-red-500' : 'text-emerald-600')}>
                  {fmtDiff(cogsDiff)}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">{row.dcRate.toFixed(1)}%</td>
                <td className={cn('px-3 py-2 text-right', dcDiff > 0 ? 'text-orange-500' : 'text-emerald-600')}>
                  {fmtDiff(dcDiff)}
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-12 text-center text-gray-400">데이터가 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Tab 3: 매장 손익 ───────────────────────────────────────────────────────────
function ShopPnlTab({ shops }: { shops: ShopPnl[] }) {
  const [deficitOnly, setDeficitOnly] = useState(false)

  const filtered = useMemo(
    () => (deficitOnly ? shops.filter(s => s.profitRate < 0) : shops),
    [shops, deficitOnly],
  )

  const { sorted, sortKey, sortDir, toggle } = useSort<ShopPnl>(filtered, 'profitRate', 'asc')

  const totalShops = shops.length
  const profitShops = shops.filter(s => s.profitRate >= 0).length
  const deficitShops = shops.filter(s => s.profitRate < 0).length
  const deficitRate = totalShops > 0 ? (deficitShops / totalShops) * 100 : 0

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '총 매장 수', value: `${totalShops}개`, color: 'text-gray-900' },
          { label: '흑자', value: `${profitShops}개`, color: 'text-emerald-600' },
          { label: '적자', value: `${deficitShops}개`, color: 'text-red-500' },
          { label: '적자비율', value: `${deficitRate.toFixed(1)}%`, color: deficitRate > 30 ? 'text-red-500' : 'text-orange-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-[10px] text-gray-500 mb-0.5">{kpi.label}</p>
            <p className={cn('text-lg font-bold', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        {[
          { label: '전체', val: false },
          { label: '적자매장만', val: true },
        ].map(opt => (
          <button
            key={String(opt.val)}
            onClick={() => setDeficitOnly(opt.val)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors',
              deficitOnly === opt.val
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
            )}
          >
            {opt.label}
          </button>
        ))}
        <span className="text-[11px] text-gray-400 self-center ml-1">
          {sorted.length}개 매장
        </span>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <Th onClick={() => toggle('shopNm')}>
                매장명 <SortIcon col="shopNm" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('shopType')}>
                유통형태 <SortIcon col="shopType" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('rev')} className="text-right">
                매출 <SortIcon col="rev" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('cost')} className="text-right">
                원가 <SortIcon col="cost" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('grossProfit')} className="text-right">
                매출총이익 <SortIcon col="grossProfit" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('profitRate')} className="text-right">
                이익률 <SortIcon col="profitRate" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('lyRev')} className="text-right">
                전년매출 <SortIcon col="lyRev" sortKey={sortKey} sortDir={sortDir} />
              </Th>
              <Th onClick={() => toggle('lyGrossProfit')} className="text-right">
                전년이익 <SortIcon col="lyGrossProfit" sortKey={sortKey} sortDir={sortDir} />
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(row => {
              const isDeficit = row.profitRate < 0
              const isGood = row.profitRate > 30
              return (
                <tr
                  key={row.shopCd}
                  className={cn(
                    'transition-colors',
                    isDeficit && 'bg-red-50 hover:bg-red-100',
                    isGood && !isDeficit && 'bg-emerald-50 hover:bg-emerald-100',
                    !isDeficit && !isGood && 'hover:bg-gray-50',
                  )}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{row.shopNm}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700">
                      {row.shopType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmtW(row.rev)}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{fmtW(row.cost)}</td>
                  <td className={cn('px-3 py-2 text-right font-semibold', isDeficit ? 'text-red-600' : 'text-gray-900')}>
                    {fmtW(row.grossProfit)}
                  </td>
                  <td className={cn(
                    'px-3 py-2 text-right font-bold',
                    isDeficit ? 'text-red-600' : isGood ? 'text-emerald-600' : 'text-gray-700',
                  )}>
                    {row.profitRate.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmtW(row.lyRev)}</td>
                  <td className="px-3 py-2 text-right text-gray-400">{fmtW(row.lyGrossProfit)}</td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-gray-400">데이터가 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShopsPage() {
  const { allowedBrands, loading: authLoading } = useAuth()

  // ── Filters
  const [brand, setBrand] = useState<string>('all')
  const [tab, setTab] = useState<TabType>('top-shops')
  const [channel, setChannel] = useState<string>('전체')
  const [item, setItem] = useState<string>('전체')
  const [month, setMonth] = useState<string>(getCurrentMonth())

  const monthOptions = useMemo(() => getLast6Months(), [])

  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand

  // ── Visible brand tabs (filtered by allowedBrands)
  const visibleBrandTabs = useMemo(() => {
    if (!allowedBrands) return BRAND_TABS
    return BRAND_TABS.filter(t => t.value === 'all' || allowedBrands.includes(t.value))
  }, [allowedBrands])

  // ── Data states
  const [topShops, setTopShops] = useState<TopShop[]>([])
  const [profitRows, setProfitRows] = useState<ProfitabilityRow[]>([])
  const [shopPnl, setShopPnl] = useState<ShopPnl[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch
  const fetchData = useCallback(async () => {
    if (authLoading) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        brand: apiBrand,
        tab,
        month,
      })
      if (channel !== '전체') params.set('channel', channel)
      if (tab === 'top-shops' && item !== '전체') params.set('item', item)

      const res = await fetch(`/api/sales/shops?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (tab === 'top-shops') {
        setTopShops(data.shops ?? [])
      } else if (tab === 'profitability') {
        setProfitRows(data.rows ?? [])
      } else if (tab === 'shop-pnl') {
        setShopPnl(data.shops ?? [])
      }
    } catch (e: any) {
      setError(e.message ?? '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [authLoading, apiBrand, tab, channel, item, month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4 p-6">
      {/* ── Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Store className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">매장/채널 분석</h1>
            <p className="text-[11px] text-gray-500">매장별 매출·채널 수익성·손익 현황</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          새로고침
        </button>
      </div>

      {/* ── Main card */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm">

        {/* ── Tabs */}
        <div className="flex border-b border-surface-border px-4 pt-3 gap-1">
          {(
            [
              { label: '베스트 매장', value: 'top-shops' as TabType },
              { label: '채널 수익성', value: 'profitability' as TabType },
              { label: '매장 손익', value: 'shop-pnl' as TabType },
            ] as const
          ).map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'px-4 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors',
                tab === t.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Filters */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-surface-border bg-gray-50/50">
          {/* Brand pills */}
          <div className="flex gap-1 flex-wrap">
            {visibleBrandTabs.map(bt => (
              <button
                key={bt.value}
                onClick={() => setBrand(bt.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-[11px] font-medium border transition-colors',
                  brand === bt.value
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300',
                )}
              >
                {bt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200" />

          {/* Channel dropdown */}
          <select
            value={channel}
            onChange={e => setChannel(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {CHANNEL_OPTIONS.map(c => (
              <option key={c} value={c}>{c === '전체' ? '유통형태: 전체' : c}</option>
            ))}
          </select>

          {/* Item dropdown (top-shops only) */}
          {tab === 'top-shops' && (
            <select
              value={item}
              onChange={e => setItem(e.target.value)}
              className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {ITEM_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt === '전체' ? '품목: 전체' : opt}</option>
              ))}
            </select>
          )}

          {/* Month dropdown */}
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {monthOptions.map(mo => (
              <option key={mo.value} value={mo.value}>{mo.label}</option>
            ))}
          </select>
        </div>

        {/* ── Content */}
        <div className="p-4">
          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              <TrendingDown className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span className="text-[12px]">데이터 로딩 중...</span>
              </div>
            </div>
          ) : (
            <>
              {tab === 'top-shops' && <TopShopsTab shops={topShops} />}
              {tab === 'profitability' && <ProfitabilityTab rows={profitRows} />}
              {tab === 'shop-pnl' && <ShopPnlTab shops={shopPnl} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
