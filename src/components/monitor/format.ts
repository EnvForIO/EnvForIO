/**
 * How monitor readings read: sizes in 1024 steps labelled KB/MB/GB as
 * Windows' Task Manager does, rates per second, whole percentages, and the
 * colours that say how a value is doing.
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

/** How long a program has run, two units at most: 45s, 12m, 3h 05m, 2d 4h. */
export function duration(secs: number): string {
  const m = Math.floor(secs / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${String(m % 60).padStart(2, '0')}m`
  if (m > 0) return `${m}m`
  return `${secs}s`
}

/** used of total as a percentage; 0 when the total is unknown. */
export const share = (used: number, total: number) =>
  total > 0 ? (used / total) * 100 : 0

/**
 * Colour follows the value, as Grafana's thresholds do: green while low,
 * yellow from the warning threshold, red from the critical one (user
 * decision 2026-11-19). Apple's system colours, with a darker yellow so
 * it reads as text on white.
 */
export type Level = 'ok' | 'warn' | 'bad'
export const LEVEL_COLOR: Record<Level, string> = {
  ok: '#34c759',
  warn: '#e6a700',
  bad: '#ff3b30',
}

/** A percentage: under 70 fine, under 90 warn, else bad. */
export const level = (pct: number): Level =>
  pct < 70 ? 'ok' : pct < 90 ? 'warn' : 'bad'

/** A GPU temperature in °C: under 70 fine, under 85 warn, else bad. */
export const tempLevel = (celsius: number): Level =>
  celsius < 70 ? 'ok' : celsius < 85 ? 'warn' : 'bad'

export const pctColor = (pct: number) => LEVEL_COLOR[level(pct)]

/** The heatmap scale (DCGM style): pale green at 0, green, yellow, red at 100. */
const HEAT: [number, [number, number, number]][] = [
  [0, [232, 246, 236]],
  [50, [52, 199, 89]],
  [75, [255, 204, 0]],
  [100, [255, 59, 48]],
]

export function heat(pct: number): string {
  const p = Math.min(100, Math.max(0, pct))
  let previous: (typeof HEAT)[number] | undefined
  for (const stop of HEAT) {
    const [to, b] = stop
    if (previous && p <= to) {
      const [from, a] = previous
      const f = (p - from) / (to - from)
      const mix = a.map((c, j) => Math.round(c + ((b[j] ?? c) - c) * f))
      return `rgb(${mix.join(', ')})`
    }
    previous = stop
  }
  return p <= 0 ? 'rgb(232, 246, 236)' : 'rgb(255, 59, 48)'
}
