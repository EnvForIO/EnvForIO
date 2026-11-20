/**
 * Task rows that can be dragged into a new order (user request
 * 2026-11-20), like Microsoft To Do: a line shows where the task will
 * land, and the new order shows at once while it is saved. Used by the
 * built-in lists (not the date-sorted Tasks filters) and project modules.
 *
 * Subtasks sit under their parent (`nest`), indented; the parent's chevron
 * folds them. A task drags with its subtasks; a subtask drags among its
 * parent's subtasks only (user report 2026-11-21: it carried the whole
 * task with it).
 */
import { useState } from 'react'
import { useReorderTasks } from '@/api/tasks'
import type { Task, TaskView } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { nest } from './nest'
import { TaskRow } from './TaskRow'

interface Target {
  id: number
  after: boolean // land below this row rather than above it
}

/**
 * Drag to reorder one list of items. `scope` keeps lists apart: a row
 * only lands in the list it was picked up from, so a subtask cannot be
 * dropped among top-level tasks or another task's subtasks.
 */
function useDragOrder<T>(
  scope: string,
  items: T[],
  key: (item: T) => { id: number; sortOrder: number },
  enabled: boolean
) {
  const reorder = useReorderTasks()
  const type = `application/x-envforio-reorder-${scope}`
  const [dragged, setDragged] = useState<number | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  // The order just dropped, shown until the list comes back from Rust.
  const signature = items
    .map(item => `${key(item).id}:${key(item).sortOrder}`)
    .join()
  const [pending, setPending] = useState<{ of: string; ids: number[] } | null>(
    null
  )
  const byId = new Map(items.map(item => [key(item).id, item]))
  const shown =
    pending?.of === signature
      ? pending.ids.flatMap(id => byId.get(id) ?? [])
      : items

  const finish = () => {
    setDragged(null)
    setTarget(null)
  }

  const drop = () => {
    if (dragged === null || target === null || dragged === target.id) {
      return finish()
    }
    const rest = shown.map(item => key(item).id).filter(id => id !== dragged)
    const at = rest.indexOf(target.id) + (target.after ? 1 : 0)
    const ids = [...rest.slice(0, at), dragged, ...rest.slice(at)]
    setPending({ of: signature, ids })
    reorder.mutate(ids)
    finish()
  }

  // Each handler stops at the first list that owns the drag, so a subtask
  // row does not also move its parent's group.
  const rowProps = (id: number) => ({
    draggable: enabled,
    onDragStart: (e: React.DragEvent) => {
      e.stopPropagation()
      e.dataTransfer.setData(type, String(id))
      e.dataTransfer.effectAllowed = 'move'
      setDragged(id)
    },
    onDragEnd: (e: React.DragEvent) => {
      e.stopPropagation()
      finish()
    },
    onDragOver: (e: React.DragEvent) => {
      if (dragged === null || !e.dataTransfer.types.includes(type)) return
      e.preventDefault()
      e.stopPropagation()
      const box = e.currentTarget.getBoundingClientRect()
      const after = e.clientY > box.top + box.height / 2
      if (target?.id !== id || target.after !== after) {
        setTarget({ id, after })
      }
    },
    onDrop: (e: React.DragEvent) => {
      if (dragged === null) return
      e.preventDefault()
      e.stopPropagation()
      drop()
    },
  })

  return { shown, dragged, target, rowProps }
}

/** Where a dragged row will land: a line above or below `id`. */
function DropLine({
  target,
  id,
  dragged,
}: {
  target: Target | null
  id: number
  dragged: number | null
}) {
  if (target?.id !== id || dragged === id) return null
  return (
    <span
      className={cn(
        'pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary',
        target.after ? '-bottom-px' : '-top-px'
      )}
    />
  )
}

/** One task's subtasks, reordered among themselves. */
function SubtaskRows({
  parentId,
  subtasks,
  view,
  sortable,
}: {
  parentId: number
  subtasks: Task[]
  view: TaskView
  sortable: boolean
}) {
  const { shown, dragged, target, rowProps } = useDragOrder(
    `sub-${parentId}`,
    subtasks,
    t => t,
    sortable
  )
  return (
    // Indented past the parent's gutter and checkbox, with an ink rule
    // marking them as one group.
    <div className="ms-[3.25rem] flex flex-col border-s-2 border-border ps-1">
      {shown.map(subtask => (
        <div
          key={subtask.id}
          {...rowProps(subtask.id)}
          className={cn('relative', dragged === subtask.id && 'opacity-40')}
        >
          <DropLine target={target} id={subtask.id} dragged={dragged} />
          <TaskRow task={subtask} view={view} nested />
        </div>
      ))}
    </div>
  )
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
  const [folded, setFolded] = useState<ReadonlySet<number>>(new Set())
  const { shown, dragged, target, rowProps } = useDragOrder(
    'top',
    nest(tasks),
    g => g.task,
    sortable
  )

  const toggle = (id: number) => {
    const next = new Set(folded)
    if (!next.delete(id)) next.add(id)
    setFolded(next)
  }

  return shown.map(({ task, subtasks }) => (
    <div
      key={task.id}
      {...rowProps(task.id)}
      className={cn(
        'relative flex flex-col',
        dragged === task.id && 'opacity-40'
      )}
    >
      <DropLine target={target} id={task.id} dragged={dragged} />
      <TaskRow
        task={task}
        view={view}
        folded={subtasks.length > 0 ? folded.has(task.id) : undefined}
        onToggleFold={() => toggle(task.id)}
      />
      {subtasks.length > 0 && !folded.has(task.id) && (
        <SubtaskRows
          parentId={task.id}
          subtasks={subtasks}
          view={view}
          sortable={sortable}
        />
      )}
    </div>
  ))
}
