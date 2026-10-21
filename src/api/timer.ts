/**
 * The task timer and partial completion. Keys live under ['tasks', ...]:
 * stopping a timer changes a task's actual time.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

export const timerKeys = { running: ['tasks', 'timer'] as const }

export function useRunningTimer() {
  return useQuery({
    queryKey: timerKeys.running,
    queryFn: async () => unwrapResult(await commands.getRunningTimer()),
  })
}

export const useStartTimer = () =>
  useTaskMutation(async (taskId: number) =>
    unwrapResult(await commands.startTimer(taskId))
  )

export const useStopTimer = () =>
  useTaskMutation(async () => unwrapResult(await commands.stopTimer()))

/** `done` is typed like an estimate ("45m"); resolves to the new task with the rest. */
export const useCompletePartially = () =>
  useTaskMutation(async ({ id, done }: { id: number; done: string }) =>
    unwrapResult(await commands.completeTaskPartially(id, done))
  )
