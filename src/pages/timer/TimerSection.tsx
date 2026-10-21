/**
 * Timer block in the details pane: start / stop, time recorded so far, and
 * "did part of it" (finish the done part, move the rest to the next work day).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayIcon, SquareIcon } from 'lucide-react'
import {
  useCompletePartially,
  useRunningTimer,
  useStartTimer,
  useStopTimer,
} from '@/api/timer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMinutes } from '@/lib/duration'
import type { Task } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'
import { Elapsed } from './Elapsed'

export function TimerSection({ task }: { task: Task }) {
  const { t } = useTranslation()
  const { data: timer } = useRunningTimer()
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()
  const completePartially = useCompletePartially()
  const selectTask = useUIStore(state => state.selectTask)
  const [splitting, setSplitting] = useState(false)
  const [done, setDone] = useState('')

  if (task.doneAt !== null) {
    return task.actualMinutes ? (
      <p className="px-1 text-sm text-muted-foreground">
        {t('timer.actual', { minutes: formatMinutes(task.actualMinutes) })}
      </p>
    ) : null
  }

  const running = timer?.taskId === task.id
  const split = () =>
    completePartially.mutate(
      { id: task.id, done },
      { onSuccess: rest => selectTask(rest.id) }
    )

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <div className="flex items-center gap-2">
        {running ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => stopTimer.mutate(undefined)}
          >
            <SquareIcon className="size-3.5 fill-current" />
            <Elapsed startedAt={timer.startedAt} />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => startTimer.mutate(task.id)}
          >
            <PlayIcon className="size-3.5" />
            {t('timer.start')}
          </Button>
        )}
        <span className="flex-1 text-xs text-muted-foreground">
          {t('timer.actual', {
            minutes: formatMinutes(task.actualMinutes ?? 0),
          })}
        </span>
        {task.estimateMinutes !== null && !splitting && (
          <Button size="sm" variant="ghost" onClick={() => setSplitting(true)}>
            {t('timer.didPart')}
          </Button>
        )}
      </div>
      {splitting && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={done}
            onChange={e => setDone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && split()}
            placeholder={t('timer.howMuch')}
            className="h-8"
          />
          <Button size="sm" onClick={split} disabled={done.trim() === ''}>
            {t('timer.split')}
          </Button>
        </div>
      )}
      {splitting && (
        <p className="text-xs text-muted-foreground">
          {completePartially.error
            ? t('timer.splitFailed')
            : t('timer.splitHint')}
        </p>
      )}
    </div>
  )
}
