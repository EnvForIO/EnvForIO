/**
 * How monitor readings read: sizes in 1024 steps labelled KB/MB/GB as
 * Windows' Task Manager does, rates per second, whole percentages.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function bytes(n: number): string {
  let value = n
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${UNITS[unit]}`
}

export const rate = (n: number) => `${bytes(n)}/s`

export const percent = (n: number) => `${Math.round(n)}%`

export const ghz = (mhz: number) => `${(mhz / 1000).toFixed(2)} GHz`

/** used of total as a percentage; 0 when the total is unknown. */
export const share = (used: number, total: number) =>
  total > 0 ? (used / total) * 100 : 0

/**
 * Colour follows the value, as Grafana's thresholds do: a reading is
 * green while low, yellow from the warning threshold, red from the
 * critical one (user decision 2026-11-19). Grafana's classic palette.
 */
export type Level = 'ok' | 'warn' | 'bad'
export const LEVEL_COLOR: Record<Level, string> = {
  ok: '#56a64b',
  warn: '#e0b400',
  bad: '#e02f44',
}

/** A percentage: under 70 fine, under 90 warn, else bad. */
export const level = (pct: number): Level =>
  pct < 70 ? 'ok' : pct < 90 ? 'warn' : 'bad'

/** A GPU temperature in °C: under 70 fine, under 85 warn, else bad. */
export const tempLevel = (celsius: number): Level =>
  celsius < 70 ? 'ok' : celsius < 85 ? 'warn' : 'bad'

export const pctColor = (pct: number) => LEVEL_COLOR[level(pct)]

/** Readings with no "too high" (disk speed): neutral, never a warning colour. */
export const NEUTRAL = { read: '#3274d9', written: '#a352cc' } as const
