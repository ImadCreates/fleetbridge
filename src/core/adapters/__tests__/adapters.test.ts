import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Location, SafetyEvent, Vehicle } from '../../model'
import { getAdapter } from '../index'
import { makeConfigAdapter } from '../configAdapter'
import { normalizePings } from '../shared'

interface Truth {
  vehicles: Vehicle[]
  locations: Location[]
  events: SafetyEvent[]
}

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(here, '../../../data')

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, relPath), 'utf8')) as T
}

const truth = readJson<Truth>('truth.json')
const rawByProvider: Record<string, unknown[]> = {
  northwind: readJson('raw/northwind.json'),
  haulix: readJson('raw/haulix.json'),
  tracpoint: readJson('raw/tracpoint.json'),
}

// lat/lng round-trip exactly; speed carries unit-conversion rounding error.
const LATLNG_TOL = 1e-6
const SPEED_TOL = 0.2

for (const providerId of ['northwind', 'haulix', 'tracpoint']) {
  describe(`${providerId} adapter round trip`, () => {
    const adapter = getAdapter(providerId)
    const vehicles = truth.vehicles.filter((v) => v.providerId === providerId)

    it('is registered', () => {
      expect(adapter).toBeDefined()
      expect(vehicles.length).toBeGreaterThan(0)
    })

    it('reproduces canonical locations for every vehicle', () => {
      const out: Location[] = []
      for (const v of vehicles) out.push(...adapter!.normalize(rawByProvider[providerId], v).locations)

      const expected = truth.locations.filter((l) =>
        vehicles.some((v) => v.id === l.vehicleId),
      )
      expect(out.length).toBe(expected.length)
      for (let i = 0; i < expected.length; i++) {
        const a = out[i]
        const e = expected[i]
        expect(a.vehicleId).toBe(e.vehicleId)
        expect(a.timestamp).toBe(e.timestamp)
        expect(Math.abs(a.lat - e.lat)).toBeLessThanOrEqual(LATLNG_TOL)
        expect(Math.abs(a.lng - e.lng)).toBeLessThanOrEqual(LATLNG_TOL)
        expect(Math.abs(a.speedKmh - e.speedKmh)).toBeLessThanOrEqual(SPEED_TOL)
      }
    })

    it('reproduces canonical events for every vehicle', () => {
      const out: SafetyEvent[] = []
      for (const v of vehicles) out.push(...adapter!.normalize(rawByProvider[providerId], v).events)

      const expected = truth.events.filter((e) =>
        vehicles.some((v) => v.id === e.vehicleId),
      )
      expect(out.length).toBe(expected.length)
      for (let i = 0; i < expected.length; i++) {
        const a = out[i]
        const e = expected[i]
        expect(a.vehicleId).toBe(e.vehicleId)
        expect(a.type).toBe(e.type)
        expect(a.timestamp).toBe(e.timestamp)
        expect(Math.abs(a.lat - e.lat)).toBeLessThanOrEqual(LATLNG_TOL)
        expect(Math.abs(a.lng - e.lng)).toBeLessThanOrEqual(LATLNG_TOL)
      }
    })

    // Heading and event id are not present in any raw payload: heading is
    // derived from consecutive fixes and ids are generated. Comparing them to
    // truth would fail by design, so they are checked as invariants instead.
    it('derives valid headings and stable, unique event ids', () => {
      const locations: Location[] = []
      const events: SafetyEvent[] = []
      for (const v of vehicles) {
        const out = adapter!.normalize(rawByProvider[providerId], v)
        locations.push(...out.locations)
        events.push(...out.events)
      }

      for (const loc of locations) {
        expect(Number.isFinite(loc.headingDeg)).toBe(true)
        expect(loc.headingDeg).toBeGreaterThanOrEqual(0)
        expect(loc.headingDeg).toBeLessThanOrEqual(360)
      }

      for (const ev of events) {
        expect(typeof ev.id).toBe('string')
        expect(ev.id.length).toBeGreaterThan(0)
      }

      const ids = events.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
}

describe('config-driven adapter', () => {
  it('normalizes an inline raw sample using its mapping config', () => {
    const sample = [
      {
        loc: { lt: 43.7, ln: -79.4 },
        kmh: 80,
        when: '2026-01-01T00:00:00.000Z',
        code: 'BRAKE',
      },
      {
        loc: { lt: 43.71, ln: -79.41 },
        kmh: 121.5,
        when: '2026-01-01T00:00:10.000Z',
        code: null,
      },
    ]
    const adapter = makeConfigAdapter('acme', 'Acme', {
      latPath: 'loc.lt',
      lngPath: 'loc.ln',
      speedPath: 'kmh',
      speedUnit: 'kmh',
      timePath: 'when',
      timeFormat: 'iso',
      eventPath: 'code',
      eventMap: { BRAKE: 'harsh_brake' },
    })
    const vehicle: Vehicle = {
      id: 'acme-01',
      label: 'Acme 01',
      providerId: 'acme',
      vin: 'ACME0000000000001',
    }

    const { locations, events } = adapter.normalize(sample, vehicle)

    expect(locations).toHaveLength(2)
    expect(locations[0]).toMatchObject({
      vehicleId: 'acme-01',
      timestamp: '2026-01-01T00:00:00.000Z',
      lat: 43.7,
      lng: -79.4,
      speedKmh: 80,
    })
    expect(locations[1].speedKmh).toBe(121.5)
    expect(locations[1].timestamp).toBe('2026-01-01T00:00:10.000Z')

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      vehicleId: 'acme-01',
      type: 'harsh_brake',
      timestamp: '2026-01-01T00:00:00.000Z',
      lat: 43.7,
      lng: -79.4,
    })
  })

  it('converts units and timestamps from raw formats', () => {
    const sample = [{ y: 43.65, x: -79.38, v: 25, t: 1781528400 }]
    const adapter = makeConfigAdapter('demo', 'Demo', {
      latPath: 'y',
      lngPath: 'x',
      speedPath: 'v',
      speedUnit: 'ms',
      timePath: 't',
      timeFormat: 'unix_s',
    })
    const vehicle: Vehicle = {
      id: 'demo-01',
      label: 'Demo 01',
      providerId: 'demo',
      vin: 'DEMO0000000000001',
    }

    const { locations, events } = adapter.normalize(sample, vehicle)
    expect(events).toHaveLength(0)
    expect(locations[0].speedKmh).toBeCloseTo(90, 5) // 25 m/s -> 90 km/h
    expect(locations[0].timestamp).toBe('2026-06-15T13:00:00.000Z')
  })
})

describe('event id disambiguation', () => {
  it('gives two same-type events on one ping distinct ids', () => {
    // A single synthetic ping that emits two harsh_brake events at the same
    // timestamp would collide without the within-ping ordinal.
    const pings = [{ ts: '2026-01-01T00:00:00.000Z' }]
    const { events } = normalizePings('veh-1', pings, {
      lat: () => 43.7,
      lng: () => -79.4,
      speedKmh: () => 50,
      timestamp: (p) => p.ts,
      events: (p) => [
        { type: 'harsh_brake', timestamp: p.ts },
        { type: 'harsh_brake', timestamp: p.ts },
      ],
    })
    expect(events).toHaveLength(2)
    expect(events[0].id).not.toBe(events[1].id)
    expect(new Set(events.map((e) => e.id)).size).toBe(2)
  })
})
