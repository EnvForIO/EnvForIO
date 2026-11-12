/**
 * On a project page: how the project is doing once estimates are corrected
 * by how long work really took (on track / tight / behind / overdue / done,
 * or not estimated). The worst phase decides it; "needed per day" is that
 * phase's.
 */
import { useTranslation } from 'react-i18next'
import { useProjectHealth } from '@/api/plans'
import { formatMinutes } from '@/lib/duration'
import type { Health } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'

const COLOR: Record<Health, string> = {
  Done: 'bg-muted text-muted-foreground',
  Unestimated: 'bg-muted text-muted-foreground',
  OnTrack: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Tight: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Behind: 'bg-red-500/15 text-red-700 dark:text-red-400',
  Overdue: 'bg-red-500/25 text-red-700 dark:text-red-400',
}

export function ProjectHealthBadge({ projectId }: { projectId: number }) {
  const { t } = useTranslation()
  const health = useProjectHealth().data?.find(h => h.projectId === projectId)
  if (!health) return null

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span
        className={cn(
          'rounded px-1.5 py-0.5 font-medium',
          COLOR[health.health]
        )}
      >
        {t(`plans.health.${health.health}`)}
      </span>
      {health.health === 'Unestimated' && (
        <span className="text-muted-foreground">
          {t('plans.unestimatedHint')}
        </span>
      )}
      {health.health !== 'Done' && health.health !== 'Unestimated' && (
        <span className="text-muted-foreground">
          {health.samples > 0
            ? t('plans.calibrated', {
                minutes: formatMinutes(health.predictedRemaining),
                ratio: health.ratio.toFixed(1),
                count: health.samples,
              })
            : t('plans.uncalibrated', {
                minutes: formatMinutes(health.remaining),
              })}
          {health.neededPerDay !== null &&
            ` · ${t('plans.neededPerDay', { minutes: formatMinutes(health.neededPerDay) })}`}
        </span>
      )}
    </div>
  )
}
