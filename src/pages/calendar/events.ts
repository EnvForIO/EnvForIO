/**
 * External calendar events on the calendar grid: which local days an
 * event covers, and how its time reads. Event times are Unix ms; days are
 * 'YYYY-MM-DD' in local time, as the grid uses.
 */
import type { CalendarEvent } from '@/lib/tauri-bindings'
import { parseDate } from '@/pages/tasks/dates'

/** Local midnight of a date, in Unix ms. */
export const dayStart = (date: string) => parseDate(date).getTime()

/** Local midnight of the day after a date (handles daylight-saving days). */
export function dayEnd(date: string): number {
  const next = parseDate(date)
  next.setDate(next.getDate() + 1)
  return next.getTime()
}

/** Events that touch a local day: all-day ones first, then by start. */
export function eventsOn(events: CalendarEvent[], date: string) {
  const from = dayStart(date)
  const to = dayEnd(date)
  return events.filter(
    e => e.startMs < to && Math.max(e.endMs, e.startMs + 1) > from
  )
}

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

/** "09:00" on its first day, "" for all-day events and later days. */
export const startLabel = (e: CalendarEvent, date: string) =>
  e.allDay || e.startMs < dayStart(date) ? '' : clock(e.startMs)

/** "09:00–10:30" for the tooltip; "" for all-day events. */
export const spanLabel = (e: CalendarEvent) =>
  e.allDay ? '' : `${clock(e.startMs)}–${clock(e.endMs)}`
