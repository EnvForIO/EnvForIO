/**
 * Statistics: pick week / month / year and step back through earlier ones.
 * Numbers on top, then trend, time by project, weekly rhythm, the
 * completion heatmap (last 53 weeks) and project progress.
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
import { Heatmap } from '@/pages/duo/Heatmap'
import { dateLabel } from '@/pages/tasks/dates'
import {
  ProjectProgress,
  Section,
  Trend,
  WeeklyRhythm,
  WhereTimeWent,
} from './StatsSections'

const PERIODS: Period[] = ['Week', 'Month', 'Year']

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-md border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  )
}

export function StatsPage() {
  const { t } = useTranslation()
  const today = useToday()
  const [period, setPeriod] = useState<Period>('Week')
  const [offset, setOffset] = useState(0)
  const { data: stats } = useStats(period, offset)

  const rate =
    stats && stats.planned > 0
      ? Math.round((stats.plannedDone / stats.planned) * 100)
      : null

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex items-center gap-2">
        <h1 className="flex-1 text-xl font-semibold">{t('stats.title')}</h1>
        {PERIODS.map(p => (
          <Button
            key={p}
            size="sm"
            variant={p === period ? 'default' : 'outline'}
            onClick={() => (setPeriod(p), setOffset(0))}
          >
            {t(`stats.period.${p}`)}
          </Button>
        ))}
      </header>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOffset(offset - 1)}
          aria-label={t('calendar.previous')}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-48 text-center">
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
        {stats && (
          <div className="flex flex-col gap-3 pr-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Tile label={t('stats.done')} value={String(stats.done)} />
              <Tile
                label={t('stats.time')}
                value={formatMinutes(stats.minutes)}
              />
              <Tile
                label={t('stats.rate')}
                value={rate === null ? '–' : `${rate}%`}
              />
              <Tile
                label={t('stats.activeDays')}
                value={`${stats.activeDays} / ${stats.days}`}
              />
            </div>
            <Trend stats={stats} />
            <div className="grid gap-3 md:grid-cols-2">
              <WhereTimeWent stats={stats} />
              <WeeklyRhythm stats={stats} />
            </div>
            {today && (
              <Section title={t('stats.heatmap')}>
                <Heatmap
                  range="year"
                  today={today}
                  selected={undefined}
                  onSelect={() => undefined}
                />
              </Section>
            )}
            <ProjectProgress />
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
