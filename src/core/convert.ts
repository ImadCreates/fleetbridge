// Small, pure conversion helpers shared by every provider adapter. They turn
// provider-specific units, timestamps, and field paths into the canonical
// representation used by src/core/model.ts.

export type SpeedUnit = 'mph' | 'kmh' | 'ms'
export type TimeFormat = 'epoch_ms' | 'iso' | 'unix_s'

const KMH_PER_MPH = 1.609344
const KMH_PER_MS = 3.6

/** Convert a speed in the given unit to km/h. */
export function speedToKmh(value: number, unit: SpeedUnit): number {
  switch (unit) {
    case 'mph':
      return value * KMH_PER_MPH
    case 'kmh':
      return value
    case 'ms':
      return value * KMH_PER_MS
    default:
      throw new Error(`Unsupported speed unit: ${String(unit)}`)
  }
}

/** Convert a provider timestamp to an ISO 8601 string. */
export function toIso(value: number | string, format: TimeFormat): string {
  switch (format) {
    case 'epoch_ms':
      return new Date(Number(value)).toISOString()
    case 'unix_s':
      return new Date(Number(value) * 1000).toISOString()
    case 'iso':
      return new Date(value).toISOString()
    default:
      throw new Error(`Unsupported time format: ${String(format)}`)
  }
}

/**
 * Read a value from a nested object using a dot path such as "gps.lat" or
 * "position.y". Returns undefined if any segment is missing or not an object.
 */
export function getByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    // current is a non-null object here, so indexing by string is safe.
    current = (current as Record<string, unknown>)[key]
  }
  return current
}
