// Color tokens from DESIGN.md. JS constants are used where Leaflet and inline
// styles need real color strings; Tailwind classes cover everything else.

import type { SafetyEventType } from '../core/model'

export const ACCENT = '#4f46e5' // indigo-600

const PROVIDER_COLORS: Record<string, string> = {
  northwind: '#0d9488', // teal-600
  haulix: '#d97706', // amber-600
  tracpoint: '#e11d48', // rose-600
}

export function providerColor(providerId: string): string {
  return PROVIDER_COLORS[providerId] ?? '#64748b' // slate-500 fallback
}

export const EVENT_COLORS: Record<SafetyEventType, string> = {
  speeding: '#dc2626', // red-600
  harsh_brake: '#ea580c', // orange-600
  harsh_accel: '#d97706', // amber-600
  idling: '#64748b', // slate-500
}
