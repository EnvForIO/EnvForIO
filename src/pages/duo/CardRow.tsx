/**
 * One todo on the Todo Duo card: checkbox, title, flag, date tag.
 * Right-click opens the app's menu: rename, pin, flag, date, delete.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarArrowUpIcon,
  CalendarClockIcon,
  CalendarXIcon,
  FlagIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  toUpdate,
  useDeleteTask,
  useSetTaskDone,
  useToday,
  useUpdateTask,
} from '@/api/tasks'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { dateLabel, formatDate, parseDate } from '@/pages/tasks/dates'
import { isEnter } from '@/lib/keys'

const tomorrowOf = (today: string) => {
  const d = parseDate(today)
  return formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
}

export function CardRow({ task, day }: { task: Task; day: string }) {
  const { t } = useTranslation()
  const today = useToday()
  const setDone = useSetTaskDone()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(task.title)

  const done = task.doneAt !== null
  const save = (change: Partial<TaskUpdate>) =>
    updateTask.mutate({
      id: task.id,
      update: { ...toUpdate(task), ...change },
    })

  const finishRename = () => {
    setRenaming(false)
    if (title.trim() !== '' && title !== task.title) save({ title })
    else setTitle(task.title)
  }

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/5 data-[state=open]:bg-foreground/5">
          <button
            type="button"
            aria-label={done ? t('tasks.markOpen') : t('tasks.markDone')}
            onClick={() => setDone.mutate({ id: task.id, done: !done })}
            className={cn(
              'size-4 shrink-0 rounded-full border-2 border-foreground/40',
              done && 'border-emerald-500 bg-emerald-500'
            )}
          />
          {renaming ? (
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={finishRename}
              onKeyDown={e => isEnter(e) && finishRename()}
              className="min-w-0 flex-1 rounded bg-foreground/10 px-1 outline-none"
            />
          ) : (
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                done && 'text-muted-foreground line-through'
              )}
            >
              {task.title}
            </span>
          )}
          {task.isPinned && (
            <PinIcon className="size-3 text-muted-foreground" />
          )}
          {task.dueDate !== null && task.dueDate !== day && (
            <span className="rounded bg-foreground/10 px-1.5 text-[11px] text-muted-foreground">
              {task.dueDate === today
                ? t('tasks.today')
                : dateLabel(task.dueDate)}
            </span>
          )}
          <button
            type="button"
            aria-label={
              task.isImportant ? t('duo.menu.unflag') : t('duo.menu.flag')
            }
            onClick={() => save({ isImportant: !task.isImportant })}
          >
            <FlagIcon
              className={cn(
                'size-3.5',
                task.isImportant
                  ? 'fill-orange-500 text-orange-500'
                  : 'text-foreground/30'
              )}
            />
          </button>
        </div>
      </ContextMenuTrigger>
      {/* No focus back to the row on close, or Rename's box would lose it at once. */}
      <ContextMenuContent onCloseAutoFocus={e => e.preventDefault()}>
        <ContextMenuItem onSelect={() => setRenaming(true)}>
          <PencilIcon />
          {t('duo.menu.rename')}
        </ContextMenuItem>
        {task.parentId === null && (
          <ContextMenuItem onSelect={() => save({ isPinned: !task.isPinned })}>
            <PinIcon />
            {task.isPinned ? t('tasks.unpin') : t('tasks.pin')}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onSelect={() => save({ isImportant: !task.isImportant })}
        >
          <FlagIcon />
          {task.isImportant ? t('duo.menu.unflag') : t('duo.menu.flag')}
        </ContextMenuItem>
        {today && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => save({ dueDate: today })}>
              <CalendarClockIcon />
              {t('duo.menu.dueToday')}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => save({ dueDate: tomorrowOf(today) })}
            >
              <CalendarArrowUpIcon />
              {t('duo.menu.dueTomorrow')}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={task.dueDate === null}
              onSelect={() => save({ dueDate: null })}
            >
              <CalendarXIcon />
              {t('duo.menu.removeDate')}
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => deleteTask.mutate(task.id)}
        >
          <Trash2Icon />
          {t('tasks.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
