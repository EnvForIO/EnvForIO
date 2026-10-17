import { describe, expect, it } from 'vitest'
import { calendarRange, shiftAnchor } from './calendar-range'

describe('calendarRange', () => {
  it('month view shows whole Monday-first weeks', () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const r = calendarRange('month', '2026-11-19')
    expect(r.from).toBe('2026-10-26')
    expect(r.to).toBe('2026-12-06')
    expect(r.weeks).toHaveLength(6)
    expect(r.weeks.every(week => week.length === 7)).toBe(true)
  })

  it('week view is the week around the anchor', () => {
    const r = calendarRange('week', '2026-11-19')
    expect(r.weeks).toEqual([
      [
        '2026-11-16',
        '2026-11-17',
        '2026-11-18',
        '2026-11-19',
        '2026-11-20',
        '2026-11-21',
        '2026-11-22',
      ],
    ])
  })

  it('shifting moves by a month or a week', () => {
    expect(shiftAnchor('month', '2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftAnchor('month', '2026-03-31', -1)).toBe('2026-02-01')
    expect(shiftAnchor('week', '2026-11-19', -1)).toBe('2026-11-12')
  })
})
