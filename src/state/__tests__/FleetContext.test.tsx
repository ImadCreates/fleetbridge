import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Simulate missing adapter wiring for every provider.
vi.mock('../../core/adapters', () => ({
  getAdapter: () => undefined,
}))

import { FleetProvider } from '../FleetContext'

describe('FleetProvider', () => {
  it('surfaces an error state when adapter wiring is missing', async () => {
    render(
      <FleetProvider>
        <div data-testid="child">loaded</div>
      </FleetProvider>,
    )

    expect(
      await screen.findByText('Failed to load fleet data'),
    ).toBeInTheDocument()
    // The error names the missing provider rather than yielding a zero-telemetry vehicle.
    expect(
      screen.getByText(/No adapter registered for provider/),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })
})
