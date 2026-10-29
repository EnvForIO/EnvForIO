/**
 * Grafana's dashboard colours. The neutrals (canvas, panel, border, grid,
 * text) are CSS variables set in App.css under `.grafana`: Grafana's light
 * theme, and its dark theme when the app is dark (user decision
 * 2026-11-19: light). Series and threshold colours are Grafana's classic
 * palette, which reads on both.
 */
import type { Level } from '../format'

export const G = {
  page: 'var(--g-page)',
  panel: 'var(--g-panel)',
  border: 'var(--g-border)',
  grid: 'var(--g-grid)',
  text: 'var(--g-text)',
  muted: 'var(--g-muted)',
  blue: '#3274d9',
  purple: '#a352cc',
  green: '#56a64b',
  orange: '#ff780a',
  yellow: '#e0b400',
  red: '#e02f44',
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
