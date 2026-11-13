/**
 * Task rows that can be dragged into a new order (user request
 * 2026-11-20), like Microsoft To Do: a line shows where the task will
 * land, and the new order shows at once while it is saved. Used by the
 * built-in lists (not the date-sorted Tasks filters) and project modules.
 *
 * Subtasks sit under their parent (`nest`), indented, and move with it;
 * the parent's chevron folds them. Only the top level is dragged.
 */
import { useState } from 'react'
import { useReorderTasks } from '@/api/tasks'
import type { Task, TaskView } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { nest } from './nest'
import { TaskRow } from './TaskRow'

const DRAG_TYPE = 'application/x-envio-reorder'

interface Target {
  id: number
  after: boolean // land below this row rather than above it
}

export function SortableTasks({
  tasks,
  view,
  sortable = true,
}: {
  tasks: Task[]
  view: TaskView
  sortable?: boolean
}) {
  const reorder = useReorderTasks()
  const [dragged, setDragged] = useState<number | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const [folded, setFolded] = useState<ReadonlySet<number>>(new Set())
  const groups = nest(tasks)
  // The order just dropped, shown until the list comes back from Rust.
  const signature = groups.map(g => `${g.task.id}:${g.task.sortOrder}`).join()
  const [pending, setPending] = useState<{ of: string; ids: number[] } | null>(
    null
  )
  const byId = new Map(groups.map(g => [g.task.id, g]))
  const shown =
    pending?.of === signature
      ? pending.ids.flatMap(id => byId.get(id) ?? [])
      : groups

  const finish = () => {
    setDragged(null)
    setTarget(null)
  }

  const drop = () => {
    if (dragged === null || target === null || dragged === target.id) {
      return finish()
    }
    const rest = shown.map(g => g.task.id).filter(id => id !== dragged)
    const at = rest.indexOf(target.id) + (target.after ? 1 : 0)
    const ids = [...rest.slice(0, at), dragged, ...rest.slice(at)]
    setPending({ of: signature, ids })
    reorder.mutate(ids)
    finish()
  }

  const toggle = (id: number) => {
    const next = new Set(folded)
    if (!next.delete(id)) next.add(id)
    setFolded(next)
  }

  return shown.map(({ task, subtasks }) => (
    <div
      key={task.id}
      draggable={sortable}
      onDragStart={e => {
        e.dataTransfer.setData(DRAG_TYPE, String(task.id))
        e.dataTransfer.effectAllowed = 'move'
        setDragged(task.id)
      }}
      onDragEnd={finish}
      onDragOver={e => {
        if (dragged === null || !e.dataTransfer.types.includes(DRAG_TYPE)) {
          return
        }
        e.preventDefault()
        const box = e.currentTarget.getBoundingClientRect()
        const after = e.clientY > box.top + box.height / 2
        if (target?.id !== task.id || target.after !== after) {
          setTarget({ id: task.id, after })
        }
      }}
      onDrop={e => {
        e.preventDefault()
        drop()
      }}
      className={cn(
        'relative flex flex-col gap-1',
        dragged === task.id && 'opacity-40'
      )}
    >
      {target?.id === task.id && dragged !== task.id && (
        <span
          className={cn(
            'pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary',
            target.after ? '-bottom-[3px]' : '-top-[3px]'
          )}
        />
      )}
      <TaskRow
        task={task}
        view={view}
        folded={subtasks.length > 0 ? folded.has(task.id) : undefined}
        onToggleFold={() => toggle(task.id)}
      />
      {subtasks.length > 0 && !folded.has(task.id) && (
        <div className="ms-7 flex flex-col gap-1">
          {subtasks.map(subtask => (
            <TaskRow key={subtask.id} task={subtask} view={view} nested />
          ))}
        </div>
      )}
    </div>
  ))
}
