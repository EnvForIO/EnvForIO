/**
 * The completion heatmap of the last 53 weeks, sized to the page: one
 * square per day in a grid that fills the width, month names above,
 * Mon / Wed / Fri at the left and a less-to-more key below. Darker squares
 * mean more of that day's tasks were done.
 */
import { useTranslation } from 'react-i18next'
import { useDayCompletion } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { heatmapGrid } from '@/pages/duo/heatmap-range'
import { dateLabel, parseDate } from '@/pages/tasks/dates'
import { completionLevel, monthStarts } from './chart-layout'

/** The app's ink at each `completionLevel`; 0 = has tasks, none done. */
const LEVELS = [
  'bg-primary/15',
  'bg-primary/40',
  'bg-primary/70',
  'bg-primary',
] as const

const DAY_LABELS: Record<number, string> = { 0: 'mon', 2: 'wed', 4: 'fri' }

export function YearHeatmap({ today }: { today: string }) {
  const { t } = useTranslation()
  const grid = heatmapGrid('year', today)
  const { data = [] } = useDayCompletion(grid.from, grid.to)
  const byDate = new Map(data.map(day => [day.date, day]))

  const months = monthStarts(grid.weeks).map(s => ({
    column: s.column,
    name: parseDate(s.first).toLocaleDateString('en', { month: 'short' }),
  }))

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `2.25rem repeat(${grid.weeks.length}, minmax(0, 1fr))`,
        }}
      >
        {months.map(m => (
          <span
            key={m.column}
            className="text-[11px] leading-4 whitespace-nowrap text-muted-foreground"
            style={{ gridRow: 1, gridColumn: `${m.column + 2} / span 3` }}
          >
            {m.name}
          </span>
        ))}
        {Object.entries(DAY_LABELS).map(([row, key]) => (
          <span
            key={key}
            className="self-center text-[11px] leading-none text-muted-foreground"
            style={{ gridRow: Number(row) + 2, gridColumn: 1 }}
          >
            {t(`calendar.weekday.${key}`)}
          </span>
        ))}
        {grid.weeks.flatMap((week, column) =>
          week.map((date, row) => {
            if (date === null) return null
            const day = byDate.get(date)
            return (
              <div
                key={date}
                title={
                  day
                    ? t('duo.dayTooltip', {
                        date: dateLabel(date),
                        done: day.done,
                        total: day.total,
                      })
                    : dateLabel(date)
                }
                style={{ gridRow: row + 2, gridColumn: column + 2 }}
                className={cn(
                  'aspect-square w-full rounded-[3px]',
                  day
                    ? LEVELS[completionLevel(day.done, day.total)]
                    : date > today
                      ? 'bg-foreground/[0.02]'
                      : 'bg-foreground/[0.06]',
                  date === today && 'ring-1 ring-foreground/50'
                )}
              />
            )
          })
        )}
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
        <span className="me-1">{t('stats.less')}</span>
        <span className="size-2.5 rounded-[2px] bg-foreground/[0.06]" />
        {LEVELS.map(l => (
          <span key={l} className={cn('size-2.5 rounded-[2px]', l)} />
        ))}
        <span className="ms-1">{t('stats.more')}</span>
      </div>
    </div>
  )
}
