/**
 * A task's subtasks in the details pane: tick one, open it (it is a full
 * task with its own dates, estimate and timer), or add one with an
 * optional estimate ("1h30m").
 * The parent's estimate is a budget: subtasks without one share what the
 * estimated ones leave of it.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from 'lucide-react'
import { useAddSubtask, useSetTaskDone, useSubtasks } from '@/api/tasks'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMinutes } from '@/lib/duration'
import { isEnter } from '@/lib/keys'
import type { Task } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from './dates'

export function TaskSubtasks({ task }: { task: Task }) {
  const { t } = useTranslation()
  const { data: subtasks = [] } = useSubtasks(task.id)
  const addSubtask = useAddSubtask()
  const setDone = useSetTaskDone()
  const selectTask = useUIStore(state => state.selectTask)
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState('')

  const add = () => {
    if (title.trim() === '') return
    addSubtask.mutate(
      { parentId: task.id, title, estimate: estimate.trim() || null },
      { onSuccess: () => (setTitle(''), setEstimate('')) }
    )
  }

  return (
    <section className="flex flex-col gap-0.5">
      <h2 className="px-1 text-xs text-muted-foreground">
        {subtasks.length === 0
          ? t('tasks.subtasks')
          : t('tasks.subtasksHeading', {
              done: task.subtasksDone,
              total: task.subtaskCount,
            })}
      </h2>
      {subtasks.map(subtask => {
        const done = subtask.doneAt !== null
        const date = subtask.dueDate ?? subtask.scheduledDate
        return (
          <div
            key={subtask.id}
            className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/60"
          >
            <Checkbox
              checked={done}
              onCheckedChange={checked =>
                setDone.mutate({ id: subtask.id, done: checked === true })
              }
              aria-label={subtask.title}
            />
            <button
              type="button"
              onClick={() => selectTask(subtask.id)}
              title={t('tasks.openSubtask')}
              className={cn(
                'min-w-0 flex-1 truncate text-start text-sm',
                done && 'text-muted-foreground line-through'
              )}
            >
              {subtask.title}
            </button>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {[
                date && dateLabel(date),
                subtask.estimateMinutes !== null &&
                  formatMinutes(subtask.estimateMinutes),
              ]
                .filter(Boolean)
                .join('  ')}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-2 px-1">
        <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={t('tasks.addSubtask')}
          aria-label={t('tasks.addSubtask')}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <input
          value={estimate}
          onChange={e => setEstimate(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={t('projects.estimatePlaceholder')}
          aria-label={t('tasks.estimate')}
          className="h-8 w-20 bg-transparent text-end text-sm outline-none"
        />
      </div>
      {addSubtask.error && (
        <p className="px-1 text-xs text-destructive">
          {t('projects.badEstimate')}
        </p>
      )}
    </section>
  )
}
