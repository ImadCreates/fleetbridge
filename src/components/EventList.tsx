import type { SafetyEvent } from '../core/model'
import { EVENT_COLORS } from '../lib/palette'
import { eventLabel, formatCoord, formatTime } from '../lib/format'

export function EventList({ events }: { events: SafetyEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No safety events recorded.</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between gap-3 py-2"
        >
          <span className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: EVENT_COLORS[event.type] }}
            />
            <span className="text-sm capitalize text-slate-700">
              {eventLabel(event.type)}
            </span>
          </span>
          <span className="flex items-center gap-3 font-mono text-xs tabular-nums text-slate-400">
            <span>
              {formatCoord(event.lat)}, {formatCoord(event.lng)}
            </span>
            <span className="text-slate-600">{formatTime(event.timestamp)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
