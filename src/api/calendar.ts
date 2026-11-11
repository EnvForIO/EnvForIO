/**
 * Calendar: scheduled tasks, the "to schedule" list, day notes and per-day
 * available time. Keys live under ['tasks', ...] so task writes refresh them.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

export const calendarKeys = {
  tasks: (from: string, to: string) => ['tasks', 'calendar', from, to] as const,
  unscheduled: ['tasks', 'calendar', 'unscheduled'] as const,
  notes: (from: string, to: string) => ['tasks', 'notes', from, to] as const,
  overrides: (from: string, to: string) =>
    ['tasks', 'overrides', from, to] as const,
}

export function useCalendarTasks(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.tasks(from, to),
    queryFn: async () =>
      unwrapResult(await commands.listCalendarTasks(from, to)),
  })
}

export function useUnscheduledTasks() {
  return useQuery({
    queryKey: calendarKeys.unscheduled,
    queryFn: async () => unwrapResult(await commands.listUnscheduledTasks()),
  })
}

export function useDayNotes(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.notes(from, to),
    queryFn: async () => unwrapResult(await commands.listDayNotes(from, to)),
  })
}

export function useDayOverrides(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.overrides(from, to),
    queryFn: async () =>
      unwrapResult(await commands.listDayOverrides(from, to)),
  })
}

export const useScheduleTask = () =>
  useTaskMutation(async ({ id, date }: { id: number; date: string | null }) =>
    unwrapResult(await commands.scheduleTask(id, date))
  )

export const useSetDayNote = () =>
  useTaskMutation(async ({ date, text }: { date: string; text: string }) =>
    unwrapResult(await commands.setDayNote(date, text))
  )

/** minutes null = back to the weekday's usual time. */
export const useSetDayOverride = () =>
  useTaskMutation(
    async ({ date, minutes }: { date: string; minutes: number | null }) =>
      unwrapResult(await commands.setDayOverride(date, minutes))
  )
