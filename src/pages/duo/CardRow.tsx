/**
 * One todo on the Todo Duo card: checkbox, title, flag, date tag.
 * Right-click opens a native menu: rename, pin, flag, date, delete.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlagIcon, PinIcon } from 'lucide-react'
import {
  toUpdate,
  useDeleteTask,
  useSetTaskDone,
  useToday,
  useUpdateTask,
} from '@/api/tasks'
import { showContextMenu } from '@/lib/context-menu'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { dateLabel, formatDate, parseDate } from '@/pages/tasks/dates'

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
      update: { ...toUpdate(task, today), ...change },
    })

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!today) return
    void showContextMenu([
      {
        id: 'rename',
        label: t('duo.menu.rename'),
        action: () => setRenaming(true),
      },
      {
        id: 'pin',
        label: task.isPinned ? t('tasks.unpin') : t('tasks.pin'),
        action: () => save({ isPinned: !task.isPinned }),
      },
      {
        id: 'flag',
        label: task.isImportant ? t('duo.menu.unflag') : t('duo.menu.flag'),
        action: () => save({ isImportant: !task.isImportant }),
      },
      { type: 'separator' },
      {
        id: 'today',
        label: t('duo.menu.dueToday'),
        action: () => save({ dueDate: today }),
      },
      {
        id: 'tomorrow',
        label: t('duo.menu.dueTomorrow'),
        action: () => save({ dueDate: tomorrowOf(today) }),
      },
      {
        id: 'no-date',
        label: t('duo.menu.removeDate'),
        disabled: task.dueDate === null,
        action: () => save({ dueDate: null }),
      },
      { type: 'separator' },
      {
        id: 'delete',
        label: t('tasks.delete'),
        action: () => deleteTask.mutate(task.id),
      },
    ])
  }

  const finishRename = () => {
    setRenaming(false)
    if (title.trim() !== '' && title !== task.title) save({ title })
    else setTitle(task.title)
  }

  return (
    <div
      onContextMenu={openMenu}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/5"
    >
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
          onKeyDown={e => e.key === 'Enter' && finishRename()}
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
      {task.isPinned && <PinIcon className="size-3 text-muted-foreground" />}
      {task.dueDate !== null && task.dueDate !== day && (
        <span className="rounded bg-foreground/10 px-1.5 text-[11px] text-muted-foreground">
          {task.dueDate === today ? t('tasks.today') : dateLabel(task.dueDate)}
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
  )
}
