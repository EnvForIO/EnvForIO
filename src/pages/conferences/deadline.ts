/**
 * Facts about a conference's deadlines, worked out at a moment `now`
 * (Unix ms): the rounds still open, the next one, how long is left and
 * how urgent that is. Times arrive in Unix ms and are shown in local time.
 * Used by the new-project dialog's conference picker, a conference
 * project's page and an idea's target venue (there is no Conferences page
 * any more).
 */
import type { Conference, Edition, Stage } from '@/lib/tauri-bindings'

export interface Round {
  edition: Edition
  stageIndex: number
  stage: Stage
  /** The paper deadline. */
  at: number
}

/** Rounds whose paper deadline is still ahead, soonest first. */
export function upcoming(c: Conference, now: number): Round[] {
  return c.editions
    .flatMap(edition =>
      edition.stages.flatMap((stage, stageIndex) =>
        stage.deadlineAt !== null && stage.deadlineAt > now
          ? [{ edition, stageIndex, stage, at: stage.deadlineAt }]
          : []
      )
    )
    .sort((a, b) => a.at - b.at)
}

export const nextRound = (c: Conference, now: number): Round | null =>
  upcoming(c, now)[0] ?? null

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Time left in two units at most: "12d 4h", "5h 20m", "45m". */
export function countdown(ms: number): string {
  if (ms < MINUTE) return '<1m'
  const d = Math.floor(ms / DAY)
  const h = Math.floor((ms % DAY) / HOUR)
  const m = Math.floor((ms % HOUR) / MINUTE)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/** Under a week is urgent, under a month is close, anything later is calm. */
export type Urgency = 'urgent' | 'close' | 'calm'
export const urgency = (ms: number): Urgency =>
  ms < 7 * DAY ? 'urgent' : ms < 30 * DAY ? 'close' : 'calm'

export const URGENCY_COLOR: Record<Urgency, string> = {
  urgent: '#ff3b30',
  close: '#e6a700',
  calm: 'var(--muted-foreground)',
}

/** "Thu, May 15, 19:59" in local time, with the year when it is not this
 * year's; the same day format as everywhere else (`dayLabel`). */
export function when(ms: number, now: number): string {
  const date = new Date(ms)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * The conference an idea's venue names: its title or ccfddl key, any case
 * ("MICCAI", "miccai", "MX/miccai"); null for a journal or an unknown name.
 */
export function findVenue(
  conferences: Conference[],
  venue: string
): Conference | null {
  const name = venue.trim().toLowerCase()
  if (name === '') return null
  return (
    conferences.find(
      c =>
        c.title.toLowerCase() === name ||
        c.key.toLowerCase() === name ||
        c.key.toLowerCase().split('/').at(-1) === name
    ) ?? null
  )
}
