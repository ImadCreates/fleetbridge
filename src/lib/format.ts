// Number and timestamp formatting per DESIGN.md. Every displayed value passes
// through one of these so rounding stays consistent.

/** Distance in km, one decimal. */
export function formatKm(km: number): string {
  return km.toFixed(1)
}

/** Whole number with thousands separators. */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** Speed in km/h, integer. */
export function formatSpeed(kmh: number): string {
  return Math.round(kmh).toString()
}

/** Safety score, integer clamped to 0 to 100 so it cannot exceed its contract. */
export function formatScore(score: number): string {
  return Math.round(Math.min(100, Math.max(0, score))).toString()
}

/** Latitude or longitude, 5 decimals. */
export function formatCoord(value: number): string {
  return value.toFixed(5)
}

/** Timestamp as HH:MM:SS, 24 hour. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false })
}

/** Human label for a safety event type. */
export function eventLabel(type: string): string {
  return type.replace('_', ' ')
}
