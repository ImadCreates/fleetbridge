export interface MetricCardProps {
  label: string
  value: string
  unit?: string
}

export function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </span>
        {unit !== undefined && (
          <span className="text-sm text-slate-400">{unit}</span>
        )}
      </div>
    </div>
  )
}
