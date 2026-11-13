import { describe, expect, it } from 'vitest'
import { dateLabel, formatDate, parseDate } from './dates'

describe('dates', () => {
  it('writes a day one way, with the year only when it is not this year', () => {
    const year = new Date().getFullYear()
    expect(dateLabel(`${year}-11-19`)).toMatch(/^\w{3}, Nov 19$/)
    expect(dateLabel(`${year + 1}-01-15`)).toMatch(
      new RegExp(`^\\w{3}, Jan 15, ${year + 1}$`)
    )
  })

  it('reads and writes YYYY-MM-DD in local time', () => {
    expect(formatDate(parseDate('2026-03-01'))).toBe('2026-03-01')
  })
})
