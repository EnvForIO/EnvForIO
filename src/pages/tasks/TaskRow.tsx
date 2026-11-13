/**
 * One task in a list: round checkbox, title, a meta line, and a star.
 * Clicking the row opens it in the details pane.
 */
import { useTranslation } from 'react-i18next'
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  PinIcon,
  PlayIcon,
  SquareIcon,
  StarIcon,
  SunIcon,
} from 'lucide-react'
import { useRunningTimer, useStartTimer, useStopTimer } from '@/api/timer'
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
  const running = useRunningTimer().data?.taskId === task.id
  const startTimer = useStartTimer()
  const stopTimer = useStopTimer()

  const done = task.doneAt !== null
  const inMyDay = task.scheduledDate !== null && task.scheduledDate === today
  const toggleStar = () =>
    updateTask.mutate({
      id: task.id,
      update: { ...toUpdate(task), isImportant: !task.isImportant },
    })

  // A day still to come that the task is planned for ("Do on"); today's is
  // "My Day", and a planned day that passed no longer counts.
  const doOn =
    !done && task.scheduledDate !== null && today && task.scheduledDate > today
      ? task.scheduledDate
      : null

  // The meta line only repeats what the current list does not already say.
  // Do on and Due each carry their word, so the two dates never look alike
  // (critique 2026-11-21).
  const meta = [
    inMyDay && view !== 'MyDay' && (
      <span key="day" className="flex items-center gap-1">
        <SunIcon className="size-3" /> {t('tasks.myDay')}
      </span>
    ),
    doOn && (
      <span key="do-on" className="flex items-center gap-1">
        <CalendarCheckIcon className="size-3" />
        {t('tasks.doOnLabel', { date: dateLabel(doOn) })}
      </span>
    ),
    task.startTime !== null && (
      <span key="time">
        {task.endTime ? `${task.startTime}–${task.endTime}` : task.startTime}
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
        <CalendarClockIcon className="size-3" />
        {t('tasks.dueLabel', {
          date:
            task.dueDate === today ? t('tasks.today') : dateLabel(task.dueDate),
        })}
      </span>
    ),
  ].filter(Boolean)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => selectTask(task.id)}
      onKeyDown={e => {
        // Keys pressed on the buttons inside bubble up here; only the row
        // itself opens the task.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault() // Space would scroll the list
          selectTask(task.id)
        }
      }}
      className={cn(
        'group flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-left hover:bg-accent/50',
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
      {!done && (
        <button
          type="button"
          aria-label={running ? t('timer.stop') : t('timer.start')}
          title={running ? t('timer.stop') : t('timer.start')}
          onClick={e => {
            e.stopPropagation()
            if (running) stopTimer.mutate(undefined)
            else startTimer.mutate(task.id)
          }}
          className={cn(
            !running &&
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
        >
          {running ? (
            <SquareIcon className="size-3.5 fill-red-500 text-red-500" />
          ) : (
            <PlayIcon className="size-3.5 text-muted-foreground" />
          )}
        </button>
      )}
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
