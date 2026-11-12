/**
 * Tasks: the only place the frontend calls the task commands.
 *
 * Reads are TanStack Query hooks; writes are mutations that refetch every
 * task list afterwards, because one change (a star, a due date) can move a
 * task in or out of several lists at once.
 *
 * Every window (main, Todo Duo capsule and card) has its own query cache, so
 * a write also broadcasts `tasks-changed` and `useTaskSync` in each window
 * refetches on it.
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { emit, listen } from '@tauri-apps/api/event'
import {
  commands,
  unwrapResult,
  type ItemStatus,
  type Task,
  type TaskUpdate,
  type TaskStage,
  type TaskView,
} from '@/lib/tauri-bindings'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (view: TaskView) => ['tasks', 'list', view] as const,
  steps: (taskId: number) => ['tasks', 'steps', taskId] as const,
  today: ['tasks', 'today'] as const,
  day: (date: string) => ['tasks', 'day', date] as const,
  completion: (from: string, to: string) =>
    ['tasks', 'completion', from, to] as const,
}

export const TASKS_CHANGED = 'tasks-changed'

/** Refetch tasks when another window changes them. Call once per window. */
export function useTaskSync(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    const unlisten = listen(TASKS_CHANGED, () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
    })
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [queryClient])
}

/** Today as Rust counts it (the day starts at 07:00), 'YYYY-MM-DD'. */
export function useToday(): string | undefined {
  return useQuery({
    queryKey: taskKeys.today,
    queryFn: () => commands.getToday(),
    staleTime: 60_000, // re-ask every minute so the 07:00 rollover is picked up
  }).data
}

export function useTasks(view: TaskView, enabled = true) {
  return useQuery({
    queryKey: taskKeys.list(view),
    queryFn: async () => unwrapResult(await commands.listTasks(view)),
    enabled,
  })
}

/** The Tasks page's filters: status, and project (null = any, 0 = outside projects). */
export function useFilteredTasks(
  status: ItemStatus,
  project: number | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['tasks', 'filtered', status, project] as const,
    queryFn: async () =>
      unwrapResult(await commands.listItems(status, project)),
    enabled,
  })
}

/** One task by id (the details pane); disabled while nothing is selected. */
export function useTask(id: number | null) {
  return useQuery({
    queryKey: ['tasks', 'one', id ?? -1] as const,
    queryFn: async () => unwrapResult(await commands.getTask(id ?? -1)),
    enabled: id !== null,
  })
}

export function useTaskSteps(taskId: number | null) {
  return useQuery({
    queryKey: taskKeys.steps(taskId ?? -1),
    queryFn: async () =>
      unwrapResult(await commands.listTaskSteps(taskId ?? -1)),
    enabled: taskId !== null,
  })
}

/** Tasks on one day: planned for it or due on it (the Todo Duo card). */
export function useDayTasks(date: string | undefined) {
  return useQuery({
    queryKey: taskKeys.day(date ?? ''),
    queryFn: async () => unwrapResult(await commands.listDayTasks(date ?? '')),
    enabled: date !== undefined,
  })
}

/** Done / total per day for the heatmap; days without tasks are missing. */
export function useDayCompletion(from: string, to: string) {
  return useQuery({
    queryKey: taskKeys.completion(from, to),
    queryFn: async () =>
      unwrapResult(await commands.getDayCompletion(from, to)),
  })
}

/** The editable fields of a task, ready to change and send back to `useUpdateTask`. */
export function toUpdate(task: Task): TaskUpdate {
  return {
    title: task.title,
    note: task.note,
    isImportant: task.isImportant,
    isPinned: task.isPinned,
    scheduledDate: task.scheduledDate,
    dueDate: task.dueDate,
    // Whole minutes are a valid typed estimate, so they round-trip unchanged.
    estimate:
      task.estimateMinutes === null ? null : String(task.estimateMinutes),
  }
}

// ---------------------------------------------------------------------------
// Writes

/** A write that refetches every task-derived query here and in other windows. */
export function useTaskMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      // An idea's todos are tasks: its list and counts change too.
      await queryClient.invalidateQueries({ queryKey: ['ideas'] })
      await emit(TASKS_CHANGED)
    },
  })
}

export const useCreateTask = () =>
  useTaskMutation(async ({ title, view }: { title: string; view: TaskView }) =>
    unwrapResult(await commands.createTask(title, view))
  )

/** A new task planned for `date` (the Todo Duo card, the calendar's day dialog). */
export const useCreateDayTask = () =>
  useTaskMutation(async ({ title, date }: { title: string; date: string }) =>
    unwrapResult(await commands.createDayTask(title, date))
  )

export const useUpdateTask = () =>
  useTaskMutation(async ({ id, update }: { id: number; update: TaskUpdate }) =>
    unwrapResult(await commands.updateTask(id, update))
  )

/** A list's tasks in their new, dragged order. */
export const useReorderTasks = () =>
  useTaskMutation(async (ids: number[]) =>
    unwrapResult(await commands.reorderTasks(ids))
  )

export const useSetTaskStage = () =>
  useTaskMutation(async ({ id, stage }: { id: number; stage: TaskStage }) =>
    unwrapResult(await commands.setTaskStage(id, stage))
  )

export const useSetTaskDone = () =>
  useTaskMutation(async ({ id, done }: { id: number; done: boolean }) =>
    unwrapResult(await commands.setTaskDone(id, done))
  )

export const useDeleteTask = () =>
  useTaskMutation(async (id: number) =>
    unwrapResult(await commands.deleteTask(id))
  )

export const useAddTaskStep = () =>
  useTaskMutation(
    async ({ taskId, title }: { taskId: number; title: string }) =>
      unwrapResult(await commands.addTaskStep(taskId, title))
  )

export const useSetTaskStepDone = () =>
  useTaskMutation(async ({ id, done }: { id: number; done: boolean }) =>
    unwrapResult(await commands.setTaskStepDone(id, done))
  )

export const useDeleteTaskStep = () =>
  useTaskMutation(async (id: number) =>
    unwrapResult(await commands.deleteTaskStep(id))
  )

/** Undo the last task change; resolves to what was undone (e.g. "Delete task"). */
export const useUndo = () =>
  useTaskMutation(async () => unwrapResult(await commands.undo()))
