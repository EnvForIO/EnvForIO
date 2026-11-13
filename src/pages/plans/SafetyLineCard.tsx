/**
 * Today's safety line at the top of My Day: how much project work today
 * needs, how much is done, the split by project, the check-in streak,
 * yesterday's shortfall, and (folded) the next 14 days. When today asks
 * more than the day holds (the time set for it, or 24 hours), it says so
 * and names what causes it; with no time set it asks for one.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronRightIcon, FlameIcon } from 'lucide-react'
import { useCheckIns, useProjectHealth, useTodayLine } from '@/api/plans'
import { Button } from '@/components/ui/button'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { DAY_MINUTES, limitText } from './limit'
import { LoadForecast } from './LoadForecast'

export function SafetyLineCard() {
  const { t } = useTranslation()
  const { data: line } = useTodayLine()
  const { data: checkIns } = useCheckIns()
  const { data: health = [] } = useProjectHealth()
  const selectProject = useUIStore(state => state.selectProject)
  const openPreferencesAt = useUIStore(state => state.openPreferencesAt)
  const [showForecast, setShowForecast] = useState(false)
  if (!line) return null
  const hasLine = line.projects.length > 0
  if (!hasLine && !checkIns?.streak && !checkIns?.shortfall) return null

  const percent =
    line.minutes === 0
      ? 100
      : Math.min(100, (line.doneMinutes / line.minutes) * 100)
  const over = line.minutes > (line.capacity ?? DAY_MINUTES)
  // The biggest asks first (the line arrives sorted that way).
  const causes = line.projects.slice(0, 3).map(p => {
    const limit = health.find(h => h.projectId === p.projectId)?.limit
    return {
      id: p.projectId,
      text: [
        `${p.name}: ${formatMinutes(p.minutes)}`,
        limit && limitText(t, limit),
      ]
        .filter(Boolean)
        .join(' '),
    }
  })

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex items-baseline gap-3 text-sm">
        <span className={cn('font-medium', over && 'text-destructive')}>
          {t('plans.todayLine', { minutes: formatMinutes(line.minutes) })}
        </span>
        <span className="flex-1 text-muted-foreground">
          {t('plans.done', { minutes: formatMinutes(line.doneMinutes) })}
        </span>
        {checkIns && checkIns.streak > 0 && (
          <span className="flex items-center gap-1 text-xs text-orange-600">
            <FlameIcon className="size-3.5" />
            {t('plans.streak', { count: checkIns.streak })}
          </span>
        )}
      </div>
      {hasLine && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {line.projects.map(p => (
          <button
            key={p.projectId}
            type="button"
            onClick={() => selectProject(p.projectId)}
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.name} {formatMinutes(p.doneMinutes)} / {formatMinutes(p.minutes)}
          </button>
        ))}
      </div>
      {over && (
        <div className="flex flex-col gap-0.5 text-xs" role="status">
          <p className="font-medium text-destructive">
            {line.capacity === null
              ? t('plans.overDay', { minutes: formatMinutes(line.minutes) })
              : t('plans.overCapacity', {
                  minutes: formatMinutes(line.minutes),
                  capacity: formatMinutes(line.capacity),
                })}
          </p>
          {causes.map(cause => (
            <button
              key={cause.id}
              type="button"
              onClick={() => selectProject(cause.id)}
              className="self-start text-start text-muted-foreground hover:text-foreground hover:underline"
            >
              {cause.text}
            </button>
          ))}
        </div>
      )}
      {hasLine && line.capacity === null && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {t('plans.noDailyTimeHint')}
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            onClick={() => openPreferencesAt('planning')}
          >
            {t('plans.setDailyTime')}
          </Button>
        </div>
      )}
      {checkIns && checkIns.shortfall > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('plans.shortfall', { minutes: formatMinutes(checkIns.shortfall) })}
        </p>
      )}
      <button
        type="button"
        onClick={() => setShowForecast(!showForecast)}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        {showForecast ? (
          <ChevronDownIcon className="size-3" />
        ) : (
          <ChevronRightIcon className="size-3" />
        )}
        {t('plans.next14Days')}
      </button>
      {showForecast && <LoadForecast />}
    </div>
  )
}
