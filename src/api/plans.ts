/**
 * Planning: today's safety line and available time. Keys live under
 * ['tasks', ...] so any task or project change recomputes the line.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

export const planKeys = {
  todayLine: ['tasks', 'plans', 'today-line'] as const,
  week: ['tasks', 'plans', 'week-capacity'] as const,
}

export function useTodayLine() {
  return useQuery({
    queryKey: planKeys.todayLine,
    queryFn: async () => unwrapResult(await commands.getTodayLine()),
  })
}

/** Minutes per weekday, Monday first; null = no limit. */
export function useWeekCapacity() {
  return useQuery({
    queryKey: planKeys.week,
    queryFn: async () => unwrapResult(await commands.getWeekCapacity()),
  })
}

export const useSetWeekdayCapacity = () =>
  useTaskMutation(
    async ({ weekday, minutes }: { weekday: number; minutes: number | null }) =>
      unwrapResult(await commands.setWeekdayCapacity(weekday, minutes))
  )
