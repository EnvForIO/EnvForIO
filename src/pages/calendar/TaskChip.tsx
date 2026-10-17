/**
 * A task on the calendar or in "To schedule": drag it onto a day to
 * schedule it, click it to open the details pane.
 */
import { CalendarIcon } from 'lucide-react'
import type { Task } from '@/lib/tauri-bindings'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

export const TASK_DRAG_TYPE = 'application/x-envio-task'

interface Props {
  task: Task
  color: string | undefined // the project's colour, if any
  dueMarker?: boolean // shown on its due day rather than a scheduled day
}

export function TaskChip({ task, color, dueMarker }: Props) {
  const selectTask = useUIStore(state => state.selectTask)
  const done = task.doneAt !== null

  return (
    <button
      type="button"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={e => {
        e.stopPropagation()
        selectTask(task.id)
      }}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-xs hover:bg-accent',
        done && 'text-muted-foreground line-through'
      )}
      style={{ borderLeft: `3px solid ${color ?? 'var(--border)'}` }}
    >
      {dueMarker && (
        <CalendarIcon className="size-3 shrink-0 text-destructive" />
      )}
      <span className="truncate">{task.title}</span>
      {task.estimateMinutes !== null && (
        <span className="ml-auto shrink-0 text-muted-foreground">
          {formatMinutes(task.estimateMinutes)}
        </span>
      )}
    </button>
  )
}
