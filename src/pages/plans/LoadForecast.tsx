/**
 * The next 14 days as bars: planned project work per day, with a tick at
 * the day's available time. Bars over the tick are drawn in red.
 */
import { useTranslation } from 'react-i18next'
import { useLoadForecast } from '@/api/plans'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { parseDate } from '@/pages/tasks/dates'

const HEIGHT = 64 // px for the tallest bar or capacity

export function LoadForecast() {
  const { t } = useTranslation()
  const { data: days = [] } = useLoadForecast()
  const top = Math.max(
    1,
    ...days.map(d => Math.max(d.minutes, d.capacity ?? 0))
  )
  const px = (minutes: number) => Math.round((minutes / top) * HEIGHT)

  return (
    <div className="flex items-end gap-1" style={{ height: HEIGHT + 16 }}>
      {days.map(day => {
        const over = day.capacity !== null && day.minutes > day.capacity
        const date = parseDate(day.date)
        return (
          <div
            key={day.date}
            className="relative flex flex-1 flex-col items-center justify-end"
            title={t('plans.forecastTooltip', {
              date: date.toLocaleDateString('en', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              }),
              minutes: formatMinutes(day.minutes),
              capacity:
                day.capacity === null
                  ? t('plans.noLimit')
                  : formatMinutes(day.capacity),
            })}
          >
            {day.capacity !== null && (
              <div
                className="absolute inset-x-0 h-px bg-foreground/40"
                style={{ bottom: px(day.capacity) + 14 }}
              />
            )}
            <div
              className={cn(
                'w-full rounded-sm',
                over ? 'bg-destructive' : 'bg-primary/70'
              )}
              style={{
                height: Math.max(day.minutes > 0 ? 2 : 0, px(day.minutes)),
              }}
            />
            <span className="mt-0.5 text-[10px] text-muted-foreground">
              {date.getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
