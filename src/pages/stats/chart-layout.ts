/**
 * The arithmetic behind the stats charts, kept out of the components so it
 * can be tested: which bar columns get a label, where the heatmap's month
 * names go, and how dark a heatmap day is.
 */

/**
 * Which of `count` columns show their label. Up to 14 columns all do;
 * more get one every few so labels never overlap. The marked column
 * (today) always shows its label, and its neighbours give way to it.
 */
export function labelledColumns(count: number, marked: number): boolean[] {
  const every = count > 14 ? Math.ceil(count / 10) : 1
  return Array.from(
    { length: count },
    (_, i) =>
      i === marked ||
      (i % every === 0 &&
        (every === 1 || marked < 0 || Math.abs(i - marked) > 1))
  )
}

/**
 * The column where each month's name goes: the first week column whose
 * first day is in a new month. A name is dropped when the next month
 * starts fewer than `room` columns later, as both would not fit.
 */
export function monthStarts(
  weeks: (string | null)[][],
  room = 3
): { column: number; first: string }[] {
  const starts: { column: number; first: string }[] = []
  weeks.forEach((week, column) => {
    const first = week.find(d => d !== null)
    if (first && first.slice(0, 7) !== starts.at(-1)?.first.slice(0, 7))
      starts.push({ column, first })
  })
  return starts.filter(
    (s, i) => (starts[i + 1]?.column ?? Infinity) - s.column >= room
  )
}

/**
 * How dark a day with tasks is, 0 to 3, like a contribution graph:
 * 0 = none done, 1 = under half, 2 = half or more, 3 = all done.
 */
export function completionLevel(done: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0 || done <= 0) return 0
  const ratio = done / total
  if (ratio < 0.5) return 1
  if (ratio < 1) return 2
  return 3
}
