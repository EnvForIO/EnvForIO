/**
 * Conference deadlines: the only place the frontend calls their commands.
 * The list lives under ['tasks', ...] like projects, so deleting a project
 * (a task write) also refreshes which editions have one.
 *
 * ccfddl's list (about 700 KB) is downloaded when the new-project dialog
 * needs it: never downloaded, or older than a week. It has no page of
 * its own.
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'

const KEY = ['tasks', 'conferences'] as const
const STALE_AFTER = 7 * 24 * 3_600_000 // ms

export const useConferences = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => unwrapResult(await commands.listConferences()),
  })

export function useRefreshConferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrapResult(await commands.refreshConferences()),
    onSuccess: list => queryClient.setQueryData(KEY, list),
  })
}

/**
 * The list, downloaded first when it is missing or a week old. `enabled`
 * false (the dialog is on another template) downloads nothing.
 */
export function useFreshConferences(enabled: boolean) {
  const list = useConferences()
  const refresh = useRefreshConferences()
  const loaded = list.isSuccess
  const fetchedAt = list.data?.fetchedAt ?? null
  const { mutate, isIdle } = refresh
  useEffect(() => {
    const stale =
      fetchedAt === null ||
      Date.now() - new Date(fetchedAt).getTime() > STALE_AFTER
    // Once per mount: a failed download is not retried in a loop.
    if (enabled && loaded && stale && isIdle) mutate()
  }, [enabled, loaded, fetchedAt, isIdle, mutate])
  return { list, refresh }
}
