import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Users, Target, BarChart3, Package, GitBranch, Eye, MousePointer, Percent, PieChart, RefreshCw, CheckCircle } from 'lucide-react'
import { KpiMetric } from '@/types'

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, Users, Target, BarChart3, Package, GitBranch,
  Eye, MousePointer, Percent, PieChart, RefreshCw, CheckCircle,
}

interface KpiCardProps {
  metric: KpiMetric
  className?: string
}

export function KpiCard({ metric, className }: KpiCardProps) {
  const Icon = ICON_MAP[metric.icon] ?? BarChart3

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-5 border border-surface-border shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{metric.title}</span>
        <div className="w-9 h-9 rounded-lg bg-brand-accent-light flex items-center justify-center">
          <Icon size={18} className="text-brand-accent" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1.5">
            {metric.value}
          </p>
          <div className="flex items-center gap-1.5">
            {metric.trend === 'up' && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp size={11} />
                +{metric.delta}%
              </span>
            )}
            {metric.trend === 'down' && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                <TrendingDown size={11} />
                {metric.delta}%
              </span>
            )}
            {metric.trend === 'neutral' && (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                <Minus size={11} />
                {metric.delta}%
              </span>
            )}
            <span className="text-xs text-gray-400">{metric.deltaLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
