import { describe, expect, it } from 'vitest'
import {
  LEVEL_COLOR,
  bytes,
  duration,
  ghz,
  level,
  pctColor,
  percent,
  rate,
  share,
  tempLevel,
} from './format'

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

  it('run times keep two units at most', () => {
    expect(duration(45)).toBe('45s')
    expect(duration(12 * 60 + 30)).toBe('12m')
    expect(duration(3 * 3600 + 5 * 60)).toBe('3h 05m')
    expect(duration(2 * 86400 + 4 * 3600 + 59)).toBe('2d 4h')
  })

  it('colour follows the value: green low, yellow from 70, red from 90', () => {
    expect([level(0), level(69.9), level(70), level(89.9), level(90)]).toEqual([
      'ok',
      'ok',
      'warn',
      'warn',
      'bad',
    ])
    expect([tempLevel(65), tempLevel(70), tempLevel(85)]).toEqual([
      'ok',
      'warn',
      'bad',
    ])
    expect(pctColor(95)).toBe(LEVEL_COLOR.bad)
  })
})
