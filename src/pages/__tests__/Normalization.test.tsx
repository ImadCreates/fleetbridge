import { fireEvent, render, screen } from '@testing-library/react'

import { Normalization } from '../Normalization'

describe('Normalization', () => {
  it('renders canonical output from the real adapter for each provider', () => {
    render(<Normalization />)
    const body = () => document.body.textContent ?? ''

    // Northwind is selected by default: raw uses spd_mph, canonical uses vehicleId.
    expect(body()).toContain('spd_mph')
    expect(body()).toContain('"vehicleId": "nw-01"')

    fireEvent.click(screen.getByRole('button', { name: 'Haulix' }))
    expect(body()).toContain('speed_kmph')
    expect(body()).toContain('"vehicleId": "hx-01"')

    fireEvent.click(screen.getByRole('button', { name: 'TracPoint' }))
    expect(body()).toContain('velocity_ms')
    expect(body()).toContain('"vehicleId": "tp-01"')
  })
})
