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

/** Colours per reading, the same in every look and theme. */
export const COLOR = {
  cpu: '#3b82f6',
  memory: '#a855f7',
  gpu: '#22c55e',
  read: '#eab308',
  written: '#ef4444',
} as const

/** How worrying a percentage is: under 70 fine, under 90 warn, else bad. */
export type Level = 'ok' | 'warn' | 'bad'
export const level = (pct: number): Level =>
  pct < 70 ? 'ok' : pct < 90 ? 'warn' : 'bad'

/** A round axis top at or above `v`: 1, 2 or 5 times a power of ten. */
export function niceMax(v: number): number {
  if (v <= 0) return 1
  const step = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 5, 10]) if (m * step >= v) return m * step
  return 10 * step
}

const SPARK = '▁▂▃▄▅▆▇█'

/** Values as block characters, 0..max mapped onto ▁..█. */
export const sparkText = (values: number[], max = 100) =>
  values
    .map(v => SPARK[Math.min(7, Math.max(0, Math.round((v / max) * 7)))])
    .join('')

/** How many of `width` cells a percentage fills (at least one above 0). */
export const cells = (pct: number, width: number) =>
  pct <= 0 ? 0 : Math.min(width, Math.max(1, Math.round((pct / 100) * width)))

/** The last `n` values of one reading, padded with zeros in front. */
export const lastN = (values: number[], n: number) =>
  values.length >= n
    ? values.slice(-n)
    : [...Array<number>(n - values.length).fill(0), ...values]
