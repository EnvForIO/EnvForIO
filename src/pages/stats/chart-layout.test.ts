import { describe, expect, it } from 'vitest'
import { heatmapGrid } from '@/pages/duo/heatmap-range'
import { completionLevel, labelledColumns, monthStarts } from './chart-layout'

const shown = (flags: boolean[]) => flags.flatMap((on, i) => (on ? [i] : []))

describe('labelledColumns', () => {
  it('labels every column of a week or a year', () => {
    expect(shown(labelledColumns(7, -1))).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(shown(labelledColumns(12, 10))).toHaveLength(12)
  })

  it('labels every third day of a month', () => {
    expect(shown(labelledColumns(30, -1))).toEqual([
      0, 3, 6, 9, 12, 15, 18, 21, 24, 27,
    ])
  })

  it('always labels today and drops the labels next to it', () => {
    // Today is the 21st (index 20): the 22nd (index 21) gives way.
    const labels = shown(labelledColumns(30, 20))
    expect(labels).toContain(20)
    expect(labels).not.toContain(21)
    expect(labels).toContain(18)
  })
})

describe('monthStarts', () => {
  // 2026-11-19 is a Thursday; the year grid runs 2025-11-24 to 2026-11-22.
  const weeks = heatmapGrid('year', '2026-11-19').weeks

  it('puts each month at its first week column', () => {
    const starts = monthStarts(weeks)
    // November 2025 has only two columns before December, so it is dropped.
    expect(starts[0]).toEqual({ column: 2, first: '2025-12-01' })
    expect(starts.map(s => s.first.slice(0, 7))).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ])
  })

  it('drops a month whose next one starts too soon to fit', () => {
    const cramped = [
      ['2026-01-26'],
      ['2026-02-02'],
      ['2026-02-09'],
      ['2026-02-16'],
      ['2026-02-23'],
    ]
    expect(monthStarts(cramped).map(s => s.first)).toEqual(['2026-02-02'])
  })

  it('skips columns with no days', () => {
    expect(
      monthStarts([
        [null, null],
        [null, '2026-03-03'],
      ])
    ).toEqual([{ column: 1, first: '2026-03-03' }])
  })
})

describe('completionLevel', () => {
  it('steps from none to all done', () => {
    expect(completionLevel(0, 4)).toBe(0)
    expect(completionLevel(1, 4)).toBe(1)
    expect(completionLevel(2, 4)).toBe(2)
    expect(completionLevel(3, 4)).toBe(2)
    expect(completionLevel(4, 4)).toBe(3)
  })

  it('treats a day with no tasks as level 0', () => {
    expect(completionLevel(0, 0)).toBe(0)
  })
})
