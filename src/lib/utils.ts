import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency = 'KRW'): string {
  if (currency === 'KRW') {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`
    }
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`
    }
    return value.toLocaleString('ko-KR')
  }
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency }).format(value)
}

export function formatNumber(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)}만`
  }
  return value.toLocaleString('ko-KR')
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}
