// 공통 포매팅 유틸리티

/** 백만 단위 (1,234,567 → "1") */
export function fmtM(v: number) { return Math.round(v / 1e6).toLocaleString() }

/** 만원 단위 (12345 → "1만") */
export function fmtW(v: number) {
  return Math.abs(v) >= 1e8
    ? `${(v / 1e8).toFixed(1)}억`
    : Math.abs(v) >= 1e4
      ? `${Math.round(v / 1e4).toLocaleString()}만`
      : v.toLocaleString()
}

/** 퍼센트 (소수점 1자리) */
export function fmtPctF(v: number) { return `${v.toFixed(1)}%` }

/** 퍼센트 (정수, null 안전) */
export function fmtPctI(v: number | null) {
  return v == null || !isFinite(v) ? '—' : `${Math.round(v)}%`
}

/** 부호 포함 퍼센트 (+1.2%, -3.4%) */
export function fmtPctS(v: number | null) {
  return v == null || !isFinite(v) ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

/** 달성률/변동률 퍼센트 (null → '—') */
export function fmtPct(v: number | null): string {
  if (v == null || !isFinite(v)) return '—'
  return `${v.toFixed(1)}%`
}

/** 숫자 축약 (차트 축용: 1000 → "1K", 1000000 → "1M") */
export function fmtAxis(n: number) {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

/** SNS 숫자 포매팅 (1234 → "1,234", 12345 → "1.2만") */
export function fmtNum(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`
  if (n >= 1e4) return `${(n / 1e4).toFixed(1)}만`
  return n.toLocaleString()
}

/** 전기 대비 변동 (cur, prev → { t: "+2.3%", pos: true }) */
export function fmtDelta(cur: number, prev: number): { t: string; pos: boolean | null } {
  if (!prev) return { t: '—', pos: null }
  const r = ((cur - prev) / prev) * 100
  return { t: `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`, pos: r >= 0 }
}

/** 포인트 변동 (cur, prev → { t: "+1.2p", pos: true }) */
export function fmtDeltaPt(cur: number, prev: number): { t: string; pos: boolean | null } {
  if (!prev && !cur) return { t: '—', pos: null }
  const d = cur - prev
  return { t: `${d >= 0 ? '+' : ''}${d.toFixed(1)}p`, pos: d >= 0 }
}

/** Date → "YYYYMMDD" (Snowflake API용) */
export function fmtDateSf(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

/** 오늘 날짜 "YYYY.MM.DD" */
export function fmtToday() {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** Snowflake 8자리 날짜 → ISO ("20250101" → "2025-01-01") */
export function fmtDateIso(d: string) {
  return d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d
}
