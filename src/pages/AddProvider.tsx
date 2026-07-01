import { useState, type ReactNode } from 'react'

import { makeConfigAdapter } from '../core/adapters'
import type { MappingConfig, ProviderAdapter } from '../core/adapters'
import { getByPath } from '../core/convert'
import type { SpeedUnit, TimeFormat } from '../core/convert'
import type { SafetyEventType, Vehicle } from '../core/model'
import { JsonBlock } from '../components/JsonBlock'

type Normalized = ReturnType<ProviderAdapter['normalize']>
type Result = { ok: true; output: Normalized } | { ok: false; error: string }

const EVENT_TYPES: SafetyEventType[] = [
  'harsh_brake',
  'harsh_accel',
  'speeding',
  'idling',
]

// Fleetwave: an invented fourth provider with a different shape again. Nested
// coords, a string timestamp, and its own event names.
const FLEETWAVE_PINGS = [
  { unit: 'FW-01', coords: { latitude: 43.6512, longitude: -79.3832 }, kph: 0, recordedAt: '2026-06-15T13:00:00Z', alert: null },
  { unit: 'FW-01', coords: { latitude: 43.6534, longitude: -79.3801 }, kph: 62, recordedAt: '2026-06-15T13:00:10Z', alert: null },
  { unit: 'FW-01', coords: { latitude: 43.6558, longitude: -79.376 }, kph: 104, recordedAt: '2026-06-15T13:00:20Z', alert: 'OVER_LIMIT' },
  { unit: 'FW-01', coords: { latitude: 43.6571, longitude: -79.3725 }, kph: 8, recordedAt: '2026-06-15T13:00:30Z', alert: 'BRAKE_HARD' },
]

const DEFAULT_RAW = JSON.stringify(FLEETWAVE_PINGS, null, 2)

const DEFAULT_EVENT_ROWS: Array<{ key: string; value: SafetyEventType }> = [
  { key: 'BRAKE_HARD', value: 'harsh_brake' },
  { key: 'ACCEL_HARD', value: 'harsh_accel' },
  { key: 'OVER_LIMIT', value: 'speeding' },
  { key: 'STOPPED', value: 'idling' },
]

const FLEETWAVE_VEHICLE: Vehicle = {
  id: 'fleetwave-01',
  label: 'Fleetwave 01',
  providerId: 'fleetwave',
  vin: 'FLEETWAVE00000001',
}

// Validate that each required path resolves to a usable value on every ping.
// Bad input is named, never silently dropped.
function validatePaths(pings: unknown[], config: MappingConfig): void {
  pings.forEach((ping, i) => {
    const numeric: Array<[string, string]> = [
      ['latPath', config.latPath],
      ['lngPath', config.lngPath],
      ['speedPath', config.speedPath],
    ]
    for (const [label, path] of numeric) {
      const value = getByPath(ping, path)
      if (value === undefined || value === null) {
        throw new Error(`${label} "${path}" did not resolve on ping ${i}.`)
      }
      if (Number.isNaN(Number(value))) {
        throw new Error(
          `${label} "${path}" is not a number on ping ${i} (got ${JSON.stringify(value)}).`,
        )
      }
    }
    const time = getByPath(ping, config.timePath)
    if (time === undefined || time === null) {
      throw new Error(`timePath "${config.timePath}" did not resolve on ping ${i}.`)
    }
    const ms =
      config.timeFormat === 'iso'
        ? Date.parse(String(time))
        : config.timeFormat === 'unix_s'
          ? Number(time) * 1000
          : Number(time)
    if (Number.isNaN(ms)) {
      throw new Error(
        `timePath "${config.timePath}" did not parse as ${config.timeFormat} on ping ${i} (got ${JSON.stringify(time)}).`,
      )
    }
  })
}

function runNormalize(rawText: string, config: MappingConfig): Result {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'Raw payload must be a JSON array of pings.' }
  }
  try {
    validatePaths(parsed, config)
    const adapter = makeConfigAdapter('fleetwave', 'Fleetwave', config)
    return { ok: true, output: adapter.normalize(parsed, FLEETWAVE_VEHICLE) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const FLEETWAVE_CONFIG: MappingConfig = {
  latPath: 'coords.latitude',
  lngPath: 'coords.longitude',
  speedPath: 'kph',
  speedUnit: 'kmh',
  timePath: 'recordedAt',
  timeFormat: 'iso',
  eventPath: 'alert',
  eventMap: {
    BRAKE_HARD: 'harsh_brake',
    ACCEL_HARD: 'harsh_accel',
    OVER_LIMIT: 'speeding',
    STOPPED: 'idling',
  },
}

const labelCls = 'text-xs font-medium uppercase tracking-wide text-slate-400'
const inputCls =
  'w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  )
}

export function AddProvider() {
  const [latPath, setLatPath] = useState(FLEETWAVE_CONFIG.latPath)
  const [lngPath, setLngPath] = useState(FLEETWAVE_CONFIG.lngPath)
  const [speedPath, setSpeedPath] = useState(FLEETWAVE_CONFIG.speedPath)
  const [speedUnit, setSpeedUnit] = useState<SpeedUnit>(FLEETWAVE_CONFIG.speedUnit)
  const [timePath, setTimePath] = useState(FLEETWAVE_CONFIG.timePath)
  const [timeFormat, setTimeFormat] = useState<TimeFormat>(FLEETWAVE_CONFIG.timeFormat)
  const [eventPath, setEventPath] = useState(FLEETWAVE_CONFIG.eventPath ?? '')
  const [eventRows, setEventRows] = useState(DEFAULT_EVENT_ROWS)
  const [rawText, setRawText] = useState(DEFAULT_RAW)
  const [result, setResult] = useState<Result>(() =>
    runNormalize(DEFAULT_RAW, FLEETWAVE_CONFIG),
  )

  function buildConfig(): MappingConfig {
    const eventMap: Record<string, SafetyEventType> = {}
    for (const row of eventRows) {
      const key = row.key.trim()
      if (key !== '') eventMap[key] = row.value
    }
    const trimmedEventPath = eventPath.trim()
    return {
      latPath: latPath.trim(),
      lngPath: lngPath.trim(),
      speedPath: speedPath.trim(),
      speedUnit,
      timePath: timePath.trim(),
      timeFormat,
      eventPath: trimmedEventPath === '' ? undefined : trimmedEventPath,
      eventMap: Object.keys(eventMap).length > 0 ? eventMap : undefined,
    }
  }

  function handleNormalize() {
    setResult(runNormalize(rawText, buildConfig()))
  }

  function updateRow(index: number, patch: Partial<{ key: string; value: SafetyEventType }>) {
    setEventRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Add provider</h1>
        <p className="text-sm text-slate-500">
          Onboarding a provider is configuration, not code. Describe where each
          field lives, paste a few raw pings, and normalize.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className={labelCls}>Mapping config</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="latPath">
              <input className={inputCls} value={latPath} onChange={(e) => setLatPath(e.target.value)} />
            </Field>
            <Field label="lngPath">
              <input className={inputCls} value={lngPath} onChange={(e) => setLngPath(e.target.value)} />
            </Field>
            <Field label="speedPath">
              <input className={inputCls} value={speedPath} onChange={(e) => setSpeedPath(e.target.value)} />
            </Field>
            <Field label="speedUnit">
              <select className={inputCls} value={speedUnit} onChange={(e) => setSpeedUnit(e.target.value as SpeedUnit)}>
                <option value="mph">mph</option>
                <option value="kmh">kmh</option>
                <option value="ms">ms</option>
              </select>
            </Field>
            <Field label="timePath">
              <input className={inputCls} value={timePath} onChange={(e) => setTimePath(e.target.value)} />
            </Field>
            <Field label="timeFormat">
              <select className={inputCls} value={timeFormat} onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}>
                <option value="epoch_ms">epoch_ms</option>
                <option value="iso">iso</option>
                <option value="unix_s">unix_s</option>
              </select>
            </Field>
            <Field label="eventPath (optional)">
              <input className={inputCls} value={eventPath} onChange={(e) => setEventPath(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-2">
            <span className={labelCls}>Event map</span>
            <div className="space-y-2">
              {eventRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inputCls} flex-1`}
                    value={row.key}
                    placeholder="raw code"
                    aria-label={`event key ${i + 1}`}
                    onChange={(e) => updateRow(i, { key: e.target.value })}
                  />
                  <span className="font-mono text-xs text-slate-300" aria-hidden>
                    {'→'}
                  </span>
                  <select
                    className={`${inputCls} flex-1`}
                    value={row.value}
                    aria-label={`event type ${i + 1}`}
                    onChange={(e) => updateRow(i, { value: e.target.value as SafetyEventType })}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`remove mapping ${i + 1}`}
                    onClick={() => setEventRows((rows) => rows.filter((_, j) => j !== i))}
                    className="rounded-md px-2 py-1 text-xs text-slate-400 outline-none transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEventRows((rows) => [...rows, { key: '', value: 'harsh_brake' }])}
              className="text-xs text-indigo-600 outline-none hover:text-indigo-700 focus-visible:underline"
            >
              Add mapping
            </button>
          </div>
        </section>

        <section className="flex flex-col space-y-2 rounded-lg border border-slate-200 bg-white p-4">
          <span className={labelCls}>Raw pings (JSON array)</span>
          <textarea
            className={`${inputCls} h-72 flex-1 resize-y leading-relaxed`}
            value={rawText}
            spellCheck={false}
            aria-label="Raw pings"
            onChange={(e) => setRawText(e.target.value)}
          />
        </section>
      </div>

      <div>
        <button
          type="button"
          onClick={handleNormalize}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white outline-none transition-colors hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          Normalize
        </button>
      </div>

      {result.ok ? (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={labelCls}>Canonical output</h2>
            <span className="font-mono text-xs tabular-nums text-slate-500">
              {result.output.locations.length} locations, {result.output.events.length} events
            </span>
          </div>
          <JsonBlock value={result.output} className="max-h-[440px]" />
        </section>
      ) : (
        <section className="space-y-1 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Could not normalize</h2>
          <p className="font-mono text-xs text-red-600">{result.error}</p>
        </section>
      )}
    </div>
  )
}
