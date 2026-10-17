/**
 * The Todo Duo capsule (EnvIO in mini mode). Collapsed it shows today's progress; expanded it
 * grows into the week / month / year heatmap. The window resizes to fit and
 * Rust slides the card down with it.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronUpIcon, Maximize2Icon } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { useDayTasks, useToday } from '@/api/tasks'
import { commands } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { Heatmap } from './Heatmap'
import type { HeatmapRange } from './heatmap-range'
import { selectDuoDay, useSelectedDuoDay } from './events'

const RANGES: HeatmapRange[] = ['week', 'month', 'year']
// Window size (logical px) for each state; the heatmap needs room.
const SIZES = {
  collapsed: [320, 56],
  week: [320, 112],
  month: [320, 230],
  year: [700, 170],
} as const

export function Capsule() {
  const { t } = useTranslation()
  const today = useToday()
  const selected = useSelectedDuoDay(today)
  const { data: tasks = [] } = useDayTasks(today)
  const [expanded, setExpanded] = useState(false)
  const [range, setRange] = useState<HeatmapRange>('month')

  const done = tasks.filter(task => task.doneAt !== null).length

  useEffect(() => {
    const [w, h] = SIZES[expanded ? range : 'collapsed']
    void getCurrentWindow().setSize(new LogicalSize(w, h))
  }, [expanded, range])

  return (
    <div
      data-tauri-drag-region
      className="flex h-full flex-col gap-2 rounded-2xl bg-[var(--duo-surface)] px-4 py-3 text-foreground shadow-lg"
    >
      <div data-tauri-drag-region className="flex items-center gap-3">
        <span data-tauri-drag-region className="font-semibold">
          {t('duo.today')}
        </span>
        <span
          data-tauri-drag-region
          className="flex-1 text-sm text-muted-foreground"
        >
          {t('duo.progress', { done, total: tasks.length })}
        </span>
        {expanded &&
          RANGES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                'rounded px-1.5 text-xs',
                r === range ? 'bg-foreground/15' : 'text-muted-foreground'
              )}
            >
              {t(`duo.range.${r}`)}
            </button>
          ))}
        <button
          type="button"
          onClick={() => void commands.leaveMiniMode()}
          aria-label={t('duo.openEnvio')}
          title={t('duo.openEnvio')}
        >
          <Maximize2Icon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? t('duo.collapse') : t('duo.expand')}
        >
          {expanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </button>
      </div>
      {expanded && today && (
        <Heatmap
          range={range}
          today={today}
          selected={selected}
          onSelect={selectDuoDay}
        />
      )}
    </div>
  )
}
