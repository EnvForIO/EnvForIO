import { describe, expect, it } from 'vitest'
import type { Conference, Edition } from '@/lib/tauri-bindings'
import { countdown, findVenue, nextRound, upcoming, urgency } from './deadline'

const DAY = 86_400_000

const edition = (year: number, deadlines: (number | null)[]): Edition => ({
  id: `c${year}`,
  year,
  link: '',
  date: '',
  place: '',
  timezone: 'AoE',
  stages: deadlines.map(d => ({
    abstractAt: null,
    deadlineAt: d,
    comment: '',
  })),
  projectId: null,
})

const conference = (editions: Edition[]): Conference => ({
  key: 'AI/x',
  title: 'X',
  description: '',
  area: 'AI',
  ccf: 'A',
  core: '',
  editions,
})

describe('conference deadlines', () => {
  it('lists open rounds soonest first and skips past or unannounced ones', () => {
    const now = 100 * DAY
    const c = conference([
      edition(2026, [50 * DAY, 130 * DAY]),
      edition(2027, [120 * DAY, null]),
    ])
    expect(upcoming(c, now).map(r => [r.edition.year, r.stageIndex])).toEqual([
      [2027, 0],
      [2026, 1],
    ])
    expect(nextRound(c, now)?.at).toBe(120 * DAY)
    expect(nextRound(c, 200 * DAY)).toBeNull()
  })

  it('counts down in two units and grades urgency', () => {
    expect(countdown(12 * DAY + 4 * 3_600_000 + 59_000)).toBe('12d 4h')
    expect(countdown(5 * 3_600_000 + 20 * 60_000)).toBe('5h 20m')
    expect(countdown(45 * 60_000)).toBe('45m')
    expect(countdown(10_000)).toBe('<1m')
    expect([urgency(DAY), urgency(10 * DAY), urgency(60 * DAY)]).toEqual([
      'urgent',
      'close',
      'calm',
    ])
  })

  it('finds an idea venue by title or key, in any case', () => {
    const c = { ...conference([]), key: 'MX/miccai', title: 'MICCAI' }
    expect(findVenue([c], ' miccai ')).toBe(c)
    expect(findVenue([c], 'MX/MICCAI')).toBe(c)
    expect(findVenue([c], 'PLOS ONE')).toBeNull()
    expect(findVenue([c], '')).toBeNull()
  })
})
