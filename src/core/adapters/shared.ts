// Shared normalization machinery used by every adapter. Each adapter supplies
// small field extractors; this module turns a sequence of pings into canonical
// Locations and SafetyEvents, deriving heading from consecutive fixes (raw
// payloads do not carry heading) and generating stable event ids.

import type { Location, SafetyEvent, SafetyEventType } from '../model'

export interface PingExtractors<P> {
  lat(ping: P): number
  lng(ping: P): number
  speedKmh(ping: P): number
  /** ISO 8601 timestamp for the ping. */
  timestamp(ping: P): string
  /**
   * Canonical events carried by the ping, each with its own ISO 8601
   * timestamp. Empty when the ping carries none. A single ping may carry more
   * than one event.
   */
  events(ping: P): Array<{ type: SafetyEventType; timestamp: string }>
}

function toRad(d: number): number {
  return (d * Math.PI) / 180
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI
}

/** Initial bearing from point a to point b, in degrees [0, 360). */
function bearingDeg(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const dLng = toRad(bLng - aLng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Heading per fix; reuses the previous heading while the vehicle is stationary. */
function computeHeadings(points: Array<{ lat: number; lng: number }>): number[] {
  const out = new Array<number>(points.length)
  let last = 0
  for (let i = 0; i < points.length; i++) {
    if (i < points.length - 1) {
      const a = points[i]
      const b = points[i + 1]
      if (a.lat !== b.lat || a.lng !== b.lng) {
        last = bearingDeg(a.lat, a.lng, b.lat, b.lng)
      }
    }
    out[i] = round1(last)
  }
  return out
}

/** Stable, deterministic event id derived from vehicle, type, and time. */
export function eventId(
  vehicleId: string,
  type: SafetyEventType,
  timestamp: string,
): string {
  return `${vehicleId}-${type}-${Date.parse(timestamp)}`
}

export function normalizePings<P>(
  vehicleId: string,
  pings: P[],
  ex: PingExtractors<P>,
): { locations: Location[]; events: SafetyEvent[] } {
  // First pass: positions only, so heading can look ahead to the next fix.
  const points = pings.map((p) => ({ lat: ex.lat(p), lng: ex.lng(p) }))
  const headings = computeHeadings(points)

  const locations: Location[] = []
  const events: SafetyEvent[] = []

  // Second pass: each extractor is called exactly once per ping. Locations use
  // the ping timestamp; each event keeps its own timestamp and the ping's point.
  pings.forEach((p, i) => {
    const { lat, lng } = points[i]
    const timestamp = ex.timestamp(p)
    const speedKmh = ex.speedKmh(p)
    const headingDeg = headings[i]

    locations.push({ vehicleId, timestamp, lat, lng, speedKmh, headingDeg })

    for (const event of ex.events(p)) {
      events.push({
        id: eventId(vehicleId, event.type, event.timestamp),
        vehicleId,
        type: event.type,
        timestamp: event.timestamp,
        lat,
        lng,
      })
    }
  })

  return { locations, events }
}
