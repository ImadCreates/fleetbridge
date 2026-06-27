import type { Location, SafetyEvent, Vehicle } from '../../model'
import {
  averageSpeedKmh,
  countEventsByType,
  haversineKm,
  idlingMinutes,
  maxSpeedKmh,
  safetyScore,
  speedingSeconds,
  totalDistanceKm,
} from '../metrics'
import { buildFleetSummary, buildVehicleSummary } from '../summary'

const BASE = Date.parse('2026-06-15T13:00:00.000Z')
// One degree of latitude is ~111.195 km, so this is ~1 km north.
const KM_IN_DEG_LAT = 1 / 111.195

function loc(secOffset: number, speedKmh: number, lat = 43.0, lng = -79.0): Location {
  return {
    vehicleId: 'v1',
    timestamp: new Date(BASE + secOffset * 1000).toISOString(),
    lat,
    lng,
    speedKmh,
    headingDeg: 0,
  }
}

function event(type: SafetyEvent['type']): SafetyEvent {
  return { id: `e-${type}`, vehicleId: 'v1', type, timestamp: new Date(BASE).toISOString(), lat: 43, lng: -79 }
}

describe('haversineKm', () => {
  it('returns about 1.0 for points one kilometre apart', () => {
    const a = { lat: 43.0, lng: -79.0 }
    const b = { lat: 43.0 + KM_IN_DEG_LAT, lng: -79.0 }
    expect(haversineKm(a, b)).toBeCloseTo(1.0, 2)
  })
})

describe('totalDistanceKm', () => {
  it('sums consecutive legs in timestamp order regardless of input order', () => {
    const points = [
      loc(20, 0, 43.0 + 2 * KM_IN_DEG_LAT),
      loc(0, 0, 43.0),
      loc(10, 0, 43.0 + KM_IN_DEG_LAT),
    ]
    expect(totalDistanceKm(points)).toBeCloseTo(2.0, 2)
  })
})

describe('averageSpeedKmh and maxSpeedKmh', () => {
  const points = [loc(0, 0), loc(10, 100), loc(20, 50)]
  it('averages the sampled speeds', () => {
    expect(averageSpeedKmh(points)).toBeCloseTo(50, 5)
  })
  it('reports the peak speed', () => {
    expect(maxSpeedKmh(points)).toBe(100)
  })
  it('returns 0 for an empty series', () => {
    expect(averageSpeedKmh([])).toBe(0)
    expect(maxSpeedKmh([])).toBe(0)
  })
})

describe('speedingSeconds', () => {
  it('counts time spent above the limit', () => {
    // Intervals attributed by the starting sample: 90(no), 110(+10), 110(+10).
    const points = [loc(0, 90), loc(10, 110), loc(20, 110), loc(30, 90)]
    expect(speedingSeconds(points, 100)).toBe(20)
  })
})

describe('idlingMinutes', () => {
  it('totals time below the threshold for a flat low-speed series', () => {
    // 7 samples, 10s apart, all near zero: 6 intervals * 10s = 60s = 1.0 min.
    const points = [0, 10, 20, 30, 40, 50, 60].map((s) => loc(s, 0))
    expect(idlingMinutes(points, 2)).toBeCloseTo(1.0, 5)
  })
})

describe('countEventsByType', () => {
  it('counts each type with all types present', () => {
    const events = [event('speeding'), event('speeding'), event('harsh_brake')]
    expect(countEventsByType(events)).toEqual({
      harsh_brake: 1,
      harsh_accel: 0,
      speeding: 2,
      idling: 0,
    })
  })
})

describe('safetyScore', () => {
  it('is 100 with no events', () => {
    expect(safetyScore({ distanceKm: 50, eventCounts: countEventsByType([]) })).toBe(100)
  })
  it('subtracts the documented weighted penalty per 100 km', () => {
    // (harsh_brake 2*1 + speeding 3*1) * (100/100) = 5 -> 95.
    const eventCounts = { harsh_brake: 1, harsh_accel: 0, speeding: 1, idling: 0 }
    expect(safetyScore({ distanceKm: 100, eventCounts })).toBe(95)
  })
  it('clamps to 0 and never goes negative', () => {
    const eventCounts = { harsh_brake: 50, harsh_accel: 50, speeding: 50, idling: 50 }
    expect(safetyScore({ distanceKm: 1, eventCounts })).toBe(0)
  })
})

describe('summaries', () => {
  const vehicle: Vehicle = {
    id: 'v1',
    label: 'Test 01',
    providerId: 'demo',
    vin: 'TEST0000000000001',
  }
  // Three fixes spanning ~100 km so the safety score is a clean positive value.
  const points = [
    loc(0, 0, 43.0),
    loc(10, 100, 43.0 + 50 * KM_IN_DEG_LAT),
    loc(20, 0, 43.0 + 100 * KM_IN_DEG_LAT),
  ]
  const events = [event('speeding')]

  it('builds a vehicle summary from the metrics', () => {
    const summary = buildVehicleSummary(vehicle, points, events)
    expect(summary.vehicle.id).toBe('v1')
    expect(summary.distanceKm).toBeCloseTo(100, 0)
    expect(summary.maxSpeedKmh).toBe(100)
    expect(summary.eventCounts.speeding).toBe(1)
    // 100 - (speeding weight 3 * 1 event) * (100 / ~100 km) ~= 97.
    expect(summary.safetyScore).toBeCloseTo(97, 1)
  })

  it('aggregates a fleet summary across vehicles', () => {
    const a = buildVehicleSummary(vehicle, points, events)
    const b = buildVehicleSummary(
      { ...vehicle, id: 'v2' },
      points,
      [event('harsh_brake'), event('idling')],
    )
    const fleet = buildFleetSummary([a, b])
    expect(fleet.vehicleCount).toBe(2)
    expect(fleet.totalEvents).toBe(3)
    expect(fleet.totalDistanceKm).toBeCloseTo(a.distanceKm + b.distanceKm, 5)
    expect(fleet.avgSafetyScore).toBeCloseTo((a.safetyScore + b.safetyScore) / 2, 5)
  })

  it('returns a zero fleet summary for no vehicles', () => {
    expect(buildFleetSummary([])).toEqual({
      vehicleCount: 0,
      totalDistanceKm: 0,
      totalEvents: 0,
      avgSafetyScore: 0,
    })
  })
})
