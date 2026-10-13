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
  type Task,
  type TaskUpdate,
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

const TASKS_CHANGED = 'tasks-changed'

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

export function useTasks(view: TaskView) {
  return useQuery({
    queryKey: taskKeys.list(view),
    queryFn: async () => unwrapResult(await commands.listTasks(view)),
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

/** Tasks for one day: in My Day that day or due that day (the Todo Duo card). */
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
export function toUpdate(task: Task, today: string | undefined): TaskUpdate {
  return {
    title: task.title,
    note: task.note,
    isImportant: task.isImportant,
    isPinned: task.isPinned,
    inMyDay: task.myDayDate !== null && task.myDayDate === today,
    dueDate: task.dueDate,
  }
}

// ---------------------------------------------------------------------------
// Writes

function useTaskMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
      await emit(TASKS_CHANGED)
    },
  })
}

export const useCreateTask = () =>
  useTaskMutation(async ({ title, view }: { title: string; view: TaskView }) =>
    unwrapResult(await commands.createTask(title, view))
  )

export const useCreateDayTask = () =>
  useTaskMutation(async ({ title, date }: { title: string; date: string }) =>
    unwrapResult(await commands.createDayTask(title, date))
  )

export const useUpdateTask = () =>
  useTaskMutation(async ({ id, update }: { id: number; update: TaskUpdate }) =>
    unwrapResult(await commands.updateTask(id, update))
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
