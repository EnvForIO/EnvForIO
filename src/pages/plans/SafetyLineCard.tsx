/**
 * Today's safety line at the top of My Day: how much project work today
 * needs, how much is done, the split by project, the check-in streak,
 * yesterday's shortfall, and (folded) the next 14 days.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronRightIcon, FlameIcon } from 'lucide-react'
import { useCheckIns, useTodayLine } from '@/api/plans'
import { formatMinutes } from '@/lib/duration'
import { useUIStore } from '@/store/ui-store'
import { LoadForecast } from './LoadForecast'

export function SafetyLineCard() {
  const { t } = useTranslation()
  const { data: line } = useTodayLine()
  const { data: checkIns } = useCheckIns()
  const selectProject = useUIStore(state => state.selectProject)
  const [showForecast, setShowForecast] = useState(false)
  if (!line) return null
  const hasLine = line.projects.length > 0
  if (!hasLine && !checkIns?.streak && !checkIns?.shortfall) return null

  const percent =
    line.minutes === 0
      ? 100
      : Math.min(100, (line.doneMinutes / line.minutes) * 100)

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex items-baseline gap-3 text-sm">
        <span className="font-medium">
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
