import { describe, expect, it } from 'vitest'
import type { DayMarks } from '@/lib/tauri-bindings'
import { busy } from './busy'

const day = (planned: number, available: number | null): DayMarks => ({
  date: '2026-11-20',
  plannedMinutes: planned,
  availableMinutes: available,
  items: [],
})

describe('busy level', () => {
  it('compares scheduled time with available time', () => {
    expect(busy(day(0, 240))).toBe('free')
    expect(busy(day(60, 240))).toBe('light')
    expect(busy(day(150, 240))).toBe('busy')
    expect(busy(day(230, 240))).toBe('full')
    expect(busy(day(300, 240))).toBe('over')
  })

  it('treats planned work on a rest day as over', () => {
    expect(busy(day(30, 0))).toBe('over')
    expect(busy(day(30, null))).toBe('over')
    expect(busy(day(0, 0))).toBe('free')
  })
})
