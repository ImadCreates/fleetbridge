import { speedToKmh, toIso } from '../convert'
import type { SafetyEventType, Vehicle } from '../model'
import type { ProviderAdapter } from './types'
import { normalizePings } from './shared'

// Northwind raw shape: epoch-ms timestamps, mph speed, gps.lat/gps.lon, and a
// per-ping events array tagged with Northwind's own vocabulary.
interface NorthwindEvent {
  kind: string
  ts: number
}
interface NorthwindPing {
  id: string
  ts: number
  gps: { lat: number; lon: number }
  spd_mph: number
  events: NorthwindEvent[]
}

const KIND_TO_TYPE: Record<string, SafetyEventType> = {
  harshBraking: 'harsh_brake',
  harshAccel: 'harsh_accel',
  overspeed: 'speeding',
  idle: 'idling',
}

export const northwindAdapter: ProviderAdapter = {
  id: 'northwind',
  name: 'Northwind',
  normalize(raw: unknown, vehicle: Vehicle) {
    // Trust the provider schema; only the matching vehicle's pings are kept.
    const all = Array.isArray(raw) ? (raw as NorthwindPing[]) : []
    const pings = all.filter((p) => p.id === vehicle.id)
    return normalizePings(vehicle.id, pings, {
      lat: (p) => p.gps.lat,
      lng: (p) => p.gps.lon,
      speedKmh: (p) => speedToKmh(p.spd_mph, 'mph'),
      timestamp: (p) => toIso(p.ts, 'epoch_ms'),
      // Fan out every entry in the ping's events array, each with its own ts;
      // unmapped kinds are dropped.
      events: (p) =>
        p.events.flatMap((e) => {
          const type = KIND_TO_TYPE[e.kind]
          return type ? [{ type, timestamp: toIso(e.ts, 'epoch_ms') }] : []
        }),
    })
  },
}
