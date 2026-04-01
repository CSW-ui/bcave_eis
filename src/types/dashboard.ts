export interface KpiMetric {
  id: string
  title: string
  value: string | number
  delta: number
  deltaLabel: string
  trend: 'up' | 'down' | 'neutral'
  icon: string
}

export interface ChartDataPoint {
  month: string
  actual: number
  target: number
}

export interface ActivityItem {
  id: string
  user: string
  action: string
  target: string
  timestamp: Date
  department: 'product-planning' | 'sales' | 'marketing'
}
