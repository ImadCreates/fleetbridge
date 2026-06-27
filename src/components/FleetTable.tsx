import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PROVIDERS } from '../core/model'
import type { VehicleSummary } from '../core/analytics/summary'
import { ProviderTag } from './ProviderTag'
import { formatKm, formatScore } from '../lib/format'

type SortKey = 'vehicle' | 'provider' | 'distance' | 'events' | 'safety'
type SortDir = 'asc' | 'desc'

const PROVIDER_NAME: Record<string, string> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p.name]),
)

function totalEvents(summary: VehicleSummary): number {
  return Object.values(summary.eventCounts).reduce((a, b) => a + b, 0)
}

export function FleetTable({ summaries }: { summaries: VehicleSummary[] }) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('safety')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const rows = useMemo(() => {
    const withMeta = summaries.map((s) => ({ s, events: totalEvents(s) }))
    withMeta.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'vehicle':
          cmp = a.s.vehicle.label.localeCompare(b.s.vehicle.label)
          break
        case 'provider':
          cmp = (PROVIDER_NAME[a.s.vehicle.providerId] ?? '').localeCompare(
            PROVIDER_NAME[b.s.vehicle.providerId] ?? '',
          )
          break
        case 'distance':
          cmp = a.s.distanceKm - b.s.distanceKm
          break
        case 'events':
          cmp = a.events - b.events
          break
        case 'safety':
          cmp = a.s.safetyScore - b.s.safetyScore
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return withMeta
  }, [summaries, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'vehicle' || key === 'provider' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <Th label="Vehicle" col="vehicle" {...{ sortKey, sortDir, sortBy }} />
            <Th label="Provider" col="provider" {...{ sortKey, sortDir, sortBy }} />
            <Th label="Distance" col="distance" align="right" {...{ sortKey, sortDir, sortBy }} />
            <Th label="Events" col="events" align="right" {...{ sortKey, sortDir, sortBy }} />
            <Th label="Safety" col="safety" align="right" {...{ sortKey, sortDir, sortBy }} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ s, events }) => (
            <tr
              key={s.vehicle.id}
              tabIndex={0}
              onClick={() => navigate(`/vehicle/${s.vehicle.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/vehicle/${s.vehicle.id}`)
              }}
              className="cursor-pointer outline-none transition-colors hover:bg-slate-100 focus:bg-slate-100"
            >
              <td className="px-3 py-2 font-medium text-slate-900">
                {s.vehicle.label}
              </td>
              <td className="px-3 py-2">
                <ProviderTag
                  providerId={s.vehicle.providerId}
                  name={PROVIDER_NAME[s.vehicle.providerId] ?? s.vehicle.providerId}
                />
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                {formatKm(s.distanceKm)}
                <span className="ml-1 text-slate-400">km</span>
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                {events}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-900">
                {formatScore(s.safetyScore)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  label,
  col,
  align = 'left',
  sortKey,
  sortDir,
  sortBy,
}: {
  label: string
  col: SortKey
  align?: 'left' | 'right'
  sortKey: SortKey
  sortDir: SortDir
  sortBy: (key: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-400 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => sortBy(col)}
        className={`inline-flex items-center gap-1 outline-none hover:text-slate-600 focus:text-indigo-600 ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-slate-700' : ''}`}
      >
        {label}
        <span className="text-slate-400">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </span>
      </button>
    </th>
  )
}
