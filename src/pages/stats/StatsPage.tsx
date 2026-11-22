/**
 * Statistics: pick week / month / year and step back through earlier ones.
 * Numbers on top, then trend, time by project, weekly rhythm, the
 * completion heatmap (last 53 weeks) and project progress, in one column
 * capped at a reading width so wide windows do not stretch the charts.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useStats } from '@/api/stats'
import { useToday } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatMinutes } from '@/lib/duration'
import type { Period } from '@/lib/tauri-bindings'
import { dateLabel } from '@/pages/tasks/dates'
import { YearReview } from '@/pages/review/YearReview'
import { Section, Summary } from '@/components/ui/ledger'
import { Segmented } from '@/components/ui/segmented'
import {
  ProjectProgress,
  Trend,
  WeeklyRhythm,
  WhereTimeWent,
} from './StatsSections'
import { YearHeatmap } from './YearHeatmap'

const PERIODS: Period[] = ['Week', 'Month', 'Year']

export function StatsPage() {
  const { t } = useTranslation()
  const today = useToday()
  const [period, setPeriod] = useState<Period>('Week')
  const [offset, setOffset] = useState(0)
  const [reviewing, setReviewing] = useState(false)
  const { data: stats, isLoading, error } = useStats(period, offset)

  const rate =
    stats && stats.planned > 0
      ? Math.round((stats.plannedDone / stats.planned) * 100)
      : null

  return (
    <div className="flex h-full flex-col gap-4 pt-6">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-2 px-8">
        <h1 className="flex-1 text-[22px] font-semibold tracking-tight">
          {t('stats.title')}
        </h1>
        {period === 'Year' && (
          <Button size="sm" variant="ghost" onClick={() => setReviewing(true)}>
            {t('review.open')}
          </Button>
        )}
        <Segmented
          value={period}
          options={PERIODS.map(p => ({
            value: p,
            label: t(`stats.period.${p}`),
          }))}
          onChange={p => (setPeriod(p), setOffset(0))}
          label={t('stats.periodLabel')}
        />
      </header>
      <div className="mx-auto -mt-1 flex w-full max-w-5xl items-center gap-1 px-8 text-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset(offset - 1)}
          aria-label={t('calendar.previous')}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-44 text-center font-medium tabular-nums">
          {stats ? `${dateLabel(stats.from)} – ${dateLabel(stats.to)}` : ''}
        </span>
        <Button
          variant="ghost"
          size="icon"
          disabled={offset >= 0}
          onClick={() => setOffset(offset + 1)}
          aria-label={t('calendar.next')}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading && (
          <p className="mx-auto max-w-5xl px-8 text-sm text-muted-foreground">
            {t('stats.loading')}
          </p>
        )}
        {error && (
          <p className="mx-auto max-w-5xl px-8 text-sm text-destructive">
            {t('stats.loadFailed')}
          </p>
        )}
        {stats && (
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-8 pt-2 pb-10">
            <Summary
              items={[
                {
                  value: String(stats.done),
                  label: t('stats.sum.done', { count: stats.done }),
                },
                {
                  value: formatMinutes(stats.minutes),
                  label: t('stats.sum.time'),
                },
                ...(rate === null
                  ? []
                  : [{ value: `${rate}%`, label: t('stats.sum.rate') }]),
                {
                  value: `${stats.activeDays}`,
                  label: t('stats.sum.active', { days: stats.days }),
                },
              ]}
            />
            <Trend stats={stats} today={today} />
            <div className="grid gap-x-12 gap-y-12 md:grid-cols-2">
              <WhereTimeWent stats={stats} />
              <WeeklyRhythm stats={stats} />
            </div>
            {today && (
              <Section title={t('stats.heatmap')}>
                <YearHeatmap today={today} />
              </Section>
            )}
            <ProjectProgress />
          </div>
        )}
      </ScrollArea>
      {reviewing && (
        <YearReview
          offset={offset}
          open={reviewing}
          onOpenChange={setReviewing}
        />
      )}
    </div>
  )
}
