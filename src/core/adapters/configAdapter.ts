import { getByPath, speedToKmh, toIso } from '../convert'
import type { SpeedUnit, TimeFormat } from '../convert'
import type { SafetyEventType, Vehicle } from '../model'
import type { ProviderAdapter } from './types'
import { normalizePings } from './shared'

/**
 * Declarative description of where each canonical field lives in a provider's
 * raw ping, plus the units and event vocabulary needed to decode it. This is
 * what powers the "add a provider" feature without writing new code.
 */
export type MappingConfig = {
  latPath: string
  lngPath: string
  speedPath: string
  speedUnit: SpeedUnit
  timePath: string
  timeFormat: TimeFormat
  eventPath?: string
  eventMap?: Record<string, SafetyEventType>
}

function mapEvent(ping: unknown, config: MappingConfig): SafetyEventType | null {
  if (config.eventPath === undefined || config.eventMap === undefined) {
    return null
  }
  const value = getByPath(ping, config.eventPath)
  if (value === null || value === undefined) return null
  return config.eventMap[String(value)] ?? null
}

/**
 * Build an adapter from a MappingConfig. Every ping in the raw array is treated
 * as belonging to the passed vehicle, so callers feed one vehicle's pings.
 */
export function makeConfigAdapter(
  id: string,
  name: string,
  config: MappingConfig,
): ProviderAdapter {
  return {
    id,
    name,
    normalize(raw: unknown, vehicle: Vehicle) {
      const pings: unknown[] = Array.isArray(raw) ? raw : []
      return normalizePings(vehicle.id, pings, {
        lat: (p) => Number(getByPath(p, config.latPath)),
        lng: (p) => Number(getByPath(p, config.lngPath)),
        speedKmh: (p) =>
          speedToKmh(Number(getByPath(p, config.speedPath)), config.speedUnit),
        // getByPath returns the raw timestamp value; toIso accepts number|string.
        timestamp: (p) =>
          toIso(getByPath(p, config.timePath) as number | string, config.timeFormat),
        eventType: (p) => mapEvent(p, config),
      })
    },
  }
}
