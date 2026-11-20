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
        'flex w-full items-center gap-1 truncate rounded-[4px] px-1.5 py-0.5 text-start text-xs hover:brightness-95',
        done && 'text-muted-foreground line-through opacity-70'
      )}
      // A soft tint of the project's colour; tasks outside projects take
      // the ink tint.
      style={{
        background: color
          ? `color-mix(in oklab, ${color} 16%, var(--background))`
          : 'var(--selected)',
      }}
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
