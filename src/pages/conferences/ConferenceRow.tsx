/**
 * One conference in the search list: star, name, CCF rank, area and
 * description, then its next paper deadline (local date) and time left.
 */
import { useTranslation } from 'react-i18next'
import type { Conference } from '@/lib/tauri-bindings'
import { URGENCY_COLOR, countdown, nextRound, urgency } from './deadline'
import { FollowStar, RankBadge } from './parts'

export function ConferenceRow({
  conference: c,
  now,
}: {
  conference: Conference
  now: number
}) {
  const { t } = useTranslation()
  const round = nextRound(c, now)
  return (
    <div className="flex items-center gap-3 border-b px-3 py-1.5 text-sm last:border-0">
      <FollowStar conference={c} />
      <span className="w-28 shrink-0 truncate font-medium">{c.title}</span>
      <span className="w-14 shrink-0">
        <RankBadge ccf={c.ccf} />
      </span>
      <span
        className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
        title={c.description}
      >
        {c.description}
      </span>
      {round ? (
        <span className="shrink-0 text-xs tabular-nums">
          {new Date(round.at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
          <span
            className="ms-2 inline-block w-14 text-end"
            style={{ color: URGENCY_COLOR[urgency(round.at - now)] }}
          >
            {countdown(round.at - now)}
          </span>
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">
          {t('conferences.tbd')}
        </span>
      )}
    </div>
  )
}
