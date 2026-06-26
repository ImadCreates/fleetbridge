import type { Location, SafetyEvent, Vehicle } from '../model'

/**
 * A provider adapter decodes one provider's raw telematics payload into the
 * canonical model for a single vehicle.
 */
export interface ProviderAdapter {
  id: string
  name: string
  normalize(
    raw: unknown,
    vehicle: Vehicle,
  ): { locations: Location[]; events: SafetyEvent[] }
}
