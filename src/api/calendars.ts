/**
 * External calendars (read-only ICS subscriptions): the only place the
 * frontend calls their commands. Rust refreshes them on start and every
 * hour and says so with `calendars-changed`; `useCalendarSync` listens.
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { commands, unwrapResult } from '@/lib/tauri-bindings'

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
export function useCalendarSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const unlisten = listen('calendars-changed', () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
    })
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [queryClient])
}

function useCalendarMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export const useAddCalendar = () =>
  useCalendarMutation(async (a: { name: string; url: string; color: string }) =>
    unwrapResult(await commands.addCalendar(a.name, a.url, a.color))
  )

export const useUpdateCalendar = () =>
  useCalendarMutation(
    async (a: { id: number; name: string; color: string; visible: boolean }) =>
      unwrapResult(
        await commands.updateCalendar(a.id, a.name, a.color, a.visible)
      )
  )

export const useRemoveCalendar = () =>
  useCalendarMutation(async (id: number) =>
    unwrapResult(await commands.removeCalendar(id))
  )

export const useRefreshCalendars = () =>
  useCalendarMutation(async () =>
    unwrapResult(await commands.refreshCalendars())
  )
