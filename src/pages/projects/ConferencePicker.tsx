/**
 * Picks the conference round a paper is for, from ccfddl's list: type a
 * name, then choose one of its open rounds. The list is downloaded here
 * when it is missing or a week old; there is no separate Conferences page.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFreshConferences } from '@/api/conferences'
import { errorText } from '@/api/papers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNow } from '@/hooks/useNow'
import type { Conference } from '@/lib/tauri-bindings'
import {
  URGENCY_COLOR,
  countdown,
  upcoming,
  urgency,
  when,
  type Round,
} from '@/pages/conferences/deadline'

const SHOWN = 5 // conferences listed at once; typing narrows them down

export interface Picked {
  conference: Conference
  round: Round
}

export function ConferencePicker({
  picked,
  onPick,
}: {
  picked: Picked | null
  onPick: (picked: Picked | null) => void
}) {
  const { t } = useTranslation()
  const now = useNow()
  const { list, refresh } = useFreshConferences(picked === null)
  const [query, setQuery] = useState('')

  if (picked) {
    const { conference, round } = picked
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">
            {conference.title} {round.edition.year}
          </span>
          {round.stage.comment && (
            <span className="text-muted-foreground">
              {' '}
              {round.stage.comment}
            </span>
          )}
        </span>
        <span
          className="shrink-0 text-xs tabular-nums"
          style={{ color: URGENCY_COLOR[urgency(round.at - now)] }}
        >
          {countdown(round.at - now)}
        </span>
        <Button size="sm" variant="ghost" onClick={() => onPick(null)}>
          {t('projects.conferenceChange')}
        </Button>
      </div>
    )
  }

  const name = query.trim().toLowerCase()
  const matches = (list.data?.conferences ?? [])
    .map(c => ({ c, rounds: upcoming(c, now) }))
    .filter(
      ({ c, rounds }) =>
        rounds.length > 0 &&
        (name === '' ||
          c.title.toLowerCase().includes(name) ||
          c.key.toLowerCase().includes(name) ||
          c.description.toLowerCase().includes(name))
    )
    // Exact title first, then the soonest deadline.
    .sort(
      (a, b) =>
        Number(b.c.title.toLowerCase() === name) -
          Number(a.c.title.toLowerCase() === name) ||
        (a.rounds[0]?.at ?? 0) - (b.rounds[0]?.at ?? 0)
    )
    .slice(0, SHOWN)

  return (
    <div className="grid gap-1.5">
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('projects.conferenceSearch')}
        className="h-8"
      />
      {refresh.isPending && (
        <p className="text-xs text-muted-foreground">
          {t('projects.conferenceDownloading')}
        </p>
      )}
      {refresh.isError && (
        <p className="flex items-center gap-2 text-xs text-destructive">
          {t('projects.conferenceFailed', {
            error: errorText(refresh.error),
          })}
          <Button size="sm" variant="ghost" onClick={() => refresh.mutate()}>
            {t('projects.conferenceRetry')}
          </Button>
        </p>
      )}
      {/* Rows never grow wider than the dialog: a long description is
          clipped on its own line instead of scrolling the list sideways. */}
      <div className="grid max-h-56 grid-cols-1 gap-1 overflow-x-hidden overflow-y-auto">
        {matches.map(({ c, rounds }) => (
          <div
            key={c.key}
            className="min-w-0 rounded-md border px-2 py-1.5 text-sm"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{c.title}</span>
              {c.ccf !== '' && c.ccf !== 'N' && (
                <span className="text-xs text-muted-foreground">
                  CCF {c.ccf}
                </span>
              )}
            </div>
            {c.description && (
              <p
                className="truncate text-xs text-muted-foreground"
                title={c.description}
              >
                {c.description}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {rounds.map(round => (
                <Button
                  key={`${round.edition.id}-${round.stageIndex}`}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  title={t('conferences.localTime', {
                    zone: round.edition.timezone,
                  })}
                  onClick={() => onPick({ conference: c, round })}
                >
                  {round.edition.year}
                  {round.stage.comment && ` ${round.stage.comment}`}
                  {', '}
                  {when(round.at, now)}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {list.isSuccess && !refresh.isPending && matches.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t('projects.conferenceNone')}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('conferences.source')}</p>
    </div>
  )
}
