import { fireEvent, render, screen } from '@testing-library/react'

import { AddProvider } from '../AddProvider'

describe('AddProvider', () => {
  it('normalizes the Fleetwave example on load', () => {
    render(<AddProvider />)
    const body = () => document.body.textContent ?? ''

    expect(body()).toContain('"vehicleId": "fleetwave-01"')
    expect(body()).toContain('speedKmh')
    expect(body()).toContain('4 locations, 2 events')
  })

  it('surfaces a validation error on malformed JSON', () => {
    render(<AddProvider />)

    fireEvent.change(screen.getByLabelText('Raw pings'), {
      target: { value: '[{ not valid json' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Normalize' }))

    expect(screen.getByText('Could not normalize')).toBeInTheDocument()
    expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument()
  })

  it('rejects a non-finite numeric value with a named error', () => {
    render(<AddProvider />)

    // 1e400 parses to Infinity, which the old Number.isNaN check let through.
    fireEvent.change(screen.getByLabelText('Raw pings'), {
      target: {
        value:
          '[{"coords":{"latitude":1e400,"longitude":-79.38},"kph":50,"recordedAt":"2026-06-15T13:00:00Z","alert":null}]',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Normalize' }))

    expect(screen.getByText('Could not normalize')).toBeInTheDocument()
    const error = screen.getByText(/is not a finite number/)
    expect(error).toHaveTextContent('coords.latitude')
  })

  it('rejects an empty-string numeric path value with a named error', () => {
    render(<AddProvider />)

    // Number('') is 0, so this must be rejected before coercion.
    fireEvent.change(screen.getByLabelText('Raw pings'), {
      target: {
        value:
          '[{"coords":{"latitude":43.65,"longitude":-79.38},"kph":"","recordedAt":"2026-06-15T13:00:00Z","alert":null}]',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Normalize' }))

    expect(screen.getByText('Could not normalize')).toBeInTheDocument()
    const error = screen.getByText(/did not resolve to a value/)
    expect(error).toHaveTextContent('kph')
  })
})
