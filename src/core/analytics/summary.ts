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
  avgSpeedKmh: number
  maxSpeedKmh: number
  idlingMinutes: number
  eventCounts: Record<SafetyEventType, number>
  safetyScore: number
}

export function buildVehicleSummary(
  vehicle: Vehicle,
  locations: Location[],
  events: SafetyEvent[],
): VehicleSummary {
  const distanceKm = totalDistanceKm(locations)
  const eventCounts = countEventsByType(events)
  return {
    vehicle,
    distanceKm,
    avgSpeedKmh: averageSpeedKmh(locations),
    maxSpeedKmh: maxSpeedKmh(locations),
    idlingMinutes: idlingMinutes(locations),
    eventCounts,
    safetyScore: safetyScore({ distanceKm, eventCounts }),
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
  const avgSafetyScore =
    vehicleCount === 0
      ? 0
      : summaries.reduce((acc, s) => acc + s.safetyScore, 0) / vehicleCount
  return {
    vehicleCount,
    totalDistanceKm: distanceSum,
    totalEvents,
    avgSafetyScore,
  }
}
