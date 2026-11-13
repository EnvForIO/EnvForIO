/**
 * Saying what a piece of planned work must be finished by, so a full day or
 * a project's health names its cause ("for phase Method, ending Sun, Nov 22").
 */
import type { TFunction } from 'i18next'
import type { Limit } from '@/lib/tauri-bindings'
import { dateLabel } from '@/pages/tasks/dates'

export const limitText = (t: TFunction, limit: Limit): string =>
  t(`plans.limit.${limit.kind}`, {
    name: limit.name,
    date: dateLabel(limit.date),
  })

/** More than this a day cannot be done, whatever time is set (as in Rust). */
export const DAY_MINUTES = 24 * 60

/** Short bar labels: "45m", "3h", "40h". */
export const shortMinutes = (minutes: number): string =>
  minutes < 60 ? `${minutes}m` : `${Math.round(minutes / 60)}h`
