// Canonical FleetBridge data model. Every provider adapter normalizes raw
// telematics into these shapes, and the rest of the app reads only these.

export interface Provider {
  id: string
  name: string
}

export interface Vehicle {
  id: string
  label: string
  providerId: string
  vin: string
}

export interface Location {
  vehicleId: string
  /** ISO 8601 timestamp, e.g. "2026-06-15T13:00:10.000Z". */
  timestamp: string
  lat: number
  lng: number
  speedKmh: number
  headingDeg: number
}

export type SafetyEventType =
  | 'harsh_brake'
  | 'harsh_accel'
  | 'speeding'
  | 'idling'

export interface SafetyEvent {
  id: string
  vehicleId: string
  type: SafetyEventType
  /** ISO 8601 timestamp aligned to the Location it was derived from. */
  timestamp: string
  lat: number
  lng: number
}

export const NORTHWIND: Provider = { id: 'northwind', name: 'Northwind' }
export const HAULIX: Provider = { id: 'haulix', name: 'Haulix' }
export const TRACPOINT: Provider = { id: 'tracpoint', name: 'TracPoint' }

export const PROVIDERS: Provider[] = [NORTHWIND, HAULIX, TRACPOINT]
