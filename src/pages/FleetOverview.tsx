import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useFleet } from '../state/FleetContext'
import { FleetMap } from '../components/FleetMap'
import type { LatLng, MapRoute } from '../components/FleetMap'
import { FleetTable } from '../components/FleetTable'
import { MetricCard } from '../components/MetricCard'
import { providerColor } from '../lib/palette'
import { formatInt, formatKm, formatScore } from '../lib/format'

export function FleetOverview() {
  const navigate = useNavigate()
  const { vehicles, locationsByVehicle, vehicleSummaries, fleetSummary } =
    useFleet()

  const routes = useMemo<MapRoute[]>(
    () =>
      vehicles.map((vehicle) => {
        const locations = locationsByVehicle[vehicle.id]
        const positions = locations.map(
          (l) => [l.lat, l.lng] as LatLng,
        )
        const last = locations[locations.length - 1]
        return {
          id: vehicle.id,
          positions,
          color: providerColor(vehicle.providerId),
          label: vehicle.label,
          current: last ? [last.lat, last.lng] : undefined,
        }
      }),
    [vehicles, locationsByVehicle],
  )

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">Fleet overview</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Vehicles" value={formatInt(fleetSummary.vehicleCount)} />
        <MetricCard
          label="Total distance"
          value={formatKm(fleetSummary.totalDistanceKm)}
          unit="km"
        />
        <MetricCard
          label="Safety events"
          value={formatInt(fleetSummary.totalEvents)}
        />
        <MetricCard
          label="Avg safety"
          value={formatScore(fleetSummary.avgSafetyScore)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-white">
            <FleetMap
              routes={routes}
              onSelect={(id) => navigate(`/vehicle/${id}`)}
            />
          </div>
        </div>
        <div className="lg:col-span-2">
          <FleetTable summaries={vehicleSummaries} />
        </div>
      </div>
    </div>
  )
}
