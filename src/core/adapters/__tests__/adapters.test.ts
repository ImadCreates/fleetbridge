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

// Each provider's speed path must emit an exact 2 dp canonical value. Inputs
// are real fixture speeds whose raw conversions carry float artifacts
// (6.8 mph -> 10.9435392, 3.3 m/s -> 11.879999999999999).
describe('canonical speed rounding per conversion path', () => {
  it('northwind rounds the mph conversion: 6.8 mph gives 10.94', () => {
    const vehicle: Vehicle = {
      id: 'nw-01',
      label: 'Northwind 01',
      providerId: 'northwind',
      vin: 'N94YP74HMML2SA78V',
    }
    const raw = [
      { id: 'nw-01', ts: 1781528400000, gps: { lat: 43.687, lon: -79.617 }, spd_mph: 6.8, events: [] },
    ]
    const { locations } = getAdapter('northwind')!.normalize(raw, vehicle)
    expect(locations[0].speedKmh).toBe(10.94)
  })

  it('tracpoint rounds the m/s conversion: 3.3 m/s gives 11.88', () => {
    const vehicle: Vehicle = {
      id: 'tp-01',
      label: 'TracPoint 01',
      providerId: 'tracpoint',
      vin: '2H4X0RGKJ7AYW0T6K',
    }
    const raw = [
      {
        device: { serial: '2H4X0RGKJ7AYW0T6K' },
        position: { y: 43.7256, x: -79.5183 },
        velocity_ms: 3.3,
        time: 1781530200,
        evt: 0,
      },
    ]
    const { locations } = getAdapter('tracpoint')!.normalize(raw, vehicle)
    expect(locations[0].speedKmh).toBe(11.88)
    // The raw ping carries only the device serial (the VIN); the canonical
    // vehicleId is the fleet id it resolves to.
    expect(locations[0].vehicleId).toBe('tp-01')
  })

  it('haulix passes km/h through: 21.9 km/h stays 21.9', () => {
    const vehicle: Vehicle = {
      id: 'hx-01',
      label: 'Haulix 01',
      providerId: 'haulix',
      vin: 'GCD0TWTE522DN0CJ9',
    }
    const raw = [
      {
        vehicle_id: 'hx-01',
        recorded_at: '2026-06-15T13:15:00.000Z',
        latitude: 43.646,
        longitude: -79.357,
        speed_kmph: 21.9,
        event_code: null,
      },
    ]
    const { locations } = getAdapter('haulix')!.normalize(raw, vehicle)
    expect(locations[0].speedKmh).toBe(21.9)
  })

  it('config adapter rounds each speed unit option', () => {
    const vehicle: Vehicle = {
      id: 'cfg-01',
      label: 'Config 01',
      providerId: 'cfg',
      vin: 'CFG00000000000001',
    }
    const configFor = (speedUnit: 'mph' | 'kmh' | 'ms') =>
      makeConfigAdapter('cfg', 'Config', {
        latPath: 'lat',
        lngPath: 'lng',
        speedPath: 'spd',
        speedUnit,
        timePath: 'when',
        timeFormat: 'iso',
      })
    const ping = (spd: number) => [
      { lat: 43.7, lng: -79.4, spd, when: '2026-01-01T00:00:00.000Z' },
    ]

    expect(configFor('mph').normalize(ping(6.8), vehicle).locations[0].speedKmh).toBe(10.94)
    expect(configFor('ms').normalize(ping(3.3), vehicle).locations[0].speedKmh).toBe(11.88)
    expect(configFor('kmh').normalize(ping(21.9), vehicle).locations[0].speedKmh).toBe(21.9)
  })
})

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
