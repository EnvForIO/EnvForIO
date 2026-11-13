/**
 * Subtasks in a list (user decision 2026-11-21): each one goes under its
 * parent when the parent is in the same list, and stands on its own, with
 * its parent's title, when it is not (a subtask planned for today in My
 * Day). Lists keep their own order for the top level.
 */
import type { Task } from '@/lib/tauri-bindings'

export interface TaskGroup {
  task: Task
  subtasks: Task[] // open first, then in their order
}

const bySubtaskOrder = (a: Task, b: Task) =>
  Number(a.doneAt !== null) - Number(b.doneAt !== null) ||
  a.sortOrder - b.sortOrder ||
  a.id - b.id

export function nest(tasks: Task[]): TaskGroup[] {
  const listed = new Set(tasks.map(t => t.id))
  const under = (t: Task) => t.parentId !== null && listed.has(t.parentId)
  const subtasks = new Map<number, Task[]>()
  for (const t of tasks) {
    if (t.parentId !== null && under(t)) {
      subtasks.set(t.parentId, [...(subtasks.get(t.parentId) ?? []), t])
    }
  }
  return tasks
    .filter(t => !under(t))
    .map(task => ({
      task,
      subtasks: (subtasks.get(task.id) ?? []).sort(bySubtaskOrder),
    }))
}

/** A group's time: the parent's estimate or its subtasks' total, whichever
 * is larger (the parent is a budget for them), as project totals count it. */
export function groupMinutes({ task, subtasks }: TaskGroup): number {
  const ofSubtasks = subtasks.reduce((s, t) => s + (t.estimateMinutes ?? 0), 0)
  return Math.max(task.estimateMinutes ?? 0, ofSubtasks)
}

/** The groups back into one list, each parent followed by its subtasks. */
export const flatten = (groups: TaskGroup[]): Task[] =>
  groups.flatMap(g => [g.task, ...g.subtasks])
