import { describe, expect, it } from 'vitest'
import { formatMinutes } from './duration'

describe('formatMinutes', () => {
  it('uses the shortest form', () => {
    expect(formatMinutes(45)).toBe('45m')
    expect(formatMinutes(120)).toBe('2h')
    expect(formatMinutes(90)).toBe('1h 30m')
  })
})
