'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartDataPoint } from '@/types'

interface RevenueLineChartProps {
  data: ChartDataPoint[]
  title?: string
}

const formatYAxis = (value: number) => {
  if (value >= 100000000) return `${(value / 100000000).toFixed(0)}억`
  if (value >= 10000000) return `${(value / 10000000).toFixed(0)}천만`
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`
  return String(value)
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-surface-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
        {payload.map((p: { dataKey: string; color: string; name: string; value: number }) => (
          <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}: {formatYAxis(p.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueLineChart({ data, title = '월별 매출 실적' }: RevenueLineChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-surface-border shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            formatter={(value) => value === 'actual' ? '실적' : '목표'}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="#e91e63"
            strokeWidth={2.5}
            dot={{ fill: '#e91e63', r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="target"
            name="target"
            stroke="#cbd5e1"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
