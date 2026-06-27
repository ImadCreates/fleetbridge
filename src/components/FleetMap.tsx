import { Fragment, useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type LatLng = [number, number]

export interface MapRoute {
  id: string
  positions: LatLng[]
  color: string
  label: string
  current?: LatLng
}

export interface MapEvent {
  position: LatLng
  color: string
  label: string
}

interface FleetMapProps {
  routes: MapRoute[]
  events?: MapEvent[]
  onSelect?: (id: string) => void
}

const TILE_URL =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const GTA_CENTER: LatLng = [43.7, -79.4]

// Fits the map to every rendered point whenever the routes or events change.
function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    map.fitBounds(new LatLngBounds(points), { padding: [24, 24] })
  }, [map, points])
  return null
}

export function FleetMap({ routes, events = [], onSelect }: FleetMapProps) {
  const points = useMemo<LatLng[]>(() => {
    const all: LatLng[] = []
    for (const route of routes) all.push(...route.positions)
    for (const event of events) all.push(event.position)
    return all
  }, [routes, events])

  return (
    <MapContainer
      center={points[0] ?? GTA_CENTER}
      zoom={10}
      className="h-full w-full"
      preferCanvas
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {routes.map((route) => {
        const handlers = onSelect
          ? { click: () => onSelect(route.id) }
          : undefined
        return (
          <Fragment key={route.id}>
            <Polyline
              positions={route.positions}
              pathOptions={{ color: route.color, weight: 2, opacity: 0.85 }}
              eventHandlers={handlers}
            />
            {route.current !== undefined && (
              <CircleMarker
                center={route.current}
                radius={5}
                pathOptions={{
                  color: route.color,
                  fillColor: route.color,
                  fillOpacity: 1,
                  weight: 2,
                }}
                eventHandlers={handlers}
              >
                <Tooltip>{route.label}</Tooltip>
              </CircleMarker>
            )}
          </Fragment>
        )
      })}
      {events.map((event, i) => (
        <CircleMarker
          key={i}
          center={event.position}
          radius={5}
          pathOptions={{
            color: event.color,
            fillColor: event.color,
            fillOpacity: 0.9,
            weight: 1,
          }}
        >
          <Tooltip>{event.label}</Tooltip>
        </CircleMarker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  )
}
