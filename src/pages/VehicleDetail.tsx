import { Link, useParams } from 'react-router-dom'

import { useFleet } from '../state/FleetContext'
import { FleetMap } from '../components/FleetMap'
import type { LatLng, MapEvent, MapRoute } from '../components/FleetMap'
import { MetricCard } from '../components/MetricCard'
import { ProviderTag } from '../components/ProviderTag'
import { SpeedChart } from '../components/SpeedChart'
import { EventList } from '../components/EventList'
import { EVENT_COLORS, providerColor } from '../lib/palette'
import {
  eventLabel,
  formatInt,
  formatKm,
  formatScore,
  formatSpeed,
  formatTime,
} from '../lib/format'

function totalEvents(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

export function VehicleDetail() {
  const { id } = useParams()
  const { providers, vehicles, locationsByVehicle, eventsByVehicle, vehicleSummaries } =
    useFleet()

  const vehicle = vehicles.find((v) => v.id === id)
  if (vehicle === undefined) {
    return (
      <div className="space-y-3">
        <BackLink />
        <p className="text-sm text-slate-500">Vehicle not found.</p>
      </div>
    )
  }

  const locations = locationsByVehicle[vehicle.id]
  const events = eventsByVehicle[vehicle.id]
  const summary = vehicleSummaries.find((s) => s.vehicle.id === vehicle.id)!
  const providerName =
    providers.find((p) => p.id === vehicle.providerId)?.name ??
    vehicle.providerId

  const last = locations[locations.length - 1]
  const route: MapRoute = {
    id: vehicle.id,
    positions: locations.map((l) => [l.lat, l.lng] as LatLng),
    color: providerColor(vehicle.providerId),
    label: vehicle.label,
    current: last ? [last.lat, last.lng] : undefined,
  }
  const mapEvents: MapEvent[] = events.map((e) => ({
    position: [e.lat, e.lng],
    color: EVENT_COLORS[e.type],
    label: `${eventLabel(e.type)} ${formatTime(e.timestamp)}`,
  }))

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          {vehicle.label}
        </h1>
        <ProviderTag providerId={vehicle.providerId} name={providerName} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Distance" value={formatKm(summary.distanceKm)} unit="km" />
        <MetricCard label="Avg speed" value={formatSpeed(summary.avgSpeedKmh)} unit="km/h" />
        <MetricCard label="Max speed" value={formatSpeed(summary.maxSpeedKmh)} unit="km/h" />
        <MetricCard label="Idling" value={formatKm(summary.idlingMinutes)} unit="min" />
        <MetricCard label="Events" value={formatInt(totalEvents(summary.eventCounts))} />
        <MetricCard label="Safety" value={formatScore(summary.safetyScore)} />
      </div>

      <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200 bg-white">
        <FleetMap routes={[route]} events={mapEvents} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Speed over time
          </h2>
          <SpeedChart locations={locations} />
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Safety events
          </h2>
          <EventList events={events} />
        </section>
      </div>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-indigo-600"
    >
      <span aria-hidden>&larr;</span> Fleet
    </Link>
  )
}
