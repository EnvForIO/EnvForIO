/**
 * Grafana's dark dashboard colours (its default dark theme), used whatever
 * the app theme is, as Grafana panels look the same on any desk. Threshold
 * colours are Grafana's green / yellow / red.
 */
import type { Level } from '../format'

export const G = {
  page: '#111217',
  panel: '#181b1f',
  border: '#2c3235',
  grid: '#24292e',
  text: '#ccccdc',
  muted: '#8e8e9e',
  blue: '#5794f2',
  purple: '#b877d9',
  green: '#73bf69',
  orange: '#ff9830',
  yellow: '#fade2a',
  red: '#f2495c',
} as const

/** Grafana's chart colours for the shared TimeSeries. */
export const CHART = {
  grid: G.grid,
  muted: G.muted,
  text: G.text,
  fill: 0.1,
}

export const LEVEL: Record<Level, string> = {
  ok: G.green,
  warn: G.yellow,
  bad: G.red,
}
