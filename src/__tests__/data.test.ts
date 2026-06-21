import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Location, SafetyEvent, Vehicle } from '../core/model'

interface Truth {
  vehicles: Vehicle[]
  locations: Location[]
  events: SafetyEvent[]
}

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(here, '../data')

function readJson<T>(relPath: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, relPath), 'utf8')) as T
}

const truth = readJson<Truth>('truth.json')
// Raw ping shapes differ per provider; we only need their counts here.
const northwind = readJson<unknown[]>('raw/northwind.json')
const haulix = readJson<unknown[]>('raw/haulix.json')
const tracpoint = readJson<unknown[]>('raw/tracpoint.json')

// Rough Greater Toronto Area bounding box.
const GTA = { minLat: 43.2, maxLat: 44.2, minLng: -80.2, maxLng: -78.8 }

describe('canonical truth data', () => {
  it('has vehicles and locations', () => {
    expect(truth.vehicles.length).toBeGreaterThan(0)
    expect(truth.locations.length).toBeGreaterThan(0)
  })

  it('gives every vehicle a strictly increasing timestamp series', () => {
    for (const vehicle of truth.vehicles) {
      const times = truth.locations
        .filter((l) => l.vehicleId === vehicle.id)
        .map((l) => Date.parse(l.timestamp))
      expect(times.length).toBeGreaterThan(0)
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1])
      }
    }
  })

  it('keeps all coordinates within rough GTA bounds', () => {
    for (const loc of truth.locations) {
      expect(loc.lat).toBeGreaterThanOrEqual(GTA.minLat)
      expect(loc.lat).toBeLessThanOrEqual(GTA.maxLat)
      expect(loc.lng).toBeGreaterThanOrEqual(GTA.minLng)
      expect(loc.lng).toBeLessThanOrEqual(GTA.maxLng)
    }
  })

  it('never reports a negative speed', () => {
    for (const loc of truth.locations) {
      expect(loc.speedKmh).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('canonical safety events', () => {
  it('has at least one event', () => {
    expect(truth.events.length).toBeGreaterThan(0)
  })

  it('places every event within its vehicle location time span', () => {
    const span = new Map<string, { min: number; max: number }>()
    for (const loc of truth.locations) {
      const t = Date.parse(loc.timestamp)
      const cur = span.get(loc.vehicleId)
      if (cur === undefined) {
        span.set(loc.vehicleId, { min: t, max: t })
      } else {
        if (t < cur.min) cur.min = t
        if (t > cur.max) cur.max = t
      }
    }
    for (const event of truth.events) {
      const bounds = span.get(event.vehicleId)
      expect(bounds).toBeDefined()
      const t = Date.parse(event.timestamp)
      expect(t).toBeGreaterThanOrEqual(bounds!.min)
      expect(t).toBeLessThanOrEqual(bounds!.max)
    }
  })

  it('only references vehicle ids that exist', () => {
    const ids = new Set(truth.vehicles.map((v) => v.id))
    for (const event of truth.events) {
      expect(ids.has(event.vehicleId)).toBe(true)
    }
  })
})

describe('raw provider files', () => {
  it('together hold the same ping count as the canonical truth', () => {
    const rawTotal = northwind.length + haulix.length + tracpoint.length
    expect(rawTotal).toBe(truth.locations.length)
  })
})
