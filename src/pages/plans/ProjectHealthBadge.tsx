/**
 * On a project page: how the project is doing once estimates are corrected
 * by how long work really took (on track / tight / behind / overdue / done,
 * not estimated, or "daily time not set" when there is nothing to compare
 * with). The part that decides it is named: "needs 12h a day for phase
 * Method, ending Sun, Nov 22".
 */
import { useTranslation } from 'react-i18next'
import { useProjectHealth } from '@/api/plans'
import { Button } from '@/components/ui/button'
import { formatMinutes } from '@/lib/duration'
import type { Health } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { limitText } from './limit'

const COLOR: Record<Health, string> = {
  Done: 'bg-muted text-muted-foreground',
  Unestimated: 'bg-muted text-muted-foreground',
  NoDailyTime: 'bg-muted text-muted-foreground',
  OnTrack: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Tight: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Behind: 'bg-red-500/15 text-red-700 dark:text-red-400',
  Overdue: 'bg-red-500/25 text-red-700 dark:text-red-400',
}

export function ProjectHealthBadge({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const openPreferencesAt = useUIStore(state => state.openPreferencesAt)
  const health = useProjectHealth().data?.find(h => h.projectId === projectId)
  if (!health) return null
  const state = health.health

  const left =
    health.samples > 0
      ? t('plans.calibrated', {
          minutes: formatMinutes(health.predictedRemaining),
          ratio: health.ratio.toFixed(1),
          count: health.samples,
        })
      : t('plans.uncalibrated', { minutes: formatMinutes(health.remaining) })
  const need =
    health.neededPerDay !== null &&
    [
      t('plans.neededPerDay', {
        minutes: formatMinutes(health.neededPerDay),
      }),
      health.limit && limitText(t, health.limit),
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={cn('rounded px-1.5 py-0.5 font-medium', COLOR[state])}>
        {t(`plans.health.${state}`)}
      </span>
      {state === 'Unestimated' && (
        <span className="text-muted-foreground">
          {t('plans.unestimatedHint')}
        </span>
      )}
      {state !== 'Done' && state !== 'Unestimated' && (
        <span className="text-muted-foreground">
          {left}
          {need && `, ${need}`}
        </span>
      )}
      {state === 'NoDailyTime' && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs"
          onClick={() => openPreferencesAt('planning')}
        >
          {t('plans.setDailyTime')}
        </Button>
      )}
    </div>
  )
}
