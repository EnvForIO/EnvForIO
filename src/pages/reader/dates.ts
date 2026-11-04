/** Dates of feed items (Unix ms), in local time. */

/** "Nov 18" this year, "Nov 18, 2025" otherwise. */
export function shortDate(ms: number, now = Date.now()): string {
  const date = new Date(ms)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

/** "Wednesday, November 18, 2026". */
export const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
