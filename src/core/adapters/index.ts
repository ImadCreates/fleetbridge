import type { ProviderAdapter } from './types'
import { northwindAdapter } from './northwind'
import { haulixAdapter } from './haulix'
import { tracpointAdapter } from './tracpoint'

export type { ProviderAdapter } from './types'
export { makeConfigAdapter } from './configAdapter'
export type { MappingConfig } from './configAdapter'
export { northwindAdapter, haulixAdapter, tracpointAdapter }

/** Built-in adapters keyed by providerId. */
export const adapters: Record<string, ProviderAdapter> = {
  [northwindAdapter.id]: northwindAdapter,
  [haulixAdapter.id]: haulixAdapter,
  [tracpointAdapter.id]: tracpointAdapter,
}

/** Look up an adapter by providerId, or undefined if none is registered. */
export function getAdapter(providerId: string): ProviderAdapter | undefined {
  return adapters[providerId]
}
