import { speedToKmh, toIso } from '../convert'
import type { SafetyEventType, Vehicle } from '../model'
import type { ProviderAdapter } from './types'
import { normalizePings } from './shared'

// TracPoint raw shape: unix-seconds time, m/s velocity, device.serial keyed to
// the VIN, numeric event codes, and a position object where y is latitude and
// x is longitude (a deliberate axis-naming trap).
interface TracpointPing {
  device: { serial: string }
  position: { y: number; x: number }
  velocity_ms: number
  time: number
  evt: number
}

const EVT_TO_TYPE: Record<number, SafetyEventType> = {
  1: 'harsh_brake',
  2: 'harsh_accel',
  3: 'speeding',
  4: 'idling',
}

export const tracpointAdapter: ProviderAdapter = {
  id: 'tracpoint',
  name: 'TracPoint',
  normalize(raw: unknown, vehicle: Vehicle) {
    // Trust the provider schema; TracPoint keys pings by device serial = VIN.
    const all = Array.isArray(raw) ? (raw as TracpointPing[]) : []
    const pings = all.filter((p) => p.device.serial === vehicle.vin)
    return normalizePings(vehicle.id, pings, {
      lat: (p) => p.position.y, // y is latitude
      lng: (p) => p.position.x, // x is longitude
      speedKmh: (p) => speedToKmh(p.velocity_ms, 'ms'),
      timestamp: (p) => toIso(p.time, 'unix_s'),
      // Zero or one event per ping, carrying the ping's own unix-seconds time.
      events: (p) => {
        if (p.evt === 0) return []
        const type = EVT_TO_TYPE[p.evt]
        return type ? [{ type, timestamp: toIso(p.time, 'unix_s') }] : []
      },
    })
  },
}
