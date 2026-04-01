// 매출 대시보드 공통 타입 & 유틸리티

export type ChannelGroup = '오프라인' | '온라인' | '해외'
export const CHANNEL_GROUP_ORDER: ChannelGroup[] = ['오프라인', '온라인', '해외']
export const CHANNEL_GROUP_COLORS: Record<ChannelGroup, string> = {
  '오프라인': '#3b82f6',
  '온라인':   '#e91e63',
  '해외':     '#10b981',
}

export function getChannelGroup(nm: string): ChannelGroup {
  const n = (nm ?? '').trim().toLowerCase().replace(/\s/g, '')
  if (n.includes('해외') || n.includes('global') || n.includes('수출')) return '해외'
  if (
    n.includes('백화점') || n.includes('아울렛') || n.includes('가두') ||
    n.includes('직영') || n.includes('대리') || n.includes('면세') ||
    n.includes('팝업') || n.includes('편집') || n.includes('오프') ||
    n.includes('로드샵') || n.includes('부티크') || n.includes('쇼핑몰') || n.includes('사입')
  ) return '오프라인'
  return '온라인'
}

// 포맷 (매출 대시보드 전용)
export function fmt(v: number): string {
  if (v === 0) return '0'
  const sign = v < 0 ? '-' : ''
  return `${sign}${Math.round(Math.abs(v) / 1_000_000).toLocaleString()}백만`
}
export function pct(num: number, den: number): number | null {
  return den ? Math.round(num / den * 1000) / 10 : null
}

// 타입
export interface WeekPoint { weekNum: number; weekStart: string | null; cy: number | null; ly: number | null; qty: number | null; dcRate: number | null; lyDcRate: number | null }
export interface WeeklyMeta { cyTotal: number; lyTotal: number; maxWeek: number }
export interface Product { code: string; name: string; brand: string; revenue: number; qty: number; tagTotal: number; saleTotal: number; dcRate: number | null; cwRev: number; pwRev: number }

export interface PerfRow {
  brandcd: string; brandnm: string; shoptypenm: string
  mtdRev: number; mtdTag: number; mtdSale: number; mtdCost: number
  cwRev: number; cwTag: number; cwSale: number; cwCost: number
  pwRev: number; pwTag: number; pwSale: number; pwCost: number
}
export interface PerfData {
  cy: PerfRow[]; ly: PerfRow[]
  meta: { cwStart: string; cwEnd: string; pwStart: string; pwEnd: string; monthStart: string; monthEnd: string; monthLabel: string; cwLabel: string }
}

export type Agg = Omit<PerfRow, 'brandcd' | 'brandnm' | 'shoptypenm'>
export function sumAgg(rows: PerfRow[]): Agg {
  const z: Agg = { mtdRev:0,mtdTag:0,mtdSale:0,mtdCost:0,cwRev:0,cwTag:0,cwSale:0,cwCost:0,pwRev:0,pwTag:0,pwSale:0,pwCost:0 }
  for (const r of rows) {
    z.mtdRev+=r.mtdRev; z.mtdTag+=r.mtdTag; z.mtdSale+=r.mtdSale; z.mtdCost+=r.mtdCost
    z.cwRev+=r.cwRev; z.cwTag+=r.cwTag; z.cwSale+=r.cwSale; z.cwCost+=r.cwCost
    z.pwRev+=r.pwRev; z.pwTag+=r.pwTag; z.pwSale+=r.pwSale; z.pwCost+=r.pwCost
  }
  return z
}
export function dcRate(tag: number, sale: number) { return tag > 0 ? (1 - sale / tag) * 100 : 0 }
export function cogsRate(rev: number, cost: number) { return rev > 0 ? (cost / rev) * 100 : 0 }

export interface PerfMetrics {
  target: number | null; mtdRev: number; achPct: number | null
  forecast: number | null; forecastAch: number | null
  mtdDc: number; mtdCogs: number
  cwRev: number; wow: number; wowPct: number | null; cwDc: number; cwCogs: number
  cwYoy: number; cwYoyPct: number | null  // 주간 YoY
  yoy: number; yoyPct: number | null; dcChg: number; cogsChg: number
  lyMtdRev: number
}

export interface MonthProgress { daysElapsed: number; daysTotal: number }

export function calcForecast(cy: Agg, ly: Agg, mp: MonthProgress | null): number | null {
  if (!mp || mp.daysElapsed <= 0 || cy.mtdRev <= 0) return null
  const { daysElapsed, daysTotal } = mp
  const daysRemaining = daysTotal - daysElapsed
  const dailyAvg = cy.mtdRev / daysElapsed
  let momentumAdj = 1
  if (cy.pwRev > 0 && cy.cwRev > 0) {
    const rawMomentum = cy.cwRev / cy.pwRev
    momentumAdj = 1 + (rawMomentum - 1) * 0.3
    momentumAdj = Math.max(0.5, Math.min(1.5, momentumAdj))
  }
  const adjustedDaily = dailyAvg * momentumAdj
  return cy.mtdRev + adjustedDaily * daysRemaining
}

export function calcMetrics(cy: Agg, ly: Agg, target: number | null, mp?: MonthProgress | null): PerfMetrics {
  const mtdDc = dcRate(cy.mtdTag, cy.mtdSale)
  const mtdCogs = cogsRate(cy.mtdRev, cy.mtdCost)
  const cwDc = dcRate(cy.cwTag, cy.cwSale)
  const cwCogs = cogsRate(cy.cwRev, cy.cwCost)
  const forecast = calcForecast(cy, ly, mp ?? null)
  const forecastAch = forecast && target && target > 0 ? (forecast / target) * 100 : null
  const lyMtdDc = dcRate(ly.mtdTag, ly.mtdSale)
  const lyMtdCogs = cogsRate(ly.mtdRev, ly.mtdCost)
  return {
    target, mtdRev: cy.mtdRev,
    achPct: target && target > 0 ? (cy.mtdRev / target) * 100 : null,
    forecast, forecastAch,
    mtdDc, mtdCogs,
    cwRev: cy.cwRev,
    wow: cy.cwRev - cy.pwRev,
    wowPct: cy.pwRev !== 0 ? ((cy.cwRev - cy.pwRev) / Math.abs(cy.pwRev)) * 100 : null,
    cwDc, cwCogs,
    cwYoy: cy.cwRev - ly.cwRev,
    cwYoyPct: ly.cwRev !== 0 ? ((cy.cwRev - ly.cwRev) / Math.abs(ly.cwRev)) * 100 : null,
    yoy: cy.mtdRev - ly.mtdRev,
    yoyPct: ly.mtdRev !== 0 ? ((cy.mtdRev - ly.mtdRev) / Math.abs(ly.mtdRev)) * 100 : null,
    dcChg: mtdDc - lyMtdDc,
    cogsChg: mtdCogs - lyMtdCogs,
    lyMtdRev: ly.mtdRev,
  }
}

export type SelFilter =
  | { type: 'total' }
  | { type: 'group'; group: ChannelGroup }
  | { type: 'channel'; group: ChannelGroup; channel: string }

export function channelParams(sf: SelFilter) {
  if (sf.type === 'group')   return `&channelGroup=${encodeURIComponent(sf.group)}`
  if (sf.type === 'channel') return `&channelGroup=${encodeURIComponent(sf.group)}&channel=${encodeURIComponent(sf.channel)}`
  return ''
}

/** 다중 채널 선택 → API 파라미터 */
export function channelParamsFromSet(channels: Set<string>) {
  if (channels.size === 0) return ''
  return `&channels=${Array.from(channels).map(c => encodeURIComponent(c)).join(',')}`
}
