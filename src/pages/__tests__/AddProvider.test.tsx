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
})
