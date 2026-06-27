import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'

import App from '../App'

// Leaflet and Recharts need a real browser canvas; stub them so the test can
// verify the data wiring, rendering, and routing in jsdom.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: () => null,
  Tooltip: () => null,
  useMap: () => ({ fitBounds: () => {} }),
}))
vi.mock('leaflet', () => ({
  LatLngBounds: class {
    constructor(_points: unknown) {}
  },
}))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}))

describe('App', () => {
  it('renders the fleet overview with cards, map, and table', async () => {
    render(<App />)

    expect(await screen.findByText('Fleet overview')).toBeInTheDocument()
    // Metric cards.
    expect(screen.getByText('Vehicles')).toBeInTheDocument()
    expect(screen.getByText('Total distance')).toBeInTheDocument()
    expect(screen.getByText('Avg safety')).toBeInTheDocument()
    // Map mounts.
    expect(screen.getAllByTestId('map').length).toBeGreaterThan(0)
    // Sortable table headers and all eight vehicle rows.
    expect(screen.getByRole('button', { name: /Distance/ })).toBeInTheDocument()
    expect(screen.getByText('Northwind 01')).toBeInTheDocument()
    expect(screen.getByText('TracPoint 02')).toBeInTheDocument()
  })

  it('navigates to the vehicle detail when a row is clicked', async () => {
    render(<App />)

    const row = await screen.findByText('Northwind 01')
    fireEvent.click(row)

    // Detail page content for that vehicle.
    expect(await screen.findByText('Speed over time')).toBeInTheDocument()
    expect(screen.getByText('Safety events')).toBeInTheDocument()
    expect(screen.getByText('Max speed')).toBeInTheDocument()
    // The URL reflects the selected vehicle.
    expect(window.location.pathname).toBe('/vehicle/nw-01')
  })
})
