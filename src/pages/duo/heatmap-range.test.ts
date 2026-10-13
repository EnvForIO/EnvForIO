import { describe, expect, it } from 'vitest'
import { heatmapGrid } from './heatmap-range'

// 2026-11-19 is a Thursday.
const TODAY = '2026-11-19'

describe('heatmapGrid', () => {
  it('week is Monday to Sunday around today', () => {
    const grid = heatmapGrid('week', TODAY)
    expect(grid.from).toBe('2026-11-16')
    expect(grid.to).toBe('2026-11-22')
    expect(grid.weeks).toHaveLength(1)
    expect(grid.weeks[0]?.[3]).toBe(TODAY)
  })

  it('month covers the calendar month, padded to whole weeks', () => {
    const grid = heatmapGrid('month', TODAY)
    expect(grid.from).toBe('2026-11-01')
    expect(grid.to).toBe('2026-11-30')
    // Nov 1 2026 is a Sunday, so the first column has six empty days.
    expect(grid.weeks[0]).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      '2026-11-01',
    ])
    expect(grid.weeks.flat().filter(Boolean)).toHaveLength(30)
  })

  it('year is 53 whole weeks ending this Sunday', () => {
    const grid = heatmapGrid('year', TODAY)
    expect(grid.weeks).toHaveLength(53)
    expect(grid.to).toBe('2026-11-22')
    expect(grid.weeks.flat().every(Boolean)).toBe(true)
  })
})
