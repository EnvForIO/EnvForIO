/**
 * Today's safety line at the top of My Day: how much project work today
 * needs, how much is done, and the split by project.
 */
import { useTranslation } from 'react-i18next'
import { useTodayLine } from '@/api/plans'
import { formatMinutes } from '@/lib/duration'
import { useUIStore } from '@/store/ui-store'

export function SafetyLineCard() {
  const { t } = useTranslation()
  const { data: line } = useTodayLine()
  const selectProject = useUIStore(state => state.selectProject)
  if (!line || line.projects.length === 0) return null

  const percent =
    line.minutes === 0
      ? 100
      : Math.min(100, (line.doneMinutes / line.minutes) * 100)

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {t('plans.todayLine', { minutes: formatMinutes(line.minutes) })}
        </span>
        <span className="text-muted-foreground">
          {t('plans.done', { minutes: formatMinutes(line.doneMinutes) })}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
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
    </div>
  )
}
