import { describe, expect, it } from 'vitest'
import type { ProjectTemplate } from '@/lib/tauri-bindings'
import { defaultPhases, localDay } from './phases'

const conference: ProjectTemplate = {
  id: 'conference',
  phases: [
    { name: 'Experiments', daysBefore: 21 },
    { name: 'Writing', daysBefore: 7 },
    { name: 'Revise and submit', daysBefore: 0 },
  ],
}

describe('default phases', () => {
  it('dates phases back from the deadline, like the Rust side', () => {
    const phases = defaultPhases(conference, {
      startDate: '2026-11-20',
      deadline: '2026-12-20',
    })
    expect(phases.map(p => [p.name, p.endDate])).toEqual([
      ['Experiments', '2026-11-29'],
      ['Writing', '2026-12-13'],
      ['Revise and submit', '2026-12-20'],
    ])
    expect(phases.every(p => p.budget === null)).toBe(true)
  })

  it('leaves out dates before the start, or without a deadline', () => {
    const soon = defaultPhases(conference, {
      startDate: '2026-12-01',
      deadline: '2026-12-10',
    })
    expect(soon.map(p => p.endDate)).toEqual([null, '2026-12-03', '2026-12-10'])
    const open = defaultPhases(conference, { startDate: null, deadline: null })
    expect(open.map(p => p.endDate)).toEqual([null, null, null])
    expect(
      defaultPhases(undefined, { startDate: null, deadline: null })
    ).toEqual([])
  })

  it('crosses month ends', () => {
    const [first] = defaultPhases(conference, {
      startDate: null,
      deadline: '2027-01-05',
    })
    expect(first?.endDate).toBe('2026-12-15')
  })

  it('gives a moment its local day', () => {
    expect(localDay(new Date(2026, 4, 15, 23, 59).getTime())).toBe('2026-05-15')
  })
})
