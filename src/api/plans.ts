/**
 * Planning: today's safety line, check-ins, the load forecast, project
 * health, available time and planning settings. Keys live under
 * ['tasks', ...] so any task or project change recomputes them.
 */
import { useQuery } from '@tanstack/react-query'
import {
  commands,
  unwrapResult,
  type PlanningSettings,
} from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

export const planKeys = {
  todayLine: ['tasks', 'plans', 'today-line'] as const,
  checkIns: ['tasks', 'plans', 'check-ins'] as const,
  forecast: ['tasks', 'plans', 'forecast'] as const,
  health: ['tasks', 'plans', 'health'] as const,
  week: ['tasks', 'plans', 'week-capacity'] as const,
  settings: ['tasks', 'plans', 'settings'] as const,
}

export function useTodayLine() {
  return useQuery({
    queryKey: planKeys.todayLine,
    queryFn: async () => unwrapResult(await commands.getTodayLine()),
  })
}

export function useCheckIns() {
  return useQuery({
    queryKey: planKeys.checkIns,
    queryFn: async () => unwrapResult(await commands.getCheckIns()),
  })
}

export function useLoadForecast() {
  return useQuery({
    queryKey: planKeys.forecast,
    queryFn: async () => unwrapResult(await commands.getLoadForecast()),
  })
}

export function useProjectHealth() {
  return useQuery({
    queryKey: planKeys.health,
    queryFn: async () => unwrapResult(await commands.getProjectHealth()),
  })
}

/** Minutes per weekday, Monday first; null = no limit. */
export function useWeekCapacity() {
  return useQuery({
    queryKey: planKeys.week,
    queryFn: async () => unwrapResult(await commands.getWeekCapacity()),
  })
}

export function usePlanningSettings() {
  return useQuery({
    queryKey: planKeys.settings,
    queryFn: async () => unwrapResult(await commands.getPlanningSettings()),
  })
}

export const useSetWeekdayCapacity = () =>
  useTaskMutation(
    async ({ weekday, minutes }: { weekday: number; minutes: number | null }) =>
      unwrapResult(await commands.setWeekdayCapacity(weekday, minutes))
  )

/** Also refreshes "today" everywhere, since the day start may have moved. */
export const useSavePlanningSettings = () =>
  useTaskMutation(async (settings: PlanningSettings) =>
    unwrapResult(await commands.savePlanningSettings(settings))
  )
