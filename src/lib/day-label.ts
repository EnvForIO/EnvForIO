/**
 * The one way EnvForIO writes a day: 'Wed, Nov 19', with the year when it is
 * not this year's ('Fri, Jan 15, 2027'). Task rows, the details pane's date
 * pickers and the conference banner all use it, so the app has one date
 * format, not several.
 */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}
