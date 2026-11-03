/**
 * An event of a subscribed calendar on a day: a bar in the calendar's
 * colour, the start time on its first day, the title. Read-only; the
 * tooltip has the time span and the place.
 */
import type { CalendarEvent } from '@/lib/tauri-bindings'
import { spanLabel, startLabel } from './events'

export function EventChip({
  event: e,
  date,
}: {
  event: CalendarEvent
  date: string
}) {
  const start = startLabel(e, date)
  const tip = [e.title, spanLabel(e), e.location].filter(Boolean).join('\n')
  return (
    <div
      title={tip}
      className="flex min-w-0 shrink-0 items-center gap-1 rounded-sm px-1 py-px text-[11px]"
      style={{
        background: e.allDay ? `${e.color}26` : undefined,
        borderInlineStart: `2px solid ${e.color}`,
      }}
    >
      {start && (
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {start}
        </span>
      )}
      <span className="truncate">{e.title}</span>
    </div>
  )
}
