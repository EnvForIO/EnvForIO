/**
 * Turning the database's 'YYYY-MM-DD' strings into what the task views show.
 * Display only: which day "today" is comes from Rust (`useToday`).
 */

/** 'YYYY-MM-DD' -> a local Date at midnight (not UTC, which would shift the day). */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** A local Date -> 'YYYY-MM-DD'. */
export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 'Wed, Nov 19' style label for a due date or the My Day header. */
export function dateLabel(date: string): string {
  return parseDate(date).toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Dates compare correctly as strings because they are zero-padded ISO dates. */
export const isOverdue = (due: string | null, today: string | undefined) =>
  due !== null && today !== undefined && due < today
