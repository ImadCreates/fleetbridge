// Pure fleet analytics over the canonical model. No side effects: every
// function derives its result solely from its inputs.

import type { Location, SafetyEvent, SafetyEventType } from '../model'

type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_KM = 6371
const EVENT_TYPES: SafetyEventType[] = [
  'harsh_brake',
  'harsh_accel',
  'speeding',
  'idling',
]

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

/** Sort a copy of the locations by ascending timestamp (does not mutate). */
function byTimestamp(locations: Location[]): Location[] {
  return [...locations].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  )
}

/** Great-circle distance between two points in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Total path length, summing haversine over consecutive points in time order. */
export function totalDistanceKm(locations: Location[]): number {
  const sorted = byTimestamp(locations)
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    total += haversineKm(sorted[i - 1], sorted[i])
  }
  return total
}

/** Mean of the sampled speeds. Returns 0 for an empty series. */
export function averageSpeedKmh(locations: Location[]): number {
  if (locations.length === 0) return 0
  const sum = locations.reduce((acc, l) => acc + l.speedKmh, 0)
  return sum / locations.length
}

/** Highest sampled speed. Returns 0 for an empty series. */
export function maxSpeedKmh(locations: Location[]): number {
  return locations.reduce((max, l) => Math.max(max, l.speedKmh), 0)
}

// Each sample accounts for the time until the next sample at its own speed;
// the final sample contributes no interval. This is used by both speeding and
// idling time so they stay consistent.
function secondsWhere(
  locations: Location[],
  predicate: (speedKmh: number) => boolean,
): number {
  const sorted = byTimestamp(locations)
  let seconds = 0
  for (let i = 1; i < sorted.length; i++) {
    if (predicate(sorted[i - 1].speedKmh)) {
      seconds += (Date.parse(sorted[i].timestamp) - Date.parse(sorted[i - 1].timestamp)) / 1000
    }
  }
  return seconds
}

/** Seconds spent above the limit. */
export function speedingSeconds(locations: Location[], limitKmh = 100): number {
  return secondsWhere(locations, (speed) => speed > limitKmh)
}

/**
 * Minutes spent below the threshold while the vehicle is active. "Active" means
 * within the recorded trip window, so low-speed samples between the first and
 * last fix count as idling.
 */
export function idlingMinutes(
  locations: Location[],
  speedThresholdKmh = 2,
): number {
  return secondsWhere(locations, (speed) => speed < speedThresholdKmh) / 60
}

/** Count events grouped by type, with every type present (zero when absent). */
export function countEventsByType(
  events: SafetyEvent[],
): Record<SafetyEventType, number> {
  const counts: Record<SafetyEventType, number> = {
    harsh_brake: 0,
    harsh_accel: 0,
    speeding: 0,
    idling: 0,
  }
  for (const event of events) counts[event.type]++
  return counts
}

// Per-event penalty weights, documented and transparent. Heavier weights mean a
// more dangerous behaviour. Tune these to change scoring policy.
const EVENT_WEIGHTS: Record<SafetyEventType, number> = {
  harsh_brake: 2,
  harsh_accel: 2,
  speeding: 3,
  idling: 1,
}

/**
 * Transparent 0-100 safety score. Start at 100 and subtract a weighted event
 * penalty normalized to events per 100 km, then clamp to [0, 100]:
 *   penalty = sum(WEIGHT[type] * count[type]) * (100 / distanceKm)
 *   score   = clamp(100 - penalty, 0, 100)
 * With no measurable distance there is no rate to penalize, so the score is 100.
 */
export function safetyScore(input: {
  distanceKm: number
  eventCounts: Record<SafetyEventType, number>
}): number {
  const { distanceKm, eventCounts } = input
  if (distanceKm <= 0) return 100
  let weighted = 0
  for (const type of EVENT_TYPES) {
    weighted += EVENT_WEIGHTS[type] * eventCounts[type]
  }
  const penalty = weighted * (100 / distanceKm)
  return clamp(100 - penalty, 0, 100)
}
