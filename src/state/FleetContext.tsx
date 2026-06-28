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
    // Missing wiring is a defect, not zero telemetry: fail loudly so a vehicle
    // never silently reads as having no locations or events.
    const adapter = getAdapter(vehicle.providerId)
    if (adapter === undefined) {
      throw new Error(
        `No adapter registered for provider "${vehicle.providerId}" (vehicle ${vehicle.id})`,
      )
    }
    const raw = RAW_BY_PROVIDER[vehicle.providerId]
    if (raw === undefined) {
      throw new Error(
        `No raw payload for provider "${vehicle.providerId}" (vehicle ${vehicle.id})`,
      )
    }
    const normalized = adapter.normalize(raw, vehicle)
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
  const [error, setError] = useState<string | null>(null)

  // Normalize and aggregate once on mount; no fetch, all in memory.
  useEffect(() => {
    try {
      setData(computeFleet())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [])

  if (error !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white px-6 py-5 text-center">
          <h1 className="text-sm font-semibold text-slate-900">
            Failed to load fleet data
          </h1>
          <p className="mt-1 font-mono text-xs text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

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
