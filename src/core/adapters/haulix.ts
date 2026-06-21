import { speedToKmh, toIso } from '../convert'
import type { SafetyEventType, Vehicle } from '../model'
import type { ProviderAdapter } from './types'
import { normalizePings } from './shared'

// Haulix raw shape: ISO timestamps, km/h speed, latitude/longitude, and a
// single uppercase event_code (or null) per ping.
interface HaulixPing {
  vehicle_id: string
  recorded_at: string
  latitude: number
  longitude: number
  speed_kmph: number
  event_code: string | null
}

const CODE_TO_TYPE: Record<string, SafetyEventType> = {
  HARD_BRAKE: 'harsh_brake',
  HARD_ACCEL: 'harsh_accel',
  SPEEDING: 'speeding',
  IDLING: 'idling',
}

export const haulixAdapter: ProviderAdapter = {
  id: 'haulix',
  name: 'Haulix',
  normalize(raw: unknown, vehicle: Vehicle) {
    // Trust the provider schema; only the matching vehicle's pings are kept.
    const all = Array.isArray(raw) ? (raw as HaulixPing[]) : []
    const pings = all.filter((p) => p.vehicle_id === vehicle.id)
    return normalizePings(vehicle.id, pings, {
      lat: (p) => p.latitude,
      lng: (p) => p.longitude,
      speedKmh: (p) => speedToKmh(p.speed_kmph, 'kmh'),
      timestamp: (p) => toIso(p.recorded_at, 'iso'),
      eventType: (p) =>
        p.event_code !== null ? (CODE_TO_TYPE[p.event_code] ?? null) : null,
    })
  },
}
