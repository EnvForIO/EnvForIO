/**
 * Which days a heatmap range covers and how they are laid out in a grid.
 * Weeks start on Monday. Display only: "today" comes from Rust.
 */
import { formatDate, parseDate } from '@/pages/tasks/dates'

export type HeatmapRange = 'week' | 'month' | 'year'

export interface HeatmapGrid {
  /** Columns of 7 days, Monday first; null pads days outside the range. */
  weeks: (string | null)[][]
  from: string
  to: string
}

const addDays = (date: Date, n: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)

/** Monday of the week containing `date`. */
const mondayOf = (date: Date) => addDays(date, -((date.getDay() + 6) % 7))

function columns(first: Date, last: Date): (string | null)[][] {
  const weeks: (string | null)[][] = []
  for (
    let monday = mondayOf(first);
    monday <= last;
    monday = addDays(monday, 7)
  ) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i)
        return day < first || day > last ? null : formatDate(day)
      })
    )
  }
  return weeks
}

export function heatmapGrid(range: HeatmapRange, today: string): HeatmapGrid {
  const now = parseDate(today)
  let first: Date
  let last: Date
  if (range === 'week') {
    first = mondayOf(now)
    last = addDays(first, 6)
  } else if (range === 'month') {
    first = new Date(now.getFullYear(), now.getMonth(), 1)
    last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else {
    // The last 53 weeks up to the end of this week, like a contribution graph.
    last = addDays(mondayOf(now), 6)
    first = addDays(last, -53 * 7 + 1)
  }
  return {
    weeks: columns(first, last),
    from: formatDate(first),
    to: formatDate(last),
  }
}
