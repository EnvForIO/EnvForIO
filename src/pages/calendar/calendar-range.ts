/**
 * Which days the month and week views show. Weeks start on Monday and the
 * month view always shows whole weeks (days of the neighbouring months too).
 */
import { formatDate, parseDate } from '@/pages/tasks/dates'

export type CalendarMode = 'month' | 'week'

export interface CalendarRange {
  weeks: string[][] // rows of 7 'YYYY-MM-DD', Monday first
  from: string
  to: string
}

const addDays = (date: Date, n: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
const mondayOf = (date: Date) => addDays(date, -((date.getDay() + 6) % 7))

export function calendarRange(
  mode: CalendarMode,
  anchor: string
): CalendarRange {
  const day = parseDate(anchor)
  let first: Date
  let last: Date
  if (mode === 'week') {
    first = mondayOf(day)
    last = addDays(first, 6)
  } else {
    first = mondayOf(new Date(day.getFullYear(), day.getMonth(), 1))
    last = addDays(
      mondayOf(new Date(day.getFullYear(), day.getMonth() + 1, 0)),
      6
    )
  }
  const weeks: string[][] = []
  for (let monday = first; monday <= last; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => formatDate(addDays(monday, i)))
    )
  }
  return { weeks, from: formatDate(first), to: formatDate(last) }
}

/** The anchor one month or one week earlier (-1) or later (+1). */
export function shiftAnchor(
  mode: CalendarMode,
  anchor: string,
  step: -1 | 1
): string {
  const day = parseDate(anchor)
  return formatDate(
    mode === 'week'
      ? addDays(day, 7 * step)
      : new Date(day.getFullYear(), day.getMonth() + step, 1)
  )
}
