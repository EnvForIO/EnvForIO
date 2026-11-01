/**
 * Conference deadlines (phase 4 step 3), from ccfddl's open list: the
 * conferences the user follows as cards, soonest deadline first, then a
 * search over all of them by name, area and CCF rank to star more. The
 * list is downloaded only when the user presses refresh.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2Icon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useConferences, useRefreshConferences } from '@/api/conferences'
import { errorText } from '@/api/papers'
import { FilterChip } from '@/components/FilterChip'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Conference } from '@/lib/tauri-bindings'
import { DeadlineCard } from './DeadlineCard'
import { ConferenceRow } from './ConferenceRow'
import { AREAS, nextRound } from './deadline'

/** How many search results to draw at once. */
const SHOWN = 100
const RANKS = ['A', 'B', 'C'] as const

/** The time, again each minute, for the countdowns. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Soonest open deadline first; conferences with none after, by title. */
function bySoonest(now: number) {
  return (a: Conference, b: Conference) => {
    const x = nextRound(a, now)?.at ?? Infinity
    const y = nextRound(b, now)?.at ?? Infinity
    return x === y ? a.title.localeCompare(b.title) : x - y
  }
}

export function ConferencesPage() {
  const { t } = useTranslation()
  const now = useNow()
  const { data } = useConferences()
  const refresh = useRefreshConferences()
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('')
  const [rank, setRank] = useState<string | null>(null)

  const download = () =>
    refresh.mutate(undefined, { onError: e => toast.error(errorText(e)) })

  const conferences = data?.conferences ?? []
  const followed = conferences.filter(c => c.followed).sort(bySoonest(now))
  const q = search.trim().toLowerCase()
  const found = conferences
    .filter(
      c =>
        (q === '' ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)) &&
        (area === '' || c.area === area) &&
        (rank === null || c.ccf === rank)
    )
    .sort(bySoonest(now))

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-5 py-4">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{t('conferences.title')}</h1>
        <div className="ms-auto flex items-center gap-2 text-xs text-muted-foreground">
          {data?.fetchedAt && (
            <span>
              {t('conferences.updated', {
                time: new Date(data.fetchedAt).toLocaleString(),
              })}
            </span>
          )}
          {data?.fetchedAt && (
            <Button
              size="sm"
              variant="outline"
              disabled={refresh.isPending}
              onClick={download}
            >
              {refresh.isPending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-3.5" />
              )}
              {t('conferences.refresh')}
            </Button>
          )}
        </div>
      </header>

      {data && !data.fetchedAt ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-5">
          <p className="font-medium">{t('conferences.emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {t('conferences.emptyBody')}
          </p>
          <Button disabled={refresh.isPending} onClick={download}>
            {refresh.isPending && <Loader2Icon className="animate-spin" />}
            {refresh.isPending
              ? t('conferences.refreshing')
              : t('conferences.download')}
          </Button>
        </div>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t('conferences.following')}
            </h2>
            {followed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('conferences.noneFollowed')}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {followed.map(c => (
                  <DeadlineCard key={c.key} conference={c} now={now} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t('conferences.find')}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md border px-2">
                <SearchIcon className="size-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('conferences.search')}
                  className="h-8 w-48 bg-transparent text-sm outline-none"
                />
              </div>
              <NativeSelect
                value={area}
                onChange={e => setArea(e.target.value)}
                className="h-8 text-sm"
              >
                <NativeSelectOption value="">
                  {t('conferences.allAreas')}
                </NativeSelectOption>
                {AREAS.map(a => (
                  <NativeSelectOption key={a} value={a}>
                    {t(`conferences.area.${a}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FilterChip
                active={rank === null}
                onClick={() => setRank(null)}
                label={t('conferences.allRanks')}
                count={conferences.length}
              />
              {RANKS.map(r => (
                <FilterChip
                  key={r}
                  active={rank === r}
                  onClick={() => setRank(r)}
                  label={`CCF ${r}`}
                  count={conferences.filter(c => c.ccf === r).length}
                />
              ))}
            </div>
            <div className="rounded-lg border">
              {found.slice(0, SHOWN).map(c => (
                <ConferenceRow key={c.key} conference={c} now={now} />
              ))}
            </div>
            {found.length > SHOWN && (
              <p className="text-xs text-muted-foreground">
                {t('conferences.more', { shown: SHOWN, count: found.length })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('conferences.source')}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
