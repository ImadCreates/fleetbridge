// Synthetic fleet data generator.
//
// Produces a canonical ground-truth dataset (src/data/truth.json) and then
// re-encodes it into three deliberately incompatible raw provider formats
// (src/data/raw/*.json) so the normalization layer has real work to do.
//
// Run with: npm run generate
//
// Everything is driven by a single seeded PRNG, so repeated runs produce
// identical files.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { HAULIX, NORTHWIND, TRACPOINT } from '../src/core/model'
import type {
  Location,
  Provider,
  SafetyEvent,
  SafetyEventType,
  Vehicle,
} from '../src/core/model'
import { createRng, randInt, randRange } from '../src/core/rng'
import type { Rng } from '../src/core/rng'

type LatLng = [number, number]

// --- Greater Toronto Area corridors (loose, approximate waypoints) ---------

interface Corridor {
  name: string
  points: LatLng[]
}

const CORRIDORS: Record<string, Corridor> = {
  hwy401: {
    name: 'Highway 401',
    points: [
      [43.6512, -79.6205],
      [43.7005, -79.5402],
      [43.7248, -79.4603],
      [43.7556, -79.3304],
      [43.7822, -79.2503],
    ],
  },
  hwy400: {
    name: 'Highway 400',
    points: [
      [43.7252, -79.5102],
      [43.7701, -79.5253],
      [43.8203, -79.5351],
      [43.8702, -79.5404],
    ],
  },
  qew: {
    name: 'QEW',
    points: [
      [43.6251, -79.4902],
      [43.5902, -79.5603],
      [43.5503, -79.6404],
      [43.4502, -79.6805],
      [43.3703, -79.7702],
    ],
  },
  dvp: {
    name: 'Don Valley Parkway',
    points: [
      [43.6502, -79.3601],
      [43.6802, -79.3552],
      [43.7102, -79.3403],
      [43.7452, -79.3351],
    ],
  },
  gardiner: {
    name: 'Gardiner Expressway',
    points: [
      [43.6402, -79.3002],
      [43.6382, -79.3603],
      [43.6352, -79.4102],
      [43.6332, -79.4503],
    ],
  },
}

// --- Fleet: eight vehicles spread across the three providers ---------------

interface FleetSpec {
  provider: Provider
  corridorKey: keyof typeof CORRIDORS
}

const FLEET: FleetSpec[] = [
  { provider: NORTHWIND, corridorKey: 'hwy401' },
  { provider: NORTHWIND, corridorKey: 'hwy400' },
  { provider: NORTHWIND, corridorKey: 'qew' },
  { provider: HAULIX, corridorKey: 'dvp' },
  { provider: HAULIX, corridorKey: 'gardiner' },
  { provider: HAULIX, corridorKey: 'hwy401' },
  { provider: TRACPOINT, corridorKey: 'hwy400' },
  { provider: TRACPOINT, corridorKey: 'qew' },
]

const PROVIDER_CODE: Record<string, string> = {
  northwind: 'nw',
  haulix: 'hx',
  tracpoint: 'tp',
}

// --- Timing ----------------------------------------------------------------

const SAMPLE_INTERVAL_S = 10
const SAMPLES = 241 // 0..2400s inclusive => about 40 minutes of driving
const BASE_TIME = Date.parse('2026-06-15T13:00:00Z')

// --- Geometry helpers ------------------------------------------------------

function toRad(d: number): number {
  return (d * Math.PI) / 180
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI
}

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const dLng = toRad(b[1] - a[1])
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

interface Arc {
  cum: number[]
  total: number
}

function buildArc(points: LatLng[]): Arc {
  const cum: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineKm(points[i - 1], points[i]))
  }
  return { cum, total: cum[cum.length - 1] }
}

/** Point at fractional arc length t in [0, 1] along the polyline. */
function pointAt(points: LatLng[], arc: Arc, t: number): LatLng {
  const target = Math.max(0, Math.min(1, t)) * arc.total
  let i = 1
  while (i < arc.cum.length && arc.cum[i] < target) i++
  if (i >= arc.cum.length) return points[points.length - 1]
  const segLen = arc.cum[i] - arc.cum[i - 1]
  const f = segLen === 0 ? 0 : (target - arc.cum[i - 1]) / segLen
  const a = points[i - 1]
  const b = points[i]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

function round(n: number, dp: number): number {
  const factor = 10 ** dp
  return Math.round(n * factor) / factor
}

// --- Speed profile ---------------------------------------------------------

interface SpeedProfile {
  speed: number[]
  idleWindows: Array<[number, number]>
}

function inAnyIdle(windows: Array<[number, number]>, i: number): boolean {
  return windows.some(([s, e]) => i >= s && i <= e)
}

function buildSpeedProfile(rng: Rng, n: number): SpeedProfile {
  const cruise = randRange(rng, 98, 110)
  const ramp = 9 // ~90s accelerating from a stop
  const decel = 9 // ~90s slowing to a stop at the end
  const speed = new Array<number>(n)

  for (let i = 0; i < n; i++) {
    let s: number
    if (i < ramp) {
      s = cruise * (i / ramp)
    } else if (i >= n - decel) {
      s = cruise * ((n - 1 - i) / decel)
    } else {
      s = cruise + randRange(rng, -4, 3)
    }
    speed[i] = Math.max(0, s)
  }

  // One or two idling segments where the truck sits near a standstill.
  const idleCount = randInt(rng, 1, 2)
  const idleWindows: Array<[number, number]> = []
  for (let k = 0; k < idleCount; k++) {
    const center = randInt(rng, ramp + 12, n - decel - 12)
    const half = randInt(rng, 2, 3)
    const start = center - half
    const end = center + half
    idleWindows.push([start, end])
    for (let i = start; i <= end; i++) speed[i] = randRange(rng, 0, 2)
  }

  // Guarantee a couple of clear speeding bursts above 100 km/h.
  const burst1 = randInt(rng, ramp + 2, Math.floor(n / 2))
  const burst2 = randInt(rng, Math.floor(n / 2), n - decel - 2)
  for (const b of [burst1, burst2]) {
    if (!inAnyIdle(idleWindows, b)) speed[b] = randRange(rng, 103, 109)
  }

  return { speed, idleWindows }
}

// --- Per-vehicle track build ------------------------------------------------

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789' // excludes I, O, Q

function makeVin(rng: Rng): string {
  let s = ''
  for (let i = 0; i < 17; i++) s += VIN_CHARS[randInt(rng, 0, VIN_CHARS.length - 1)]
  return s
}

interface Track {
  locations: Location[]
  events: SafetyEvent[]
}

function buildTrack(
  vehicle: Vehicle,
  corridor: Corridor,
  startTime: number,
  rng: Rng,
): Track {
  const n = SAMPLES
  const { speed, idleWindows } = buildSpeedProfile(rng, n)
  const arc = buildArc(corridor.points)

  // Progress along the corridor is proportional to integrated speed, so idle
  // segments hold position and the full corridor is traversed over the drive.
  const cum: number[] = new Array<number>(n)
  let running = 0
  for (let i = 0; i < n; i++) {
    running += speed[i]
    cum[i] = running
  }
  const totalPseudo = cum[n - 1] || 1

  const positions: LatLng[] = new Array<LatLng>(n)
  for (let i = 0; i < n; i++) {
    positions[i] = pointAt(corridor.points, arc, cum[i] / totalPseudo)
  }

  // Heading from consecutive points; reuse the last valid heading when idle.
  const headings = new Array<number>(n)
  let lastHeading = 0
  for (let i = 0; i < n; i++) {
    if (i < n - 1 && haversineKm(positions[i], positions[i + 1]) > 1e-6) {
      lastHeading = bearingDeg(positions[i], positions[i + 1])
    }
    headings[i] = lastHeading
  }

  const locations: Location[] = new Array<Location>(n)
  for (let i = 0; i < n; i++) {
    const ts = BASE_TIME + startTime + i * SAMPLE_INTERVAL_S * 1000
    locations[i] = {
      vehicleId: vehicle.id,
      timestamp: new Date(ts).toISOString(),
      lat: round(positions[i][0], 5),
      lng: round(positions[i][1], 5),
      speedKmh: round(speed[i], 1),
      headingDeg: round(headings[i], 1),
    }
  }

  const events = buildEvents(vehicle.id, speed, locations, idleWindows)
  return { locations, events }
}

function buildEvents(
  vehicleId: string,
  speed: number[],
  locations: Location[],
  idleWindows: Array<[number, number]>,
): SafetyEvent[] {
  const events: SafetyEvent[] = []
  const used = new Set<number>()
  let seq = 0

  const add = (idx: number, type: SafetyEventType): void => {
    if (idx < 1 || idx >= locations.length || used.has(idx)) return
    used.add(idx)
    const loc = locations[idx]
    events.push({
      id: `${vehicleId}-e${seq++}`,
      vehicleId,
      type,
      timestamp: loc.timestamp,
      lat: loc.lat,
      lng: loc.lng,
    })
  }

  // Harsh accel / brake at the sharpest speed changes (idle boundaries, bursts).
  let upIdx = 1
  let downIdx = 1
  for (let i = 1; i < speed.length; i++) {
    const d = speed[i] - speed[i - 1]
    if (d > speed[upIdx] - speed[upIdx - 1]) upIdx = i
    if (d < speed[downIdx] - speed[downIdx - 1]) downIdx = i
  }
  add(upIdx, 'harsh_accel')
  add(downIdx, 'harsh_brake')

  // Speeding where speed exceeds 100 km/h: the first crossing and the peak.
  let fastIdx = 1
  let firstOver = -1
  for (let i = 1; i < speed.length; i++) {
    if (speed[i] > 100 && firstOver === -1) firstOver = i
    if (speed[i] > speed[fastIdx]) fastIdx = i
  }
  if (firstOver !== -1) add(firstOver, 'speeding')
  add(fastIdx, 'speeding')

  // Idling at the middle of each idle window.
  for (const [s, e] of idleWindows) add(Math.floor((s + e) / 2), 'idling')

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return events
}

// --- Provider raw encoders -------------------------------------------------

type NorthwindKind = 'harshBraking' | 'harshAccel' | 'overspeed' | 'idle'
type HaulixCode = 'HARD_BRAKE' | 'HARD_ACCEL' | 'SPEEDING' | 'IDLING'
type TracpointCode = 0 | 1 | 2 | 3 | 4

const NW_KIND: Record<SafetyEventType, NorthwindKind> = {
  harsh_brake: 'harshBraking',
  harsh_accel: 'harshAccel',
  speeding: 'overspeed',
  idling: 'idle',
}
const HX_CODE: Record<SafetyEventType, HaulixCode> = {
  harsh_brake: 'HARD_BRAKE',
  harsh_accel: 'HARD_ACCEL',
  speeding: 'SPEEDING',
  idling: 'IDLING',
}
const TP_CODE: Record<SafetyEventType, TracpointCode> = {
  harsh_brake: 1,
  harsh_accel: 2,
  speeding: 3,
  idling: 4,
}

const KMH_PER_MPH = 1.609344

interface NorthwindEvent {
  kind: NorthwindKind
  ts: number
}
interface NorthwindPing {
  id: string
  ts: number
  gps: { lat: number; lon: number }
  spd_mph: number
  events: NorthwindEvent[]
}
interface HaulixPing {
  vehicle_id: string
  recorded_at: string
  latitude: number
  longitude: number
  speed_kmph: number
  event_code: HaulixCode | null
}
interface TracpointPing {
  device: { serial: string }
  position: { y: number; x: number }
  velocity_ms: number
  time: number
  evt: TracpointCode
}

function eventsByTimestamp(events: SafetyEvent[]): Map<string, SafetyEvent> {
  const map = new Map<string, SafetyEvent>()
  for (const e of events) map.set(e.timestamp, e)
  return map
}

function encodeNorthwind(vehicle: Vehicle, track: Track): NorthwindPing[] {
  const byTs = eventsByTimestamp(track.events)
  return track.locations.map((loc) => {
    const ev = byTs.get(loc.timestamp)
    const ts = Date.parse(loc.timestamp)
    return {
      id: vehicle.id,
      ts,
      gps: { lat: loc.lat, lon: loc.lng },
      spd_mph: round(loc.speedKmh / KMH_PER_MPH, 1),
      events: ev ? [{ kind: NW_KIND[ev.type], ts: Date.parse(ev.timestamp) }] : [],
    }
  })
}

function encodeHaulix(vehicle: Vehicle, track: Track): HaulixPing[] {
  const byTs = eventsByTimestamp(track.events)
  return track.locations.map((loc) => {
    const ev = byTs.get(loc.timestamp)
    return {
      vehicle_id: vehicle.id,
      recorded_at: loc.timestamp,
      latitude: loc.lat,
      longitude: loc.lng,
      speed_kmph: loc.speedKmh,
      event_code: ev ? HX_CODE[ev.type] : null,
    }
  })
}

function encodeTracpoint(vehicle: Vehicle, track: Track): TracpointPing[] {
  const byTs = eventsByTimestamp(track.events)
  return track.locations.map((loc) => {
    const ev = byTs.get(loc.timestamp)
    return {
      device: { serial: vehicle.vin },
      // y is latitude and x is longitude on purpose, mirroring a real trap.
      position: { y: loc.lat, x: loc.lng },
      velocity_ms: round(loc.speedKmh / 3.6, 1),
      time: Math.round(Date.parse(loc.timestamp) / 1000),
      evt: ev ? TP_CODE[ev.type] : 0,
    }
  })
}

// --- Main ------------------------------------------------------------------

function main(): void {
  const rng = createRng()

  const vehicles: Vehicle[] = []
  const allLocations: Location[] = []
  const allEvents: SafetyEvent[] = []

  const northwind: NorthwindPing[] = []
  const haulix: HaulixPing[] = []
  const tracpoint: TracpointPing[] = []

  const perProviderSeq: Record<string, number> = {}

  FLEET.forEach((spec, gi) => {
    const code = PROVIDER_CODE[spec.provider.id]
    const seq = (perProviderSeq[spec.provider.id] ?? 0) + 1
    perProviderSeq[spec.provider.id] = seq

    const vin = makeVin(rng)
    const vehicle: Vehicle = {
      id: `${code}-${String(seq).padStart(2, '0')}`,
      label: `${spec.provider.name} ${String(seq).padStart(2, '0')}`,
      providerId: spec.provider.id,
      vin,
    }
    vehicles.push(vehicle)

    const corridor = CORRIDORS[spec.corridorKey]
    const startOffset = gi * 5 * 60 * 1000 // stagger starts by 5 minutes
    const track = buildTrack(vehicle, corridor, startOffset, rng)

    allLocations.push(...track.locations)
    allEvents.push(...track.events)

    if (spec.provider.id === NORTHWIND.id) {
      northwind.push(...encodeNorthwind(vehicle, track))
    } else if (spec.provider.id === HAULIX.id) {
      haulix.push(...encodeHaulix(vehicle, track))
    } else {
      tracpoint.push(...encodeTracpoint(vehicle, track))
    }
  })

  const here = dirname(fileURLToPath(import.meta.url))
  const dataDir = resolve(here, '../src/data')
  const rawDir = resolve(dataDir, 'raw')
  mkdirSync(rawDir, { recursive: true })

  const truth = { vehicles, locations: allLocations, events: allEvents }
  writeFileSync(resolve(dataDir, 'truth.json'), JSON.stringify(truth, null, 2) + '\n')
  writeFileSync(
    resolve(rawDir, 'northwind.json'),
    JSON.stringify(northwind, null, 2) + '\n',
  )
  writeFileSync(resolve(rawDir, 'haulix.json'), JSON.stringify(haulix, null, 2) + '\n')
  writeFileSync(
    resolve(rawDir, 'tracpoint.json'),
    JSON.stringify(tracpoint, null, 2) + '\n',
  )

  const rawTotal = northwind.length + haulix.length + tracpoint.length
  console.log('FleetBridge data generated:')
  console.log(`  vehicles:          ${vehicles.length}`)
  console.log(`  canonical pings:   ${allLocations.length}`)
  console.log(`  canonical events:  ${allEvents.length}`)
  console.log(`  northwind pings:   ${northwind.length}`)
  console.log(`  haulix pings:      ${haulix.length}`)
  console.log(`  tracpoint pings:   ${tracpoint.length}`)
  console.log(`  raw total pings:   ${rawTotal}`)
}

main()
