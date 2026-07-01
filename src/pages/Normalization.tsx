import { useMemo, useState } from 'react'

import { getAdapter } from '../core/adapters'
import { HAULIX, NORTHWIND, TRACPOINT } from '../core/model'
import type { Provider, SafetyEventType, Vehicle } from '../core/model'
import { JsonBlock } from '../components/JsonBlock'
import { EVENT_COLORS, providerColor } from '../lib/palette'

import northwindRaw from '../data/raw/northwind.json'
import haulixRaw from '../data/raw/haulix.json'
import tracpointRaw from '../data/raw/tracpoint.json'
import vehiclesData from '../data/vehicles.json'

type Ping = Record<string, unknown>

const VEHICLES = vehiclesData as Vehicle[]

interface Transform {
  aspect: string
  from: string
  to: string
  note?: string
}

interface Vocab {
  from: string
  to: SafetyEventType
}

interface ProviderView {
  provider: Provider
  raw: unknown[]
  hasEvent: (ping: Ping) => boolean
  transforms: Transform[]
  vocab: Vocab[]
}

const VIEWS: ProviderView[] = [
  {
    provider: NORTHWIND,
    raw: northwindRaw as unknown[],
    hasEvent: (p) => Array.isArray(p.events) && (p.events as unknown[]).length > 0,
    transforms: [
      { aspect: 'Speed', from: 'spd_mph (mph)', to: 'speedKmh (km/h)', note: 'x 1.609344' },
      { aspect: 'Timestamp', from: 'ts (epoch ms)', to: 'timestamp (ISO 8601)' },
      { aspect: 'Latitude', from: 'gps.lat', to: 'lat' },
      { aspect: 'Longitude', from: 'gps.lon', to: 'lng' },
    ],
    vocab: [
      { from: 'harshBraking', to: 'harsh_brake' },
      { from: 'harshAccel', to: 'harsh_accel' },
      { from: 'overspeed', to: 'speeding' },
      { from: 'idle', to: 'idling' },
    ],
  },
  {
    provider: HAULIX,
    raw: haulixRaw as unknown[],
    hasEvent: (p) => p.event_code !== null && p.event_code !== undefined,
    transforms: [
      { aspect: 'Speed', from: 'speed_kmph (km/h)', to: 'speedKmh (km/h)', note: 'no conversion' },
      { aspect: 'Timestamp', from: 'recorded_at (ISO 8601)', to: 'timestamp (ISO 8601)' },
      { aspect: 'Latitude', from: 'latitude', to: 'lat' },
      { aspect: 'Longitude', from: 'longitude', to: 'lng' },
    ],
    vocab: [
      { from: 'HARD_BRAKE', to: 'harsh_brake' },
      { from: 'HARD_ACCEL', to: 'harsh_accel' },
      { from: 'SPEEDING', to: 'speeding' },
      { from: 'IDLING', to: 'idling' },
    ],
  },
  {
    provider: TRACPOINT,
    raw: tracpointRaw as unknown[],
    hasEvent: (p) => p.evt !== 0 && p.evt !== undefined,
    transforms: [
      { aspect: 'Speed', from: 'velocity_ms (m/s)', to: 'speedKmh (km/h)', note: 'x 3.6' },
      { aspect: 'Timestamp', from: 'time (unix seconds)', to: 'timestamp (ISO 8601)' },
      { aspect: 'Latitude', from: 'position.y', to: 'lat', note: 'y is latitude (axis trap)' },
      { aspect: 'Longitude', from: 'position.x', to: 'lng', note: 'x is longitude (axis trap)' },
    ],
    vocab: [
      { from: '1', to: 'harsh_brake' },
      { from: '2', to: 'harsh_accel' },
      { from: '3', to: 'speeding' },
      { from: '4', to: 'idling' },
    ],
  },
]

// First few pings plus the first ping that carries an event.
function buildSample(view: ProviderView): unknown[] {
  const firstFew = view.raw.slice(0, 3)
  const eventPing = view.raw.find((p) => view.hasEvent(p as Ping))
  return eventPing !== undefined && !firstFew.includes(eventPing)
    ? [...firstFew, eventPing]
    : firstFew
}

export function Normalization() {
  const [selected, setSelected] = useState(0)
  const view = VIEWS[selected]

  const { sample, normalized } = useMemo(() => {
    const s = buildSample(view)
    const adapter = getAdapter(view.provider.id)!
    const vehicle = VEHICLES.find((v) => v.providerId === view.provider.id)!
    return { sample: s, normalized: adapter.normalize(s, vehicle) }
  }, [view])

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Normalization</h1>
        <p className="text-sm text-slate-500">
          Each provider sends a different raw shape. The adapter maps every
          field, unit, and event name into one canonical model.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {VIEWS.map((v, i) => (
          <button
            key={v.provider.id}
            type="button"
            onClick={() => setSelected(i)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-600 ${
              i === selected
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: providerColor(v.provider.id) }}
            />
            {v.provider.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Raw payload · {view.provider.name}
          </h2>
          <JsonBlock value={sample} className="max-h-[440px]" />
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Canonical output
          </h2>
          <JsonBlock value={normalized} className="max-h-[440px]" />
        </section>
      </div>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Transforms · {view.provider.name}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Aspect
              </th>
              <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Raw
              </th>
              <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                Canonical
              </th>
              <th className="py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Note
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {view.transforms.map((t) => (
              <tr key={t.aspect}>
                <td className="py-2 pr-3 text-slate-700">{t.aspect}</td>
                <td className="py-2 pr-3 font-mono text-xs tabular-nums text-slate-600">
                  {t.from}
                </td>
                <td className="py-2 pr-3 font-mono text-xs tabular-nums text-slate-900">
                  {t.to}
                </td>
                <td className="py-2 text-xs text-slate-500">{t.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Event vocabulary
          </h3>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {view.vocab.map((m) => (
              <li
                key={m.from}
                className="flex items-center gap-2 font-mono text-xs tabular-nums"
              >
                <span className="text-slate-600">{m.from}</span>
                <span className="text-slate-300" aria-hidden>
                  {'→'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-900">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: EVENT_COLORS[m.to] }}
                  />
                  {m.to}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
