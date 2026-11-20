/**
 * The running timer at the bottom of the sidebar: which task, how long,
 * and a stop button. Clicking the title opens the task.
 */
import { useTranslation } from 'react-i18next'
import { SquareIcon } from 'lucide-react'
import { useRunningTimer, useStopTimer } from '@/api/timer'
import { useUIStore } from '@/store/ui-store'
import { Elapsed } from './Elapsed'

export function SidebarTimer() {
  const { t } = useTranslation()
  const { data: timer } = useRunningTimer()
  const stopTimer = useStopTimer()
  const selectTask = useUIStore(state => state.selectTask)
  if (!timer) return null

  return (
    <div className="mt-auto flex items-center gap-2 border-t border-sidebar-border p-3 text-sm text-foreground">
      <span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />
      <button
        type="button"
        onClick={() => selectTask(timer.taskId)}
        className="min-w-0 flex-1 truncate text-left hover:underline"
      >
        {timer.title}
      </button>
      <Elapsed startedAt={timer.startedAt} />
      <button
        type="button"
        onClick={() => stopTimer.mutate(undefined)}
        aria-label={t('timer.stop')}
        title={t('timer.stop')}
      >
        <SquareIcon className="size-3.5 fill-current" />
      </button>
    </div>
  )
}
