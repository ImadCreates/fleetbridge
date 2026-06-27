import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

import northwindRaw from '../data/raw/northwind.json'
import haulixRaw from '../data/raw/haulix.json'
import tracpointRaw from '../data/raw/tracpoint.json'
import vehiclesData from '../data/vehicles.json'

import { PROVIDERS } from '../core/model'
import type { Location, Provider, SafetyEvent, Vehicle } from '../core/model'
import { getAdapter } from '../core/adapters'
import {
  buildFleetSummary,
  buildVehicleSummary,
} from '../core/analytics/summary'
import type { FleetSummary, VehicleSummary } from '../core/analytics/summary'

export interface FleetData {
  providers: Provider[]
  vehicles: Vehicle[]
  locationsByVehicle: Record<string, Location[]>
  eventsByVehicle: Record<string, SafetyEvent[]>
  vehicleSummaries: VehicleSummary[]
  fleetSummary: FleetSummary
}

// Raw provider payloads are typed as unknown[]; the adapters validate shape.
const RAW_BY_PROVIDER: Record<string, unknown[]> = {
  northwind: northwindRaw as unknown[],
  haulix: haulixRaw as unknown[],
  tracpoint: tracpointRaw as unknown[],
}

// vehicles.json is the registry (master data) extracted from the canonical set.
const VEHICLES = vehiclesData as Vehicle[]

function computeFleet(): FleetData {
  const locationsByVehicle: Record<string, Location[]> = {}
  const eventsByVehicle: Record<string, SafetyEvent[]> = {}

  for (const vehicle of VEHICLES) {
    const adapter = getAdapter(vehicle.providerId)
    const raw = RAW_BY_PROVIDER[vehicle.providerId] ?? []
    const normalized = adapter
      ? adapter.normalize(raw, vehicle)
      : { locations: [], events: [] }
    locationsByVehicle[vehicle.id] = normalized.locations
    eventsByVehicle[vehicle.id] = normalized.events
  }

  const vehicleSummaries = VEHICLES.map((vehicle) =>
    buildVehicleSummary(
      vehicle,
      locationsByVehicle[vehicle.id],
      eventsByVehicle[vehicle.id],
    ),
  )

  return {
    providers: PROVIDERS,
    vehicles: VEHICLES,
    locationsByVehicle,
    eventsByVehicle,
    vehicleSummaries,
    fleetSummary: buildFleetSummary(vehicleSummaries),
  }
}

const FleetContext = createContext<FleetData | null>(null)

export function FleetProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FleetData | null>(null)

  // Normalize and aggregate once on mount; no fetch, all in memory.
  useEffect(() => {
    setData(computeFleet())
  }, [])

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <span className="font-mono text-sm text-slate-400">
          Loading fleet data
        </span>
      </div>
    )
  }

  return <FleetContext.Provider value={data}>{children}</FleetContext.Provider>
}

export function useFleet(): FleetData {
  const ctx = useContext(FleetContext)
  if (ctx === null) {
    throw new Error('useFleet must be used within a FleetProvider')
  }
  return ctx
}
