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
