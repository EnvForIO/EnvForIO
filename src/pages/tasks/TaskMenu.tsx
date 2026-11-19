/**
 * A task's right-click menu in lists, project modules and the board (user
 * request 2026-11-21: tasks could not be deleted with a right-click):
 * open it, My Day, important, pin, done, and delete with Undo.
 */
import { useTranslation } from 'react-i18next'
import {
  CircleCheckIcon,
  CircleIcon,
  PanelRightOpenIcon,
  PinIcon,
  PinOffIcon,
  StarIcon,
  StarOffIcon,
  SunIcon,
  SunMediumIcon,
  Trash2Icon,
} from 'lucide-react'
import { toUpdate, useSetTaskDone, useToday, useUpdateTask } from '@/api/tasks'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'
import { useDeleteWithUndo } from './useDeleteWithUndo'

export function TaskMenu({
  task,
  children,
}: {
  task: Task
  children: React.ReactNode // the row; it becomes the trigger
}) {
  const { t } = useTranslation()
  const today = useToday()
  const selectTask = useUIStore(state => state.selectTask)
  const updateTask = useUpdateTask()
  const setDone = useSetTaskDone()
  const deleteWithUndo = useDeleteWithUndo()

  const done = task.doneAt !== null
  const inMyDay = today !== undefined && task.scheduledDate === today
  const save = (change: Partial<TaskUpdate>) =>
    updateTask.mutate({ id: task.id, update: { ...toUpdate(task), ...change } })

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => selectTask(task.id)}>
          <PanelRightOpenIcon />
          {t('tasks.menu.open')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {today && (
          <ContextMenuItem
            onSelect={() => save({ scheduledDate: inMyDay ? null : today })}
          >
            {inMyDay ? <SunMediumIcon /> : <SunIcon />}
            {inMyDay ? t('tasks.removeFromMyDay') : t('tasks.addToMyDay')}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onSelect={() => save({ isImportant: !task.isImportant })}
        >
          {task.isImportant ? <StarOffIcon /> : <StarIcon />}
          {task.isImportant
            ? t('tasks.unmarkImportant')
            : t('tasks.markImportant')}
        </ContextMenuItem>
        {/* A subtask keeps its place under its parent, so it has no pin. */}
        {task.parentId === null && (
          <ContextMenuItem onSelect={() => save({ isPinned: !task.isPinned })}>
            {task.isPinned ? <PinOffIcon /> : <PinIcon />}
            {task.isPinned ? t('tasks.unpin') : t('tasks.pin')}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onSelect={() => setDone.mutate({ id: task.id, done: !done })}
        >
          {done ? <CircleIcon /> : <CircleCheckIcon />}
          {done ? t('tasks.markOpen') : t('tasks.markDone')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() => deleteWithUndo(task)}
        >
          <Trash2Icon />
          {task.subtaskCount > 0
            ? t('tasks.menu.deleteWithSubtasks', { count: task.subtaskCount })
            : t('tasks.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
