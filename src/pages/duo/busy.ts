/**
 * How full a day is in the Todo Duo card's Month tab: the time of the tasks
 * scheduled on it against the time available. Shaded like the Monitor's
 * thresholds: calm blue while there is room, yellow when nearly full, red
 * when over.
 */
import type { DayMarks } from '@/lib/tauri-bindings'

export type Busy = 'free' | 'light' | 'busy' | 'full' | 'over'

export function busy(day: DayMarks): Busy {
  if (day.plannedMinutes === 0) return 'free'
  const room = day.availableMinutes ?? 0
  if (room <= 0) return 'over' // work planned on a rest day
  const share = day.plannedMinutes / room
  if (share > 1) return 'over'
  if (share >= 0.9) return 'full'
  if (share >= 0.5) return 'busy'
  return 'light'
}

export const BUSY_COLOR: Record<Busy, string | undefined> = {
  free: undefined,
  light: 'color-mix(in oklab, #0071e3 14%, transparent)',
  busy: 'color-mix(in oklab, #0071e3 30%, transparent)',
  full: 'color-mix(in oklab, #ffcc00 45%, transparent)',
  over: 'color-mix(in oklab, #ff3b30 35%, transparent)',
}

/** Kinds of items that are deadlines (dots on the day). */
export const isDeadline = (kind: string) => kind !== 'Scheduled'
