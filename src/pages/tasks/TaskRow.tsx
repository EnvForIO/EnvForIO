/**
 * One task in a list: round checkbox, title, a meta line, and a star.
 * Clicking the row opens it in the details pane.
 */
import { useTranslation } from 'react-i18next'
import { CalendarIcon, PinIcon, StarIcon, SunIcon } from 'lucide-react'
import { toUpdate, useSetTaskDone, useToday, useUpdateTask } from '@/api/tasks'
import type { Task, TaskView } from '@/lib/tauri-bindings'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel, isOverdue } from './dates'

export function TaskRow({ task, view }: { task: Task; view: TaskView }) {
  const { t } = useTranslation()
  const today = useToday()
  const selectedTaskId = useUIStore(state => state.selectedTaskId)
  const selectTask = useUIStore(state => state.selectTask)
  const setDone = useSetTaskDone()
  const updateTask = useUpdateTask()

  const done = task.doneAt !== null
  const inMyDay = task.myDayDate !== null && task.myDayDate === today
  const toggleStar = () =>
    updateTask.mutate({
      id: task.id,
      update: { ...toUpdate(task, today), isImportant: !task.isImportant },
    })

  // The meta line only repeats what the current list does not already say.
  const meta = [
    inMyDay && view !== 'MyDay' && (
      <span key="day" className="flex items-center gap-1">
        <SunIcon className="size-3" /> {t('tasks.myDay')}
      </span>
    ),
    task.estimateMinutes !== null && (
      <span key="estimate">{formatMinutes(task.estimateMinutes)}</span>
    ),
    task.stepCount > 0 && (
      <span key="steps">
        {t('tasks.stepsProgress', {
          done: task.stepsDone,
          total: task.stepCount,
        })}
      </span>
    ),
    task.dueDate !== null && (
      <span
        key="due"
        className={cn(
          'flex items-center gap-1',
          !done && isOverdue(task.dueDate, today) && 'text-destructive'
        )}
      >
        <CalendarIcon className="size-3" />
        {task.dueDate === today ? t('tasks.today') : dateLabel(task.dueDate)}
      </span>
    ),
  ].filter(Boolean)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectTask(task.id)}
      onKeyDown={e => e.key === 'Enter' && selectTask(task.id)}
      className={cn(
        'flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-left hover:bg-accent/50',
        selectedTaskId === task.id && 'bg-accent'
      )}
    >
      <button
        type="button"
        aria-label={done ? t('tasks.markOpen') : t('tasks.markDone')}
        onClick={e => {
          e.stopPropagation()
          setDone.mutate({ id: task.id, done: !done })
        }}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary/60',
          done && 'border-primary bg-primary'
        )}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-sm',
            done && 'text-muted-foreground line-through'
          )}
        >
          {task.title}
        </div>
        {meta.length > 0 && (
          <div className="flex gap-3 text-xs text-muted-foreground">{meta}</div>
        )}
      </div>
      {task.isPinned && <PinIcon className="size-4 text-muted-foreground" />}
      <button
        type="button"
        aria-label={
          task.isImportant
            ? t('tasks.unmarkImportant')
            : t('tasks.markImportant')
        }
        onClick={e => {
          e.stopPropagation()
          toggleStar()
        }}
      >
        <StarIcon
          className={cn(
            'size-4',
            task.isImportant
              ? 'fill-primary text-primary'
              : 'text-muted-foreground'
          )}
        />
      </button>
    </div>
  )
}
