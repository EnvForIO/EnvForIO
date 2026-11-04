/**
 * External calendars (read-only ICS subscriptions): the only place the
 * frontend calls their commands. Rust refreshes them on start and every
 * hour and says so with `calendars-changed`; `useCalendarSync` listens.
 */
import { useQuery } from '@tanstack/react-query'
import { useInvalidateOn } from '@/hooks/useInvalidateOn'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useInvalidatingMutation } from './mutation'

const KEY = ['calendars'] as const

export const useCalendars = () =>
  useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: async () => unwrapResult(await commands.listCalendars()),
  })

export const useCalendarEvents = (fromMs: number, toMs: number) =>
  useQuery({
    queryKey: [...KEY, 'events', fromMs, toMs],
    queryFn: async () =>
      unwrapResult(await commands.listCalendarEvents(fromMs, toMs)),
  })

/** Refetches calendars and events when Rust has refreshed them. */
export const useCalendarSync = () => useInvalidateOn('calendars-changed', KEY)

export const useAddCalendar = () =>
  useInvalidatingMutation(
    [KEY],
    async (a: { name: string; url: string; color: string }) =>
      unwrapResult(await commands.addCalendar(a.name, a.url, a.color))
  )

export const useUpdateCalendar = () =>
  useInvalidatingMutation(
    [KEY],
    async (a: { id: number; name: string; color: string; visible: boolean }) =>
      unwrapResult(
        await commands.updateCalendar(a.id, a.name, a.color, a.visible)
      )
  )

export const useRemoveCalendar = () =>
  useInvalidatingMutation([KEY], async (id: number) =>
    unwrapResult(await commands.removeCalendar(id))
  )

export const useRefreshCalendars = () =>
  useInvalidatingMutation([KEY], async () =>
    unwrapResult(await commands.refreshCalendars())
  )
