'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { RefreshCw, Download, ChevronDown, ChevronRight, Shirt, ArrowDown, Footprints, ShoppingBag, Watch, Sparkles, Gift, Package, MoreHorizontal } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'
import { BRAND_COLORS, BRAND_TABS, ITEM_CATEGORIES, GENDER_FILTERS } from '@/lib/constants'
import { useAuth } from '@/contexts/AuthContext'

const SEASON_OPTIONS = [
  { label: '26 S/S', year: '26', season: '봄,여름,상반기,스탠다드' },
  { label: '26 봄', year: '26', season: '봄' },
  { label: '26 여름', year: '26', season: '여름' },
  { label: '25 F/W', year: '25', season: '가을,겨울,하반기,스탠다드' },
  { label: '25 S/S', year: '25', season: '봄,여름,상반기,스탠다드' },
]

interface IpjItem {
  item: string; category: string
  stCnt: number; stclCnt: number
  ordQty: number; ordTagAmt: number; ordCostAmt: number
  inQty: number; inAmt: number
  stCnt1st: number; stclCnt1st: number; ordQty1st: number; ordTag1st: number; ordCost1st: number
  stCntQR: number; stclCntQR: number; ordQtyQR: number; ordTagQR: number; ordCostQR: number
  saleQty: number; saleAmt: number; tagAmt: number; salePriceAmt: number; costAmt: number
  saleAmtOl: number; tagAmtOl: number; onlineRatio: number
  coSaleQty: number; coSaleAmt: number; coTagAmt: number; coSalePriceAmt: number; coCostAmt: number
  coStCnt: number; coStclCnt: number; coSaleAmtOl: number
  coDcRate: number; coCogsRate: number
  ovSaleQty: number; ovSaleAmt: number; ovTagAmt: number; ovSalePriceAmt: number; ovCostAmt: number
  ovDcRate: number; ovCogsRate: number
  totalSaleAmt: number; totalTagAmt: number
  invStCnt: number; invStclCnt: number; totalInvQty: number; invTagAmt: number; invCostAmt: number
  shopInvQty: number; whAvail: number
  coInvQty: number; coInvTagAmt: number; coInvCostAmt: number; coBaseTagAmt: number
  salesRate: number; cumSaleQty: number; cumSalesRate: number; dcRate: number; cogsRate: number
  firstCostRate: number; qrCostRate: number
  lyOrdTagAmt: number; lyOrdCostAmt: number; lyOrdTagQR: number; lyOrdCostRate: number
  lySaleAmt: number; lyCoSaleAmt: number; lyOvSaleAmt: number; lyTotalSaleAmt: number
  lyTagAmt: number; lySalePriceAmt: number; lyCostAmt: number
  lyCoTagAmt: number; lyCoSalePriceAmt: number; lyCoCostAmt: number
  lyInQty: number; lySaleQty: number; lyOvSaleQty: number
  lySalesRate: number | null; lyCoSalesRate: number | null
}

// 백만원 단위 포맷
const fmtE = (v: number) => Math.round(v / 1e6).toLocaleString()

// 합계용 키
type SumKeys =
  | 'ordTagAmt' | 'ordCostAmt' | 'ordTagQR' | 'invTagAmt' | 'invCostAmt'
  | 'totalSaleAmt' | 'saleAmt' | 'tagAmt' | 'salePriceAmt' | 'costAmt' | 'saleQty' | 'inQty' | 'inAmt'
  | 'coSaleAmt' | 'coTagAmt' | 'coSalePriceAmt' | 'coCostAmt' | 'coSaleQty' | 'coInvTagAmt' | 'coInvCostAmt' | 'coBaseTagAmt'
  | 'ovSaleAmt' | 'ovTagAmt' | 'ovSalePriceAmt' | 'ovCostAmt'
  | 'lyOrdTagAmt' | 'lyOrdCostAmt' | 'lyOrdTagQR'
  | 'lySaleAmt' | 'lyCoSaleAmt' | 'lyOvSaleAmt' | 'lyTotalSaleAmt'
  | 'lyTagAmt' | 'lySalePriceAmt' | 'lyCostAmt'
  | 'lyCoTagAmt' | 'lyCoSalePriceAmt' | 'lyCoCostAmt'
  | 'ovSaleQty' | 'lyInQty' | 'lySaleQty' | 'lyOvSaleQty'
  | 'cumSaleQty'

const SUM_INIT: Record<SumKeys, number> = {
  ordTagAmt: 0, ordCostAmt: 0, ordTagQR: 0,
  invTagAmt: 0, invCostAmt: 0,
  totalSaleAmt: 0, saleAmt: 0, tagAmt: 0, salePriceAmt: 0, costAmt: 0, saleQty: 0, inQty: 0, inAmt: 0,
  coSaleAmt: 0, coTagAmt: 0, coSalePriceAmt: 0, coCostAmt: 0, coSaleQty: 0, coInvTagAmt: 0, coInvCostAmt: 0, coBaseTagAmt: 0,
  ovSaleAmt: 0, ovTagAmt: 0, ovSalePriceAmt: 0, ovCostAmt: 0,
  lyOrdTagAmt: 0, lyOrdCostAmt: 0, lyOrdTagQR: 0,
  lySaleAmt: 0, lyCoSaleAmt: 0, lyOvSaleAmt: 0, lyTotalSaleAmt: 0,
  lyTagAmt: 0, lySalePriceAmt: 0, lyCostAmt: 0,
  lyCoTagAmt: 0, lyCoSalePriceAmt: 0, lyCoCostAmt: 0,
  ovSaleQty: 0, lyInQty: 0, lySaleQty: 0, lyOvSaleQty: 0,
  cumSaleQty: 0,
}

function sumItems(arr: IpjItem[]): Record<SumKeys, number> {
  return arr.reduce((a, i) => {
    const keys = Object.keys(a) as SumKeys[]
    keys.forEach(k => { a[k] += i[k] as number })
    return a
  }, { ...SUM_INIT })
}

// 비율 계산 헬퍼
function calcRates(s: Record<SumKeys, number>) {
  const costRate = s.ordTagAmt > 0 ? Math.round(s.ordCostAmt / s.ordTagAmt * 1000) / 10 : 0
  const totalSpAmt = s.salePriceAmt + s.coSalePriceAmt + s.ovSalePriceAmt
  const totalTgAmt = s.tagAmt + s.coTagAmt + s.ovTagAmt
  const totalDcRate = totalTgAmt > 0 ? Math.round((1 - totalSpAmt / totalTgAmt) * 1000) / 10 : 0
  const totalCogsRate = s.totalSaleAmt > 0
    ? Math.round((s.costAmt + s.coCostAmt + s.ovCostAmt) / s.totalSaleAmt * 1000) / 10 : 0
  const normDcRate = s.tagAmt > 0 ? Math.round((1 - s.salePriceAmt / s.tagAmt) * 1000) / 10 : 0
  const normCogsRate = s.saleAmt > 0 ? Math.round(s.costAmt / s.saleAmt * 1000) / 10 : 0
  const normSalesRate = (s.inQty - s.ovSaleQty) > 0 ? Math.round(s.saleQty / (s.inQty - s.ovSaleQty) * 1000) / 10 : 0
  const cumSalesRate = (s.inQty - s.ovSaleQty) > 0 ? Math.round(s.cumSaleQty / (s.inQty - s.ovSaleQty) * 1000) / 10 : 0
  const coDcRate = s.coTagAmt > 0 ? Math.round((1 - s.coSalePriceAmt / s.coTagAmt) * 1000) / 10 : 0
  const coCogsRate = s.coSaleAmt > 0 ? Math.round(s.coCostAmt / s.coSaleAmt * 1000) / 10 : 0
  const coSalesRate = s.coBaseTagAmt > 0 ? Math.round(s.coTagAmt / s.coBaseTagAmt * 1000) / 10 : 0
  // 해외사입
  const ovDcRate = s.ovTagAmt > 0 ? Math.round((1 - s.ovSalePriceAmt / s.ovTagAmt) * 1000) / 10 : 0
  const ovCogsRate = s.ovSaleAmt > 0 ? Math.round(s.ovCostAmt / s.ovSaleAmt * 1000) / 10 : 0
  // 전년비
  const lyOrdYoy = s.lyOrdTagAmt > 0 ? Math.round((s.ordTagAmt - s.lyOrdTagAmt) / s.lyOrdTagAmt * 1000) / 10 : null
  const lyQrYoy = s.lyOrdTagQR > 0 ? Math.round((s.ordTagQR - s.lyOrdTagQR) / s.lyOrdTagQR * 1000) / 10 : null
  const lyCostRate = s.lyOrdTagAmt > 0 ? Math.round(s.lyOrdCostAmt / s.lyOrdTagAmt * 1000) / 10 : 0
  // 전년 비율 (해외사입은 전년 TAG 정보 없으므로 정상+이월만)
  const lyTotalDcRate = (s.lyTagAmt + s.lyCoTagAmt) > 0
    ? Math.round((1 - (s.lySalePriceAmt + s.lyCoSalePriceAmt) / (s.lyTagAmt + s.lyCoTagAmt)) * 1000) / 10 : null
  const lyTotalCogsRate = s.lyTotalSaleAmt > 0
    ? Math.round((s.lyCostAmt + s.lyCoCostAmt) / s.lyTotalSaleAmt * 1000) / 10 : null
  const lyNormDcRate = s.lyTagAmt > 0 ? Math.round((1 - s.lySalePriceAmt / s.lyTagAmt) * 1000) / 10 : null
  const lyNormCogsRate = s.lySaleAmt > 0 ? Math.round(s.lyCostAmt / s.lySaleAmt * 1000) / 10 : null
  const lySubCoDcRate = s.lyCoTagAmt > 0 ? Math.round((1 - s.lyCoSalePriceAmt / s.lyCoTagAmt) * 1000) / 10 : null
  const lySubCoCogsRate = s.lyCoSaleAmt > 0 ? Math.round(s.lyCoCostAmt / s.lyCoSaleAmt * 1000) / 10 : null
  // 전년 판매율
  const lyNormSalesRate = (s.lyInQty - s.lyOvSaleQty) > 0 ? Math.round(s.lySaleQty / (s.lyInQty - s.lyOvSaleQty) * 1000) / 10 : null
  return { costRate, totalDcRate, totalCogsRate, normDcRate, normCogsRate, normSalesRate, cumSalesRate, coDcRate, coCogsRate, coSalesRate, ovDcRate, ovCogsRate, lyOrdYoy, lyQrYoy, lyCostRate, lyTotalDcRate, lyTotalCogsRate, lyNormDcRate, lyNormCogsRate, lySubCoDcRate, lySubCoCogsRate, lyNormSalesRate }
}

export default function IpjPage() {
  const { allowedBrands, loading: authLoading } = useAuth()
  const [brand, setBrand] = useState<string | null>(null)
  const apiBrand = brand === 'all' && allowedBrands ? allowedBrands.join(',') : brand
  useEffect(() => {
    if (authLoading) return
    if (allowedBrands?.length === 1) setBrand(allowedBrands[0])
    else setBrand('all')
  }, [allowedBrands, authLoading])
  const [selSeason, setSelSeason] = useState(SEASON_OPTIONS[0])
  const [selGender, setSelGender] = useState<string>('전체')
  const [selCategory, setSelCategory] = useState('전체')
  const todayStr = new Date().toISOString().slice(0, 10)
  const defaultFrom = `20${selSeason.year}-01-01`
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(todayStr)

  // 브랜드별 데이터: 'all' → 전체 합산, 'CO' / 'WA' 등 → 개별
  const [brandData, setBrandData] = useState<Map<string, IpjItem[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const visibleBrands = allowedBrands
    ? [...(allowedBrands.length > 1 ? [{ label: '전체', value: 'all' }] : []),
       ...BRAND_TABS.filter(b => b.value !== 'all' && allowedBrands.includes(b.value))]
    : BRAND_TABS

  // 멀티 브랜드 여부: 권한 브랜드가 2개 이상이고 '전체' 선택 시
  const individualBrands = useMemo(() => {
    if (brand !== 'all') return []
    return BRAND_TABS.filter(b => b.value !== 'all' && (!allowedBrands || allowedBrands.includes(b.value)))
  }, [brand, allowedBrands])

  const fetchData = useCallback(async () => {
    if (brand === null) return
    setLoading(true); setError(null)
    try {
      const fromDt = fromDate.replace(/-/g, '')
      const toDt = toDate.replace(/-/g, '')
      const genderParam = selGender !== '전체' ? `&gender=${encodeURIComponent(selGender)}` : ''
      const base = `/api/planning/ipj?year=${selSeason.year}&season=${selSeason.season}&fromDt=${fromDt}&toDt=${toDt}${genderParam}`

      if (individualBrands.length > 1) {
        // 전체 합산 + 개별 브랜드 병렬 호출
        const fetches = [
          fetch(`${base}&brand=${apiBrand}`).then(r => r.json()),
          ...individualBrands.map(b => fetch(`${base}&brand=${b.value}`).then(r => r.json())),
        ]
        const results = await Promise.all(fetches)
        const map = new Map<string, IpjItem[]>()
        map.set('all', results[0].items ?? [])
        individualBrands.forEach((b, i) => map.set(b.value, results[i + 1].items ?? []))
        setBrandData(map)
      } else {
        // 단일 브랜드
        const res = await fetch(`${base}&brand=${apiBrand}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        const map = new Map<string, IpjItem[]>()
        map.set(brand!, json.items ?? [])
        setBrandData(map)
      }
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [brand, apiBrand, selSeason, fromDate, toDate, selGender, individualBrands])

  useEffect(() => { fetchData() }, [fetchData])

  // 성인/키즈 브랜드 분류
  const ADULT_BRANDS = ['CO', 'LE', 'WA']
  const KIDS_BRANDS = ['CK', 'LK']

  type BrandSection = { key: string; label: string; items: IpjItem[]; totals: Record<SumKeys, number>; indent?: number; isSummary?: boolean }

  // 브랜드별 필터링 + 성인/키즈 그룹
  const brandSections = useMemo(() => {
    const sections: BrandSection[] = []
    const filterItems = (arr: IpjItem[]) => selCategory === '전체' ? arr : arr.filter(i => i.category === selCategory)

    // TOTAL (전체 합산)
    const allItems = brandData.get('all') ?? brandData.get(brand!) ?? []
    const filtered = filterItems(allItems)
    sections.push({ key: 'all', label: 'TOTAL', items: filtered, totals: sumItems(filtered), isSummary: true })

    if (individualBrands.length > 1) {
      // 성인 합산
      const adultBrands = individualBrands.filter(b => ADULT_BRANDS.includes(b.value))
      const kidsBrands = individualBrands.filter(b => KIDS_BRANDS.includes(b.value))

      if (adultBrands.length > 0) {
        const adultItems = filterItems(adultBrands.flatMap(b => brandData.get(b.value) ?? []))
        sections.push({ key: 'adult', label: '성인 합산', items: adultItems, totals: sumItems(adultItems), isSummary: true })
        for (const b of adultBrands) {
          const items = brandData.get(b.value)
          if (!items) continue
          const f = filterItems(items)
          if (f.length === 0) continue
          sections.push({ key: b.value, label: b.label, items: f, totals: sumItems(f), indent: 1 })
        }
      }

      if (kidsBrands.length > 0) {
        const kidsItems = filterItems(kidsBrands.flatMap(b => brandData.get(b.value) ?? []))
        sections.push({ key: 'kids', label: '키즈 합산', items: kidsItems, totals: sumItems(kidsItems), isSummary: true })
        for (const b of kidsBrands) {
          const items = brandData.get(b.value)
          if (!items) continue
          const f = filterItems(items)
          if (f.length === 0) continue
          sections.push({ key: b.value, label: b.label, items: f, totals: sumItems(f), indent: 1 })
        }
      }
    } else {
      // 단일 브랜드 — 바로 표시
      const items = brandData.get(brand!) ?? []
      const f = filterItems(items)
      sections[0] = { key: brand!, label: BRAND_TABS.find(b => b.value === brand)?.label ?? brand!, items: f, totals: sumItems(f), isSummary: true }
    }

    return sections
  }, [brandData, selCategory, brand, individualBrands])

  // 첫 번째 섹션(TOTAL)의 totals를 발주비중 계산에 사용
  const grandTotals = brandSections[0]?.totals ?? { ...SUM_INIT }

  // 정렬 헬퍼: 아이템에서 정렬값 추출
  const getSortVal = useCallback((r: IpjItem): number => {
    if (!sortKey) return r.ordTagAmt
    // 계산 컬럼
    if (sortKey === 'totalInvTag') return r.inAmt + r.coInvTagAmt
    if (sortKey === 'totalInvCost') return r.ordCostAmt + r.coInvCostAmt
    if (sortKey === 'inRate') return r.ordTagAmt > 0 ? r.inAmt / r.ordTagAmt : 0
    if (sortKey === 'qrRate') return r.ordTagAmt > 0 ? r.ordTagQR / r.ordTagAmt : 0
    if (sortKey === 'normRatio') return r.totalSaleAmt > 0 ? r.saleAmt / r.totalSaleAmt : 0
    if (sortKey === 'coRatio') return r.totalSaleAmt > 0 ? r.coSaleAmt / r.totalSaleAmt : 0
    if (sortKey === 'cumSalesRate') return r.cumSalesRate
    return (r as unknown as Record<string, number>)[sortKey] ?? 0
  }, [sortKey])

  const getSubSortVal = useCallback((s: Record<SumKeys, number>): number => {
    if (!sortKey) return s.ordTagAmt
    if (sortKey === 'totalInvTag') return s.inAmt + s.coInvTagAmt
    if (sortKey === 'totalInvCost') return s.ordCostAmt + s.coInvCostAmt
    if (sortKey === 'inRate') return s.ordTagAmt > 0 ? s.inAmt / s.ordTagAmt : 0
    if (sortKey === 'qrRate') return s.ordTagAmt > 0 ? s.ordTagQR / s.ordTagAmt : 0
    if (sortKey === 'normRatio') return s.totalSaleAmt > 0 ? s.saleAmt / s.totalSaleAmt : 0
    if (sortKey === 'coRatio') return s.totalSaleAmt > 0 ? s.coSaleAmt / s.totalSaleAmt : 0
    if (sortKey === 'cumSalesRate') return (s.inQty - s.ovSaleQty) > 0 ? s.cumSaleQty / (s.inQty - s.ovSaleQty) : 0
    return (s as Record<string, number>)[sortKey] ?? 0
  }, [sortKey])

  // 섹션별 카테고리 그루핑 함수
  const groupItems = useCallback((items: IpjItem[]) => {
    const map = new Map<string, IpjItem[]>()
    items.forEach(i => {
      const arr = map.get(i.category) || []
      arr.push(i)
      map.set(i.category, arr)
    })
    const mul = sortDir === 'desc' ? -1 : 1
    const result: { category: string; items: IpjItem[]; sub: Record<SumKeys, number> }[] = []
    map.forEach((items, cat) => {
      const sorted = [...items].sort((a, b) => (getSortVal(a) - getSortVal(b)) * mul)
      result.push({ category: cat, items: sorted, sub: sumItems(items) })
    })
    return result.sort((a, b) => (getSubSortVal(a.sub) - getSubSortVal(b.sub)) * mul)
  }, [getSortVal, getSubSortVal, sortDir])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleCat = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }
  // 브랜드 섹션 접기/펼치기
  // 초기 상태: 브랜드 접힌 상태
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set(['CO', 'LE', 'WA', 'CK', 'LK', 'all', 'adult', 'kids']))
  const toggleBrandSection = (key: string) => {
    setCollapsedBrands(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }
  const expandAll = () => { setExpanded(new Set(brandSections.flatMap(s => groupItems(s.items).map(g => `${s.key}::${g.category}`)))); setCollapsedBrands(new Set()) }
  const collapseAll = () => { setExpanded(new Set()); setCollapsedBrands(new Set(brandSections.map(s => s.key))) }

  const pct = (v: number, total: number) => total > 0 ? (v / total * 100).toFixed(1) : '0.0'

  // 정렬 가능한 헤더 셀
  const SortTh = ({ k, children, className: cls, ...rest }: { k: string; children: React.ReactNode; className?: string } & React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th {...rest} className={cn(cls, 'cursor-pointer select-none hover:bg-gray-500/30 transition-colors')} onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-0.5">
        {children}
        {sortKey === k && <span className="text-[8px] text-gray-300">{sortDir === 'desc' ? '▼' : '▲'}</span>}
      </span>
    </th>
  )

  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    Outer: <Shirt size={12} />,
    Top: <Shirt size={12} />,
    Bottom: <ArrowDown size={12} />,
    Bag: <ShoppingBag size={12} />,
    Shoes: <Footprints size={12} />,
    ACC: <Watch size={12} />,
    'Set/Dress': <Gift size={12} />,
    Beauty: <Sparkles size={12} />,
    '기타': <MoreHorizontal size={12} />,
  }

  const downloadExcel = () => {
    const allItems = brandSections.flatMap(s => s.items.map(r => ({ ...r, _brand: s.label })))
    const rows = allItems.map(r => ({
      '브랜드': (r as any)._brand,
      '카테고리': r.category, '품목': r.item,
      '총재고TAG': r.invTagAmt, '총재고원가': r.invCostAmt,
      '정상입고TAG': r.ordTagAmt, '정상입고QR': r.ordTagQR,
      '정상입고원가': r.ordCostAmt, '정상입고원가율': r.ordTagAmt > 0 ? (r.ordCostAmt / r.ordTagAmt * 100).toFixed(1) : 0,
      '총매출': r.totalSaleAmt,
      '총할인율': ((r.tagAmt + r.coTagAmt + r.ovTagAmt) > 0 ? (1 - (r.salePriceAmt + r.coSalePriceAmt + r.ovSalePriceAmt) / (r.tagAmt + r.coTagAmt + r.ovTagAmt)) * 100 : 0).toFixed(1),
      '총원가율': r.totalSaleAmt > 0 ? ((r.costAmt + r.coCostAmt + r.ovCostAmt) / r.totalSaleAmt * 100).toFixed(1) : 0,
      '정상할인율': r.dcRate, '정상원가율': r.cogsRate, '정상판매율': r.salesRate,
      '이월할인율': r.coDcRate, '이월원가율': r.coCogsRate,
      '해외사입매출': r.ovSaleAmt, '해외사입할인율': r.ovDcRate,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '입판재현황')
    XLSX.writeFile(wb, `입판재현황_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 셀 스타일 헬퍼
  const cellBase = 'py-2 px-1.5 text-right font-mono text-[11px] whitespace-nowrap'
  const headCell = 'py-2 px-1.5 text-right text-[11px] font-medium whitespace-nowrap'

  // 전년비 렌더링 헬퍼 (금액: % 증감)
  const renderYoy = (cur: number, prev: number) => {
    if (prev <= 0) return '—'
    const yoy = Math.round((cur - prev) / prev * 1000) / 10
    return <span className={cn('text-[11px] font-semibold', yoy >= 0 ? 'text-red-600' : 'text-blue-600')}>{yoy >= 0 ? '+' : ''}{yoy}%</span>
  }
  // 전년비 렌더링 헬퍼 (비율: %p 차이)
  const renderPtDiff = (cur: number, prev: number | null) => {
    if (prev === null) return '—'
    const diff = Math.round((cur - prev) * 10) / 10
    if (diff === 0) return <span className="text-[11px] text-gray-400">0p</span>
    return <span className={cn('text-[11px] font-semibold', diff > 0 ? 'text-red-600' : 'text-blue-600')}>{diff > 0 ? '+' : ''}{diff}p</span>
  }


  // 데이터 행 렌더링
  const renderRow = (r: IpjItem, idx: number, secTotal: Record<SumKeys, number> = { ...SUM_INIT }) => {
    const itemYoy = r.lyOrdTagAmt > 0 ? Math.round((r.ordTagAmt - r.lyOrdTagAmt) / r.lyOrdTagAmt * 1000) / 10 : null
    const itemCostRate = r.ordTagAmt > 0 ? Math.round(r.ordCostAmt / r.ordTagAmt * 1000) / 10 : 0
    const itemTotalSpAmt = r.salePriceAmt + r.coSalePriceAmt + r.ovSalePriceAmt
    const itemTotalTgAmt = r.tagAmt + r.coTagAmt + r.ovTagAmt
    const itemTotalDcRate = itemTotalTgAmt > 0
      ? Math.round((1 - itemTotalSpAmt / itemTotalTgAmt) * 1000) / 10 : 0
    const itemTotalCogsRate = r.totalSaleAmt > 0
      ? Math.round((r.costAmt + r.coCostAmt + r.ovCostAmt) / r.totalSaleAmt * 1000) / 10 : 0
    const coSalesRate = r.coBaseTagAmt > 0 ? Math.round(r.coTagAmt / r.coBaseTagAmt * 1000) / 10 : 0
    // 전년 비율
    const lyTotalDcRate = (r.lyTagAmt + r.lyCoTagAmt) > 0
      ? Math.round((1 - (r.lySalePriceAmt + r.lyCoSalePriceAmt) / (r.lyTagAmt + r.lyCoTagAmt)) * 1000) / 10 : null
    const lyTotalCogsRate = r.lyTotalSaleAmt > 0
      ? Math.round((r.lyCostAmt + r.lyCoCostAmt) / r.lyTotalSaleAmt * 1000) / 10 : null
    const lyDcRate = r.lyTagAmt > 0 ? Math.round((1 - r.lySalePriceAmt / r.lyTagAmt) * 1000) / 10 : null
    const lyCogsRate = r.lySaleAmt > 0 ? Math.round(r.lyCostAmt / r.lySaleAmt * 1000) / 10 : null
    const lyCoDcRate = r.lyCoTagAmt > 0 ? Math.round((1 - r.lyCoSalePriceAmt / r.lyCoTagAmt) * 1000) / 10 : null
    const lyCoCogsRate = r.lyCoSaleAmt > 0 ? Math.round(r.lyCoCostAmt / r.lyCoSaleAmt * 1000) / 10 : null
    const bg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

    return (
      <tr key={r.item} className={cn('border-b border-gray-100 hover:bg-blue-50/30 transition-colors', bg)}>
        <td className={cn('py-2 px-1 sticky left-0 z-10 w-[32px] min-w-[32px] max-w-[32px]', bg)} />
        <td className={cn('py-2 px-1 pl-4 text-gray-700 whitespace-nowrap sticky left-[32px] z-10 text-xs border-r-2 border-gray-200 w-[120px] min-w-[120px]', bg)} style={{ boxShadow: '6px 0 12px -2px rgba(0,0,0,0.12)' }}>{r.item}</td>
        {/* 총 재고 = 당시즌 입고 + 이월재고 */}
        <td className={cn(cellBase, 'text-gray-800 font-semibold')}>{fmtE(r.inAmt + r.coInvTagAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{fmtE(r.ordCostAmt + r.coInvCostAmt)}</td>
        {/* 당시즌 입고 */}
        <td className={cn(cellBase, 'text-gray-800')}>{fmtE(r.ordTagAmt)}</td>
        <td className={cellBase}>
          {itemYoy !== null ? (
            <span className={cn('text-[11px] font-semibold', itemYoy >= 0 ? 'text-red-600' : 'text-blue-600')}>
              {itemYoy >= 0 ? '+' : ''}{itemYoy}%
            </span>
          ) : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-400')}>{secTotal.ordTagAmt > 0 ? `${(r.ordTagAmt / secTotal.ordTagAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-800')}>{fmtE(r.inAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>
          {r.ordTagAmt > 0 ? `${(r.inAmt / r.ordTagAmt * 100).toFixed(1)}%` : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-700')}>{fmtE(r.ordTagQR)}</td>
        <td className={cellBase}>
          {r.lyOrdTagQR > 0 ? (() => {
            const qrYoy = Math.round((r.ordTagQR - r.lyOrdTagQR) / r.lyOrdTagQR * 1000) / 10
            return <span className={cn('text-[11px] font-semibold', qrYoy >= 0 ? 'text-red-600' : 'text-blue-600')}>{qrYoy >= 0 ? '+' : ''}{qrYoy}%</span>
          })() : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.ordTagAmt > 0 ? `${(r.ordTagQR / r.ordTagAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{fmtE(r.ordCostAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{itemCostRate}%</td>
        {/* 이월재고 */}
        <td className={cn(cellBase, 'text-gray-700')}>{r.coInvTagAmt ? fmtE(r.coInvTagAmt) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.coInvCostAmt ? fmtE(r.coInvCostAmt) : '—'}</td>
        {/* 총 매출 */}
        <td className={cn(cellBase, 'text-gray-800 font-semibold bg-gray-100')}>{fmtE(r.totalSaleAmt)}</td>
        <td className={cellBase}>{renderYoy(r.totalSaleAmt, r.lyTotalSaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{itemTotalDcRate}%</td>
        <td className={cellBase}>{renderPtDiff(itemTotalDcRate, lyTotalDcRate)}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{itemTotalCogsRate}%</td>
        <td className={cellBase}>{renderPtDiff(itemTotalCogsRate, lyTotalCogsRate)}</td>
        {/* 정상 매출 */}
        <td className={cn(cellBase, 'text-gray-700 bg-gray-100')}>{fmtE(r.saleAmt)}</td>
        <td className={cellBase}>{renderYoy(r.saleAmt, r.lySaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.totalSaleAmt > 0 ? `${(r.saleAmt / r.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-700')}>{r.dcRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.dcRate, lyDcRate)}</td>
        <td className={cn(cellBase, 'text-gray-700')}>{r.cogsRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.cogsRate, lyCogsRate)}</td>
        <td className={cn(cellBase, 'text-gray-700 font-semibold')}>{r.salesRate}%</td>
        <td className={cellBase}>{r.lySalesRate != null ? renderPtDiff(r.salesRate, r.lySalesRate) : '—'}</td>
        <td className={cn(cellBase, 'font-semibold', r.cumSalesRate >= 70 ? 'text-emerald-600' : r.cumSalesRate >= 40 ? 'text-amber-600' : r.cumSalesRate > 0 ? 'text-red-600' : 'text-gray-400')}>{r.cumSalesRate > 0 ? `${r.cumSalesRate}%` : '—'}</td>
        {/* 이월 매출 */}
        <td className={cn(cellBase, 'text-gray-600 bg-gray-100')}>{r.coSaleAmt ? fmtE(r.coSaleAmt) : '—'}</td>
        <td className={cellBase}>{renderYoy(r.coSaleAmt, r.lyCoSaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.totalSaleAmt > 0 && r.coSaleAmt ? `${(r.coSaleAmt / r.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.coSaleAmt ? `${r.coDcRate}%` : '—'}</td>
        <td className={cellBase}>{r.coSaleAmt ? renderPtDiff(r.coDcRate, lyCoDcRate) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.coSaleAmt ? `${r.coCogsRate}%` : '—'}</td>
        <td className={cellBase}>{r.coSaleAmt ? renderPtDiff(r.coCogsRate, lyCoCogsRate) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{coSalesRate > 0 ? `${coSalesRate}%` : '—'}</td>
        {/* 해외사입 */}
        <td className={cn(cellBase, 'text-amber-700 bg-amber-50')}>{r.ovSaleAmt ? fmtE(r.ovSaleAmt) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.totalSaleAmt > 0 && r.ovSaleAmt ? `${(r.ovSaleAmt / r.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.ovSaleAmt ? `${r.ovDcRate}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.ovSaleAmt ? `${r.ovCogsRate}%` : '—'}</td>
      </tr>
    )
  }

  // 소계 행 렌더링
  const renderSubRow = (s: Record<SumKeys, number>, label: React.ReactNode, isTotal?: boolean, secTotal: Record<SumKeys, number> = { ...SUM_INIT }) => {
    const r = calcRates(s)
    const rowCls = isTotal
      ? 'bg-gray-100 font-semibold border-b-2 border-gray-300'
      : 'bg-gray-50 font-semibold border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors'
    const stickyCls = isTotal ? 'bg-gray-100' : 'bg-gray-50'

    return (
      <>
        <td className={cn('py-2 px-1 sticky left-0 z-10 w-[32px] min-w-[32px] max-w-[32px]', stickyCls)}>{!isTotal && typeof label === 'object' ? null : ''}</td>
        <td className={cn('py-2 px-1 sticky left-[32px] z-10 whitespace-nowrap text-xs border-r-2 border-gray-200 w-[120px] min-w-[120px]', stickyCls)} style={{ boxShadow: '6px 0 12px -2px rgba(0,0,0,0.12)' }}>{label}</td>
        {/* 총 재고 = 당시즌 입고 + 이월재고 */}
        <td className={cn(cellBase, 'font-semibold text-gray-900')}>{fmtE(s.inAmt + s.coInvTagAmt)}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{fmtE(s.ordCostAmt + s.coInvCostAmt)}</td>
        {/* 당시즌 입고 */}
        <td className={cn(cellBase, 'text-gray-900')}>{fmtE(s.ordTagAmt)}</td>
        <td className={cellBase}>
          {r.lyOrdYoy !== null ? (
            <span className={cn('text-[11px] font-semibold', r.lyOrdYoy >= 0 ? 'text-red-600' : 'text-blue-600')}>
              {r.lyOrdYoy >= 0 ? '+' : ''}{r.lyOrdYoy}%
            </span>
          ) : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-400')}>{secTotal.ordTagAmt > 0 ? `${(s.ordTagAmt / secTotal.ordTagAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-900')}>{fmtE(s.inAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>
          {s.ordTagAmt > 0 ? `${(s.inAmt / s.ordTagAmt * 100).toFixed(1)}%` : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-700')}>{fmtE(s.ordTagQR)}</td>
        <td className={cellBase}>
          {r.lyQrYoy !== null ? (
            <span className={cn('text-[11px] font-semibold', r.lyQrYoy >= 0 ? 'text-red-600' : 'text-blue-600')}>
              {r.lyQrYoy >= 0 ? '+' : ''}{r.lyQrYoy}%
            </span>
          ) : '—'}
        </td>
        <td className={cn(cellBase, 'text-gray-500')}>{s.ordTagAmt > 0 ? `${(s.ordTagQR / s.ordTagAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{fmtE(s.ordCostAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{r.costRate}%</td>
        {/* 이월재고 */}
        <td className={cn(cellBase, 'text-gray-700')}>{s.coInvTagAmt ? fmtE(s.coInvTagAmt) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{s.coInvCostAmt ? fmtE(s.coInvCostAmt) : '—'}</td>
        {/* 총 매출 */}
        <td className={cn(cellBase, 'font-semibold text-gray-900 bg-gray-200')}>{fmtE(s.totalSaleAmt)}</td>
        <td className={cellBase}>{renderYoy(s.totalSaleAmt, s.lyTotalSaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.totalDcRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.totalDcRate, r.lyTotalDcRate)}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.totalCogsRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.totalCogsRate, r.lyTotalCogsRate)}</td>
        {/* 정상 매출 */}
        <td className={cn(cellBase, 'text-gray-700 bg-gray-200')}>{fmtE(s.saleAmt)}</td>
        <td className={cellBase}>{renderYoy(s.saleAmt, s.lySaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{s.totalSaleAmt > 0 ? `${(s.saleAmt / s.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-700')}>{r.normDcRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.normDcRate, r.lyNormDcRate)}</td>
        <td className={cn(cellBase, 'text-gray-700')}>{r.normCogsRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.normCogsRate, r.lyNormCogsRate)}</td>
        <td className={cn(cellBase, 'text-gray-700 font-semibold')}>{r.normSalesRate}%</td>
        <td className={cellBase}>{renderPtDiff(r.normSalesRate, r.lyNormSalesRate)}</td>
        <td className={cn(cellBase, 'font-semibold', r.cumSalesRate >= 70 ? 'text-emerald-600' : r.cumSalesRate >= 40 ? 'text-amber-600' : r.cumSalesRate > 0 ? 'text-red-600' : 'text-gray-400')}>{r.cumSalesRate > 0 ? `${r.cumSalesRate}%` : '—'}</td>
        {/* 이월 매출 */}
        <td className={cn(cellBase, 'text-gray-600 bg-gray-200')}>{s.coSaleAmt ? fmtE(s.coSaleAmt) : '—'}</td>
        <td className={cellBase}>{renderYoy(s.coSaleAmt, s.lyCoSaleAmt)}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{s.totalSaleAmt > 0 && s.coSaleAmt ? `${(s.coSaleAmt / s.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{s.coSaleAmt ? `${r.coDcRate}%` : '—'}</td>
        <td className={cellBase}>{s.coSaleAmt ? renderPtDiff(r.coDcRate, r.lySubCoDcRate) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{s.coSaleAmt ? `${r.coCogsRate}%` : '—'}</td>
        <td className={cellBase}>{s.coSaleAmt ? renderPtDiff(r.coCogsRate, r.lySubCoCogsRate) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{r.coSalesRate > 0 ? `${r.coSalesRate}%` : '—'}</td>
        {/* 해외사입 */}
        <td className={cn(cellBase, 'text-amber-700 bg-amber-100')}>{s.ovSaleAmt ? fmtE(s.ovSaleAmt) : '—'}</td>
        <td className={cn(cellBase, 'text-gray-500')}>{s.totalSaleAmt > 0 && s.ovSaleAmt ? `${(s.ovSaleAmt / s.totalSaleAmt * 100).toFixed(1)}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{s.ovSaleAmt ? `${r.ovDcRate}%` : '—'}</td>
        <td className={cn(cellBase, 'text-gray-600')}>{s.ovSaleAmt ? `${r.ovCogsRate}%` : '—'}</td>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 min-h-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">입판재현황</h1>
          <p className="text-xs text-gray-400 mt-0.5">재고 · 입고 · 매출 종합 현황</p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll}
            className="text-[10px] text-gray-400 hover:text-gray-600 border border-surface-border rounded-lg px-2 py-1.5 hover:bg-surface-subtle">전체 펼치기</button>
          <button onClick={collapseAll}
            className="text-[10px] text-gray-400 hover:text-gray-600 border border-surface-border rounded-lg px-2 py-1.5 hover:bg-surface-subtle">전체 접기</button>
          <button onClick={downloadExcel}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle transition-colors">
            <Download size={12} /> Excel
          </button>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-surface-border rounded-lg px-2.5 py-1.5 hover:bg-surface-subtle transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 새로고침
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400">브랜드</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {visibleBrands.map(b => (
            <button key={b.value} onClick={() => setBrand(b.value)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                brand === b.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {b.value !== 'all' && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-px" style={{ background: BRAND_COLORS[b.value] }} />}
              {b.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">시즌</span>
        <select value={SEASON_OPTIONS.indexOf(selSeason)}
          onChange={e => setSelSeason(SEASON_OPTIONS[Number(e.target.value)])}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
          {SEASON_OPTIONS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
        </select>

        <span className="text-xs text-gray-400 ml-2">기간</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />
        <span className="text-xs text-gray-300">~</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white" />

        <span className="text-xs text-gray-400 ml-2">품목</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {ITEM_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelCategory(cat)}
              className={cn('px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                selCategory === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {cat}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-400 ml-2">성별</span>
        <div className="flex gap-0.5 bg-surface-subtle rounded-lg p-0.5">
          {GENDER_FILTERS.map(g => (
            <button key={g} onClick={() => setSelGender(g)}
              className={cn('px-2 py-1 text-[11px] font-medium rounded-md transition-colors',
                selGender === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>}

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-surface-border shadow-sm p-3">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse" style={{ minWidth: 2160 }}>
              <thead>
                {/* 1행: 대분류 — 2개 큰 그룹 */}
                <tr className="bg-gray-800">
                  <th rowSpan={3} className="text-center text-[11px] text-gray-300 font-bold py-1 sticky left-0 bg-gray-800 z-20 w-[32px] min-w-[32px] max-w-[32px]">구분</th>
                  <th rowSpan={3} className="text-center text-[11px] text-gray-300 font-bold py-1 sticky left-[32px] bg-gray-800 z-20 w-[120px] min-w-[120px] border-r-2 border-gray-500" style={{ boxShadow: '6px 0 12px -2px rgba(0,0,0,0.25)' }}>품목</th>
                  <th colSpan={14} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-600">총 재고 TAG 금액</th>
                  <th colSpan={28} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-600">총 매출</th>
                </tr>
                {/* 2행: 중분류 */}
                <tr className="bg-gray-700">
                  <SortTh k="totalInvTag" rowSpan={2} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-500 bg-gray-800">TAG</SortTh>
                  <SortTh k="totalInvCost" rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">제조<br/>원가</SortTh>
                  <th colSpan={10} className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">당시즌 입고</th>
                  <th colSpan={2} className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">이월재고</th>
                  <SortTh k="totalSaleAmt" rowSpan={2} className="text-center text-[11px] text-gray-200 font-bold py-1.5 border-l border-gray-500 bg-gray-800">매출액</SortTh>
                  <th rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">전년비</th>
                  <th rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">할인율</th>
                  <th rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">전년비</th>
                  <th rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">매출<br/>원가율</th>
                  <th rowSpan={2} className="text-center text-[11px] text-gray-300 font-bold py-1.5 bg-gray-800">전년비</th>
                  <th colSpan={10} className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">정상 매출</th>
                  <th colSpan={8} className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">이월 매출</th>
                  <th colSpan={4} className="text-center text-[11px] text-amber-300 font-medium py-1.5 border-l border-gray-500">해외사입</th>
                </tr>
                {/* 3행: 세부 컬럼 */}
                <tr className="border-b-2 border-gray-300 bg-gray-600">
                  {/* 당시즌 입고 */}
                  <SortTh k="ordTagAmt" className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">발주금액</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">비중</th>
                  <SortTh k="inAmt" className="text-center text-[11px] text-gray-300 font-medium py-1.5">입고금액</SortTh>
                  <SortTh k="inRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">입고율</SortTh>
                  <SortTh k="ordTagQR" className="text-center text-[11px] text-gray-300 font-medium py-1.5">QR금액</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="qrRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">QR비중</SortTh>
                  <SortTh k="ordCostAmt" className="text-center text-[11px] text-gray-400 font-medium py-1.5">제조<br/>원가</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">제조<br/>원가율</th>
                  {/* 이월재고 */}
                  <SortTh k="coInvTagAmt" className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">TAG</SortTh>
                  <SortTh k="coInvCostAmt" className="text-center text-[11px] text-gray-400 font-medium py-1.5">제조<br/>원가</SortTh>
                  {/* 정상 매출 */}
                  <SortTh k="saleAmt" className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">매출액</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="normRatio" className="text-center text-[11px] text-gray-400 font-medium py-1.5">비중</SortTh>
                  <SortTh k="dcRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">할인율</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="cogsRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">매출<br/>원가율</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="salesRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">판매율</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="cumSalesRate" className="text-center text-[11px] text-emerald-300 font-medium py-1.5">누계<br/>판매율</SortTh>
                  {/* 이월 매출 */}
                  <SortTh k="coSaleAmt" className="text-center text-[11px] text-gray-300 font-medium py-1.5 border-l border-gray-500">매출액</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="coRatio" className="text-center text-[11px] text-gray-400 font-medium py-1.5">비중</SortTh>
                  <SortTh k="coDcRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">할인율</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <SortTh k="coCogsRate" className="text-center text-[11px] text-gray-400 font-medium py-1.5">매출<br/>원가율</SortTh>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">전년비</th>
                  <th className="text-center text-[11px] text-gray-400 font-medium py-1.5">판매율</th>
                  {/* 해외사입 */}
                  <SortTh k="ovSaleAmt" className="text-center text-[11px] text-amber-300 font-medium py-1.5 border-l border-gray-500">매출액</SortTh>
                  <th className="text-center text-[11px] text-amber-400/70 font-medium py-1.5">비중</th>
                  <th className="text-center text-[11px] text-amber-400/70 font-medium py-1.5">할인율</th>
                  <th className="text-center text-[11px] text-amber-400/70 font-medium py-1.5">매출<br/>원가율</th>
                </tr>
              </thead>
              <tbody>
                {brandSections.map((sec) => {
                  const grouped = groupItems(sec.items)
                  const isSummary = sec.isSummary
                  const isTotal = sec.key === 'all'
                  const isGroupSummary = sec.key === 'adult' || sec.key === 'kids'
                  const isBrand = !isSummary
                  const isBrandCollapsed = collapsedBrands.has(sec.key)
                  const indent = (sec as any).indent ?? 0

                  return (
                    <Fragment key={sec.key}>
                      {/* 합산/브랜드 행 */}
                      <tr className={cn('font-semibold cursor-pointer',
                          isTotal ? 'bg-gray-100 border-b-2 border-gray-300 hover:bg-gray-200/50' :
                          isGroupSummary ? 'bg-gray-50 border-b-2 border-gray-200 hover:bg-gray-100' :
                          'bg-white border-b border-gray-200 hover:bg-gray-100')}
                        onClick={() => toggleBrandSection(sec.key)}>
                        {renderSubRow(sec.totals, (
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: indent * 16 }}>
                            {isBrandCollapsed
                              ? <ChevronRight size={12} className="text-gray-400" />
                              : <ChevronDown size={12} className="text-gray-400" />}
                            <span className={cn('text-xs font-bold', isTotal ? 'text-gray-900' : isGroupSummary ? 'text-gray-800' : 'text-gray-700')}>{sec.label}</span>
                          </div>
                        ), isTotal || isGroupSummary, sec.totals)}
                      </tr>
                      {/* 카테고리별 펼침 */}
                      {!isBrandCollapsed && grouped.map(g => {
                        const expandKey = `${sec.key}::${g.category}`
                        const isOpen = expanded.has(expandKey)
                        return (
                          <Fragment key={expandKey}>
                            <tr onClick={() => { setExpanded(prev => { const n = new Set(prev); if (n.has(expandKey)) n.delete(expandKey); else n.add(expandKey); return n }) }}
                              className="bg-gray-50/50 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                              {renderSubRow(g.sub, (
                                <div className="flex items-center gap-1.5" style={{ paddingLeft: (indent + 1) * 16 }}>
                                  {isOpen ? <ChevronDown size={10} className="text-gray-300" /> : <ChevronRight size={10} className="text-gray-300" />}
                                  <span className="text-[11px] font-semibold text-gray-600">{g.category}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">{g.items.length}</span>
                                </div>
                              ), false, sec.totals)}
                            </tr>
                            {isOpen && g.items.map((r, i) => renderRow(r, i, sec.totals))}
                          </Fragment>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
