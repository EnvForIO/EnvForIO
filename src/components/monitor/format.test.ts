import { describe, expect, it } from 'vitest'
import { bytes, ghz, level, niceMax, percent, rate, share } from './format'

describe('monitor format', () => {
  it('sizes step by 1024 with one decimal below 100', () => {
    expect(bytes(0)).toBe('0 B')
    expect(bytes(1023)).toBe('1023 B')
    expect(bytes(1536)).toBe('1.5 KB')
    expect(bytes(16 * 1024 ** 3)).toBe('16.0 GB')
    expect(bytes(512 * 1024 ** 3)).toBe('512 GB')
    expect(rate(2 * 1024 ** 2)).toBe('2.0 MB/s')
  })

  it('percentages, clocks and shares', () => {
    expect(percent(12.6)).toBe('13%')
    expect(ghz(3600)).toBe('3.60 GHz')
    expect(share(1, 4)).toBe(25)
    expect(share(1, 0)).toBe(0)
  })

  it('levels and axis tops', () => {
    expect([level(10), level(75), level(95)]).toEqual(['ok', 'warn', 'bad'])
    expect([niceMax(0), niceMax(7), niceMax(130), niceMax(4000)]).toEqual([
      1, 10, 200, 5000,
    ])
  })
})
