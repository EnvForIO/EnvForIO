/**
 * Completion heatmap: one square per day, darker the more of that day's
 * tasks are done. Clicking a day shows it on the todo card.
 */
import { useTranslation } from 'react-i18next'
import { useDayCompletion } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { dateLabel } from '@/pages/tasks/dates'
import { heatmapGrid, type HeatmapRange } from './heatmap-range'

const CELL = { week: 28, month: 22, year: 10 } as const // px per square

/**
 * Four steps of the app's ink, like a contribution graph; 0 = has tasks,
 * none done. (Green until 2026-11-21; ink since the Ledger look, so the
 * charts share one colour.)
 */
function level(done: number, total: number): string {
  const ratio = done / total
  if (ratio === 0) return 'bg-primary/15'
  if (ratio < 0.5) return 'bg-primary/40'
  if (ratio < 1) return 'bg-primary/70'
  return 'bg-primary'
}

interface HeatmapProps {
  range: HeatmapRange
  today: string
  selected: string | undefined
  onSelect: (date: string) => void
}

export function Heatmap({ range, today, selected, onSelect }: HeatmapProps) {
  const { t } = useTranslation()
  const grid = heatmapGrid(range, today)
  const { data = [] } = useDayCompletion(grid.from, grid.to)
  const byDate = new Map(data.map(day => [day.date, day]))
  const size = CELL[range]

  return (
    <div className="flex gap-[3px]">
      {grid.weeks.map((week, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {week.map((date, j) => {
            if (date === null)
              return <div key={j} style={{ width: size, height: size }} />
            const day = byDate.get(date)
            const future = date > today
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                title={
                  day
                    ? t('duo.dayTooltip', {
                        date: dateLabel(date),
                        done: day.done,
                        total: day.total,
                      })
                    : dateLabel(date)
                }
                style={{ width: size, height: size }}
                className={cn(
                  'rounded-[3px]',
                  day ? level(day.done, day.total) : 'bg-foreground/8',
                  future && !day && 'bg-foreground/4',
                  date === today && 'ring-1 ring-foreground/40',
                  date === selected && 'ring-2 ring-primary'
                )}
              >
                {range !== 'year' && (
                  <span className="text-[10px] text-foreground/70">
                    {Number(date.slice(8))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
