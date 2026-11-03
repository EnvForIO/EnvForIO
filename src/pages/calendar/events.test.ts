import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/lib/tauri-bindings'
import { dayEnd, dayStart, eventsOn, startLabel } from './events'

const event = (
  startMs: number,
  endMs: number,
  allDay = false
): CalendarEvent => ({
  id: startMs,
  calendarId: 1,
  color: '#0071e3',
  title: 'x',
  location: '',
  startMs,
  endMs,
  allDay,
})

describe('calendar events', () => {
  const nov20 = dayStart('2026-11-20')
  const hour = 3_600_000

  it('places an event on every local day it touches', () => {
    const meeting = event(nov20 + 9 * hour, nov20 + 10 * hour)
    const overnight = event(nov20 + 22 * hour, nov20 + 26 * hour)
    const holiday = event(nov20, dayEnd('2026-11-20'), true)
    const all = [meeting, overnight, holiday]
    expect(eventsOn(all, '2026-11-20')).toEqual(all)
    expect(eventsOn(all, '2026-11-21')).toEqual([overnight])
    expect(eventsOn(all, '2026-11-19')).toEqual([])
  })

  it('shows the start time only on the first day of a timed event', () => {
    const overnight = event(nov20 + 22 * hour, nov20 + 26 * hour)
    expect(startLabel(overnight, '2026-11-20')).toBe('22:00')
    expect(startLabel(overnight, '2026-11-21')).toBe('')
    expect(
      startLabel(event(nov20, nov20 + 24 * hour, true), '2026-11-20')
    ).toBe('')
  })
})
