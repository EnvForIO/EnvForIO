/**
 * The parts of the stats page below the numbers: the trend, where time
 * went, the weekly rhythm and project progress.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/api/projects'
import { formatMinutes } from '@/lib/duration'
import type { Stats } from '@/lib/tauri-bindings'
import { parseDate } from '@/pages/tasks/dates'
import { Section } from '@/components/ui/ledger'
import { Segmented } from '@/components/ui/segmented'
import { BarChart } from './BarChart'

/** 'YYYY-MM-DD' -> day of month, 'YYYY-MM' -> short month name. */
const bucketLabel = (key: string) =>
  key.length === 7
    ? parseDate(`${key}-01`).toLocaleDateString('en', { month: 'short' })
    : String(Number(key.slice(8)))

type Metric = 'time' | 'done'

/**
 * Time tracked or tasks done per day (per month for a year). Opens on time
 * when any was tracked, else on tasks, so the chart shows what happened.
 */
export function Trend({ stats, today }: { stats: Stats; today?: string }) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<Metric | null>(null)
  const metric = picked ?? (stats.minutes > 0 ? 'time' : 'done')
  return (
    <Section
      title={t('stats.trend')}
      action={
        <Segmented
          value={metric}
          options={[
            { value: 'time', label: t('stats.metric.time') },
            { value: 'done', label: t('stats.metric.done') },
          ]}
          onChange={setPicked}
          label={t('stats.metricLabel')}
        />
      }
    >
      <BarChart
        empty={t(metric === 'time' ? 'stats.emptyTime' : 'stats.emptyDone')}
        bars={stats.trend.map(b => ({
          key: b.key,
          label: bucketLabel(b.key),
          value: metric === 'time' ? b.minutes : b.done,
          highlight: today !== undefined && today.startsWith(b.key),
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
        height={88}
        empty={t('stats.emptyDone')}
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

/** One labelled bar: name, a thin bar, and the figure at the right. */
function Row({
  name,
  percent,
  color,
  figure,
}: {
  name: string
  percent: number
  color: string
  figure: string
}) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className="w-32 truncate">{name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
      <span className="w-28 text-end text-muted-foreground tabular-nums">
        {figure}
      </span>
    </div>
  )
}

export function WhereTimeWent({ stats }: { stats: Stats }) {
  const { t } = useTranslation()
  const tracked = stats.projects.filter(p => p.minutes > 0)
  const top = Math.max(1, ...tracked.map(p => p.minutes))
  return (
    <Section title={t('stats.whereTimeWent')}>
      {tracked.length === 0 ? (
        <p className="flex h-[88px] items-center justify-center rounded-[4px] bg-foreground/[0.04] text-xs text-muted-foreground">
          {t('stats.noTime')}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tracked.map(p => (
            <Row
              key={p.projectId ?? 'none'}
              name={p.name ?? t('stats.noProject')}
              percent={(p.minutes / top) * 100}
              color={p.color ?? 'var(--muted-foreground)'}
              figure={`${formatMinutes(p.minutes)}, ${t('stats.doneCount', { count: p.done })}`}
            />
          ))}
        </div>
      )}
    </Section>
  )
}

export function ProjectProgress() {
  const { t } = useTranslation()
  const projects = (useProjects().data ?? []).filter(p => !p.isArchived)
  if (projects.length === 0) return null
  return (
    <Section
      title={t('stats.projectProgress')}
      action={
        <span className="text-xs text-muted-foreground">
          {t('stats.projectProgressBasis')}
        </span>
      }
    >
      <div className="flex flex-col gap-2.5">
        {projects.map(p => {
          const percent =
            p.estimateMinutes > 0
              ? (p.doneEstimateMinutes / p.estimateMinutes) * 100
              : p.taskCount > 0
                ? (p.doneCount / p.taskCount) * 100
                : 0
          return (
            <Row
              key={p.id}
              name={p.name}
              percent={percent}
              color={p.color}
              figure={`${Math.round(percent)}%`}
            />
          )
        })}
      </div>
    </Section>
  )
}
