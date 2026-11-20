/**
 * Today's hours as a strip beside My Day ("Planner", user choice
 * 2026-11-21): the day's available time from top to bottom, a block for
 * each project's share of today's safety line and for each of today's
 * other tasks with an estimate or a time slot, the free time left, and a
 * red rule where the day runs out when it is over. Whether today fits is
 * a picture, not a sum to work out.
 */
import { useTranslation } from 'react-i18next'
import { useTodayLine } from '@/api/plans'
import { useTasks, useToday } from '@/api/tasks'
import { formatMinutes } from '@/lib/duration'
import type { Task } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

interface Block {
  key: string
  label: string
  minutes: number
  color: string | null // a project's colour; null = a task outside projects
  done: boolean
}

const HEIGHT = 440 // px for the whole day's scale
const LABELLED = 22 // px a block needs to carry its label inside

/** "14:00"–"15:30" as minutes; 0 when either end is missing or backwards. */
function slotMinutes(task: Task): number {
  const toMin = (s: string | null) =>
    s === null ? null : Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
  const from = toMin(task.startTime)
  const to = toMin(task.endTime)
  return from !== null && to !== null && to > from ? to - from : 0
}

export function DayStrip() {
  const { t } = useTranslation()
  const today = useToday()
  const { data: line } = useTodayLine()
  const { data: myDay = [] } = useTasks('MyDay')
  const selectTask = useUIStore(state => state.selectTask)
  const selectProject = useUIStore(state => state.selectProject)
  const openPreferencesAt = useUIStore(state => state.openPreferencesAt)
  if (!line || !today) return null

  // Project work is already in the safety line, so only tasks outside
  // projects are added here, each once.
  const blocks: Block[] = [
    ...line.projects.map(p => ({
      key: `p${p.projectId}`,
      label: p.name,
      minutes: p.minutes,
      color: p.color,
      done: p.doneMinutes >= p.minutes,
    })),
    ...myDay
      .filter(
        task =>
          task.projectId === null &&
          task.scheduledDate === today &&
          (task.estimateMinutes ?? slotMinutes(task)) > 0
      )
      .map(task => ({
        key: `t${task.id}`,
        label: task.startTime ? `${task.startTime} ${task.title}` : task.title,
        minutes: task.estimateMinutes ?? slotMinutes(task),
        color: null,
        done: task.doneAt !== null,
      })),
  ]
  const planned = blocks.reduce((sum, b) => sum + b.minutes, 0)
  const capacity = line.capacity
  const scale = Math.max(capacity ?? 0, planned, 60)
  const px = (minutes: number) => (minutes / scale) * HEIGHT
  const free = capacity === null ? 0 : capacity - planned
  const over = capacity !== null && planned > capacity

  return (
    <aside className="flex w-48 shrink-0 flex-col gap-3 border-s px-4 py-6">
      <div>
        <div className="text-xs text-muted-foreground">
          {t('plans.strip.title')}
        </div>
        <div
          className={cn(
            'text-sm font-medium tabular-nums',
            over ? 'text-destructive' : 'text-foreground'
          )}
        >
          {capacity === null
            ? formatMinutes(planned)
            : t('plans.strip.of', {
                planned: formatMinutes(planned),
                capacity: formatMinutes(capacity),
              })}
        </div>
      </div>

      <div
        className="relative flex flex-col gap-0.5"
        style={{ minHeight: HEIGHT }}
      >
        {blocks.map(b => {
          const height = Math.max(6, px(b.minutes))
          return (
            <button
              key={b.key}
              type="button"
              title={`${b.label}: ${formatMinutes(b.minutes)}`}
              onClick={() =>
                b.key.startsWith('p')
                  ? selectProject(Number(b.key.slice(1)))
                  : selectTask(Number(b.key.slice(1)))
              }
              className={cn(
                'flex shrink-0 flex-col overflow-hidden rounded-[5px] px-2 text-start text-[11px] leading-tight transition-opacity hover:opacity-80',
                b.color === null && 'bg-selected text-selected-text',
                b.done && 'line-through decoration-1'
              )}
              style={{
                height,
                paddingBlock: height >= LABELLED ? 4 : 0,
                ...(b.color !== null && {
                  background: `color-mix(in oklab, ${b.color} 16%, var(--background))`,
                  color: `color-mix(in oklab, ${b.color} 70%, var(--foreground))`,
                }),
              }}
            >
              {height >= LABELLED && (
                <>
                  <span className="truncate font-medium">{b.label}</span>
                  {height >= LABELLED * 1.6 && (
                    <span className="opacity-75 tabular-nums">
                      {formatMinutes(b.minutes)}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
        {free > 0 && (
          <div
            className="flex shrink-0 items-start rounded-[5px] border border-dashed px-2 py-1 text-[11px] text-muted-foreground"
            style={{ height: Math.max(22, px(free)) }}
          >
            {t('plans.strip.free', { minutes: formatMinutes(free) })}
          </div>
        )}
        {over && capacity !== null && (
          // Where the day's time runs out.
          <div
            className="pointer-events-none absolute inset-x-0 border-t-2 border-destructive"
            style={{ top: px(capacity) }}
          >
            <span className="absolute end-0 -top-5 bg-background ps-1 text-[11px] text-destructive tabular-nums">
              {t('plans.strip.over', {
                minutes: formatMinutes(planned - capacity),
              })}
            </span>
          </div>
        )}
        {blocks.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t('plans.strip.empty')}
          </p>
        )}
      </div>

      {capacity === null && (
        <button
          type="button"
          onClick={() => openPreferencesAt('planning')}
          className="text-start text-xs text-primary hover:underline"
        >
          {t('plans.strip.noTime')}
        </button>
      )}
    </aside>
  )
}
