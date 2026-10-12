/**
 * Tasks: the only place the frontend calls the task commands.
 *
 * Reads are TanStack Query hooks; writes are mutations that refetch every
 * task list afterwards, because one change (a star, a due date) can move a
 * task in or out of several lists at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })
}

export const useCreateTask = () =>
  useTaskMutation(async ({ title, view }: { title: string; view: TaskView }) =>
    unwrapResult(await commands.createTask(title, view))
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
