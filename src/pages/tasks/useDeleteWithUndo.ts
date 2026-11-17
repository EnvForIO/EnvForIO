/**
 * Deleting a task the way every place does it: close it if it is open in
 * the details pane, delete it (and its subtasks), and offer Undo in a toast.
 */
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDeleteTask, useUndo } from '@/api/tasks'
import type { Task } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'

export function useDeleteWithUndo() {
  const { t } = useTranslation()
  const deleteTask = useDeleteTask()
  const undo = useUndo()
  return (task: Task) => {
    const { selectedTaskId, selectTask } = useUIStore.getState()
    if (selectedTaskId === task.id) selectTask(null)
    deleteTask.mutate(task.id, {
      onSuccess: () =>
        toast(t('undo.deleted', { title: task.title }), {
          action: {
            label: t('undo.undo'),
            onClick: () => undo.mutate(undefined),
          },
        }),
    })
  }
}
