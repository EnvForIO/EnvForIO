/**
 * The Todo Duo capsule (EnvForIO in mini mode): today's progress, a pin that
 * keeps the sticky on top, and a button back to the main window.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2Icon, PinIcon } from 'lucide-react'
import { useDayTasks, useToday } from '@/api/tasks'
import { commands } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'

export function Capsule() {
  const { t } = useTranslation()
  const today = useToday()
  const { data: tasks = [] } = useDayTasks(today)
  const [pinned, setPinned] = useState(false)
  const togglePin = () => {
    void commands.setMiniPinned(!pinned)
    setPinned(!pinned)
  }

  const done = tasks.filter(task => task.doneAt !== null).length

  return (
    <div
      data-tauri-drag-region
      className="flex h-full items-center gap-3 rounded-2xl bg-[var(--duo-surface)] px-4 text-foreground shadow-lg"
    >
      <span data-tauri-drag-region className="font-semibold">
        {t('duo.today')}
      </span>
      <span
        data-tauri-drag-region
        className="flex-1 text-sm text-muted-foreground"
      >
        {t('duo.progress', { done, total: tasks.length })}
      </span>
      <button
        type="button"
        onClick={togglePin}
        aria-label={pinned ? t('duo.unpin') : t('duo.pin')}
        title={pinned ? t('duo.unpin') : t('duo.pin')}
      >
        <PinIcon
          className={cn('size-3.5', pinned ? 'fill-current' : 'opacity-50')}
        />
      </button>
      <button
        type="button"
        onClick={() => void commands.leaveMiniMode()}
        aria-label={t('duo.openEnvio')}
        title={t('duo.openEnvio')}
      >
        <Maximize2Icon className="size-3.5" />
      </button>
    </div>
  )
}
