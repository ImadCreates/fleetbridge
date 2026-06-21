import { getByPath, speedToKmh, toIso } from '../convert'

describe('speedToKmh', () => {
  it('converts mph to km/h', () => {
    expect(speedToKmh(60, 'mph')).toBeCloseTo(96.56064, 5)
  })
  it('passes km/h through unchanged', () => {
    expect(speedToKmh(100, 'kmh')).toBe(100)
  })
  it('converts m/s to km/h', () => {
    expect(speedToKmh(10, 'ms')).toBeCloseTo(36, 5)
  })
})

describe('toIso', () => {
  it('converts epoch milliseconds', () => {
    expect(toIso(1781528400000, 'epoch_ms')).toBe('2026-06-15T13:00:00.000Z')
  })
  it('converts unix seconds', () => {
    expect(toIso(1781528400, 'unix_s')).toBe('2026-06-15T13:00:00.000Z')
  })
  it('normalizes an existing ISO string', () => {
    expect(toIso('2026-06-15T13:00:00.000Z', 'iso')).toBe(
      '2026-06-15T13:00:00.000Z',
    )
  })
})

describe('getByPath', () => {
  it('reads a single-level key', () => {
    expect(getByPath({ a: 1 }, 'a')).toBe(1)
  })
  it('reads a dotted path', () => {
    expect(getByPath({ gps: { lat: 43.7 } }, 'gps.lat')).toBe(43.7)
    expect(getByPath({ position: { y: 12, x: 34 } }, 'position.y')).toBe(12)
  })
  it('returns undefined for a missing path', () => {
    expect(getByPath({ gps: { lat: 43.7 } }, 'gps.lon')).toBeUndefined()
    expect(getByPath({ a: 1 }, 'a.b.c')).toBeUndefined()
  })
  it('returns undefined when the input is not an object', () => {
    expect(getByPath(null, 'a')).toBeUndefined()
    expect(getByPath(42, 'a')).toBeUndefined()
  })
})
