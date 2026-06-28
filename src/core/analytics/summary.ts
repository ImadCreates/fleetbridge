// Pure aggregation of per-vehicle and fleet-wide summaries built from metrics.

import type { Location, SafetyEvent, SafetyEventType, Vehicle } from '../model'
import {
  averageSpeedKmh,
  countEventsByType,
  idlingMinutes,
  maxSpeedKmh,
  safetyScore,
  totalDistanceKm,
} from './metrics'

export type VehicleSummary = {
  vehicle: Vehicle
  distanceKm: number
  durationHours: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  idlingMinutes: number
  eventCounts: Record<SafetyEventType, number>
  safetyScore: number
}

/** Trip duration in hours, from the earliest to the latest location timestamp. */
function tripDurationHours(locations: Location[]): number {
  if (locations.length < 2) return 0
  let min = Infinity
  let max = -Infinity
  for (const location of locations) {
    const t = Date.parse(location.timestamp)
    if (t < min) min = t
    if (t > max) max = t
  }
  return (max - min) / 3_600_000
}

export function buildVehicleSummary(
  vehicle: Vehicle,
  locations: Location[],
  events: SafetyEvent[],
): VehicleSummary {
  const distanceKm = totalDistanceKm(locations)
  const durationHours = tripDurationHours(locations)
  const eventCounts = countEventsByType(events)
  return {
    vehicle,
    distanceKm,
    durationHours,
    avgSpeedKmh: averageSpeedKmh(locations),
    maxSpeedKmh: maxSpeedKmh(locations),
    idlingMinutes: idlingMinutes(locations),
    eventCounts,
    safetyScore: safetyScore({ durationHours, eventCounts }),
  }
}

export type FleetSummary = {
  vehicleCount: number
  totalDistanceKm: number
  totalEvents: number
  avgSafetyScore: number
}

function sumEventCounts(counts: Record<SafetyEventType, number>): number {
  return Object.values(counts).reduce((acc, n) => acc + n, 0)
}

export function buildFleetSummary(summaries: VehicleSummary[]): FleetSummary {
  const vehicleCount = summaries.length
  const distanceSum = summaries.reduce((acc, s) => acc + s.distanceKm, 0)
  const totalEvents = summaries.reduce(
    (acc, s) => acc + sumEventCounts(s.eventCounts),
    0,
  )
  // Exclude only vehicles with no driving exposure (zero duration). This matches
  // the per-hour scoring basis, so every vehicle that gets a real score on its
  // detail page also counts toward the fleet average.
  const withExposure = summaries.filter((s) => s.durationHours > 0)
  const avgSafetyScore =
    withExposure.length === 0
      ? 0
      : withExposure.reduce((acc, s) => acc + s.safetyScore, 0) /
        withExposure.length
  return {
    vehicleCount,
    totalDistanceKm: distanceSum,
    totalEvents,
    avgSafetyScore,
  }
}
