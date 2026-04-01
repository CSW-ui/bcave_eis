import { KpiCard } from './KpiCard'
import { KpiMetric } from '@/types'

interface KpiGridProps {
  metrics: KpiMetric[]
}

export function KpiGrid({ metrics }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <KpiCard key={metric.id} metric={metric} />
      ))}
    </div>
  )
}
