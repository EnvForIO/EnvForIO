/**
 * The parts of the stats page below the numbers: trend, where time went,
 * weekly rhythm, and project progress.
 */
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/api/projects'
import { formatMinutes } from '@/lib/duration'
import type { Stats } from '@/lib/tauri-bindings'
import { parseDate } from '@/pages/tasks/dates'
import { Section } from '@/components/ui/ledger'
import { BarChart } from './BarChart'

/** 'YYYY-MM-DD' -> day of month, 'YYYY-MM' -> short month name. */
const bucketLabel = (key: string) =>
  key.length === 7
    ? parseDate(`${key}-01`).toLocaleDateString('en', { month: 'short' })
    : String(Number(key.slice(8)))

export function Trend({ stats }: { stats: Stats }) {
  const { t } = useTranslation()
  return (
    <Section title={t('stats.trend')}>
      <BarChart
        bars={stats.trend.map(b => ({
          key: b.key,
          label: bucketLabel(b.key),
          value: b.minutes,
          tooltip: t('stats.bucketTooltip', {
            key: b.key,
            minutes: formatMinutes(b.minutes),
            done: b.done,
          }),
        }))}
      />
    </Section>
  )
}

export function WeeklyRhythm({ stats }: { stats: Stats }) {
  const { t } = useTranslation()
  return (
    <Section title={t('stats.rhythm')}>
      <BarChart
        height={64}
        bars={stats.weekdays.map(b => ({
          key: b.key,
          label: t(`calendar.weekday.${b.key}`),
          value: b.done,
          tooltip: t('stats.rhythmTooltip', {
            done: b.done,
            minutes: formatMinutes(b.minutes),
          }),
        }))}
      />
    </Section>
  )
}

export function WhereTimeWent({ stats }: { stats: Stats }) {
  const { t } = useTranslation()
  const top = Math.max(1, ...stats.projects.map(p => p.minutes))
  return (
    <Section title={t('stats.whereTimeWent')}>
      {stats.projects.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('stats.noTime')}</p>
      )}
      {stats.projects.map(p => (
        <div
          key={p.projectId ?? 'none'}
          className="flex items-center gap-2 text-xs"
        >
          <span className="w-28 truncate">
            {p.name ?? t('stats.noProject')}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(p.minutes / top) * 100}%`,
                background: p.color ?? 'var(--muted-foreground)',
              }}
            />
          </div>
          <span className="w-24 text-right text-muted-foreground">
            {formatMinutes(p.minutes)},{' '}
            {t('stats.doneCount', { count: p.done })}
          </span>
        </div>
      ))}
    </Section>
  )
}

export function ProjectProgress() {
  const { t } = useTranslation()
  const projects = (useProjects().data ?? []).filter(p => !p.isArchived)
  if (projects.length === 0) return null
  return (
    <Section title={t('stats.projectProgress')}>
      {projects.map(p => {
        const percent =
          p.estimateMinutes > 0
            ? (p.doneEstimateMinutes / p.estimateMinutes) * 100
            : p.taskCount > 0
              ? (p.doneCount / p.taskCount) * 100
              : 0
        return (
          <div key={p.id} className="flex items-center gap-2 text-xs">
            <span className="w-28 truncate">{p.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, background: p.color }}
              />
            </div>
            <span className="w-24 text-right text-muted-foreground">
              {Math.round(percent)}%
            </span>
          </div>
        )
      })}
    </Section>
  )
}
