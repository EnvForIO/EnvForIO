/**
 * One task in a list, as a ledger row: no box,
 * a hairline under it, the title with a short meta line, and two aligned
 * columns at the right for the estimate and the date, so a list reads
 * down like a table. The star shows on hover unless the task is starred.
 * Clicking the row opens it in the details pane; right-click for its menu.
 */
import { useTranslation } from 'react-i18next'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownRightIcon,
  ListTreeIcon,
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
import { TaskMenu } from './TaskMenu'

interface Props {
  task: Task
  view: TaskView
  /** Its subtasks are listed under it: folded or not (undefined = none listed). */
  folded?: boolean
  onToggleFold?: () => void
  /** Shown under its parent, so the parent's title is not repeated. */
  nested?: boolean
}

export function TaskRow({
  task,
  view,
  folded,
  onToggleFold,
  nested = false,
}: Props) {
  const { t } = useTranslation()
  const today = useToday()
  const selected = useUIStore(state => state.selectedTaskId === task.id)
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

  // The date column: the deadline when there is one, else a day still to
  // come that the task is planned for ("Do on"). Each carries its word, so
  // the two never look alike.
  const overdue =
    !done && task.dueDate !== null && isOverdue(task.dueDate, today)
  const date =
    task.dueDate !== null
      ? t('tasks.dueLabel', {
          date:
            task.dueDate === today ? t('tasks.today') : dateLabel(task.dueDate),
        })
      : !done &&
          task.scheduledDate !== null &&
          today &&
          task.scheduledDate > today
        ? t('tasks.doOnLabel', { date: dateLabel(task.scheduledDate) })
        : null

  // The meta line only says what the columns and the list do not.
  const meta = [
    task.parentTitle !== null && !nested && (
      <span key="parent" className="flex min-w-0 items-center gap-1">
        <CornerDownRightIcon className="size-3 shrink-0" />
        <span className="truncate">{task.parentTitle}</span>
      </span>
    ),
    inMyDay && view !== 'MyDay' && (
      <span key="day" className="flex items-center gap-1">
        <SunIcon className="size-3" /> {t('tasks.myDay')}
      </span>
    ),
    task.startTime !== null && (
      <span key="time" className="tabular-nums">
        {task.endTime ? `${task.startTime}–${task.endTime}` : task.startTime}
      </span>
    ),
    task.subtaskCount > 0 && (
      <span key="subtasks" className="flex items-center gap-1">
        <ListTreeIcon className="size-3" />
        {t('tasks.subtasksProgress', {
          done: task.subtasksDone,
          total: task.subtaskCount,
        })}
      </span>
    ),
  ].filter(Boolean)

  return (
    <TaskMenu task={task}>
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
          'group flex items-center gap-3 rounded-md px-2 text-start hover:bg-foreground/[0.04] data-[state=open]:bg-foreground/[0.04]',
          nested ? 'min-h-9 py-1.5' : 'min-h-11 py-2',
          selected && 'bg-selected hover:bg-selected'
        )}
      >
        {/* A gutter for the fold chevron on every top-level row, so all
            the checkboxes and titles line up. */}
        {!nested && (
          <span className="-me-1.5 flex w-4 shrink-0 justify-center">
            {folded !== undefined && (
              <button
                type="button"
                aria-label={
                  folded ? t('tasks.showSubtasks') : t('tasks.hideSubtasks')
                }
                aria-expanded={!folded}
                onClick={e => {
                  e.stopPropagation()
                  onToggleFold?.()
                }}
                className="rounded text-muted-foreground hover:text-foreground"
              >
                {folded ? (
                  <ChevronRightIcon className="size-4" />
                ) : (
                  <ChevronDownIcon className="size-4" />
                )}
              </button>
            )}
          </span>
        )}
        {/* A native checkbox drawn with appearance: none, inside a label
            that gives it a 28px target (modern-web-guidance `checkbox`). */}
        <label
          className="relative -m-1.5 grid size-7 shrink-0 place-items-center"
          onClick={e => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={done}
            onChange={() => setDone.mutate({ id: task.id, done: !done })}
            aria-label={task.title}
            className={cn(
              'peer appearance-none rounded-full border-[1.5px] border-muted-foreground/60 transition-colors checked:border-primary checked:bg-primary hover:border-primary',
              nested ? 'size-4' : 'size-[18px]'
            )}
          />
          <CheckIcon
            aria-hidden="true"
            className="pointer-events-none absolute size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
        </label>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate',
              nested ? 'text-[13px]' : 'text-sm',
              done && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </div>
          {meta.length > 0 && (
            <div className="flex min-w-0 gap-3 text-xs text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
        {task.isPinned && (
          <PinIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
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
              <SquareIcon className="size-3.5 fill-destructive text-destructive" />
            ) : (
              <PlayIcon className="size-3.5 text-muted-foreground" />
            )}
          </button>
        )}
        <span className="w-12 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
          {task.estimateMinutes !== null && formatMinutes(task.estimateMinutes)}
        </span>
        <span
          className={cn(
            'w-28 shrink-0 truncate text-end text-xs text-muted-foreground',
            overdue && 'text-destructive'
          )}
        >
          {date}
        </span>
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
          className={cn(
            !task.isImportant &&
              'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          )}
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
    </TaskMenu>
  )
}
