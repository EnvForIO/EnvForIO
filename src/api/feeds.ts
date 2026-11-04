/**
 * The RSS reader: the only place the frontend calls the feed commands.
 * Rust refreshes the feeds on start and every three hours and says so with
 * `feeds-changed`; `useFeedSync` listens. "Add to todos" is a task write,
 * so it goes through the task mutation (refreshing every task list).
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

const KEY = ['feeds'] as const

export const useFeeds = () =>
  useQuery({
    queryKey: [...KEY, 'list'],
    queryFn: async () => unwrapResult(await commands.listFeeds()),
  })

export const useFeedItems = (feedId: number | null, unreadOnly: boolean) =>
  useQuery({
    queryKey: [...KEY, 'items', feedId, unreadOnly],
    queryFn: async () =>
      unwrapResult(await commands.listFeedItems(feedId, unreadOnly)),
  })

export function useFeedSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const unlisten = listen('feeds-changed', () => {
      void queryClient.invalidateQueries({ queryKey: KEY })
    })
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [queryClient])
}

function useFeedMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}

export const useAddFeed = () =>
  useFeedMutation(async (url: string) =>
    unwrapResult(await commands.addFeed(url))
  )

export const useRemoveFeed = () =>
  useFeedMutation(async (id: number) =>
    unwrapResult(await commands.removeFeed(id))
  )

export const useRefreshFeeds = () =>
  useFeedMutation(async () => unwrapResult(await commands.refreshFeeds()))

export const useSetFeedItemRead = () =>
  useFeedMutation(async ({ id, read }: { id: number; read: boolean }) =>
    unwrapResult(await commands.setFeedItemRead(id, read))
  )

export const useMarkFeedRead = () =>
  useFeedMutation(async (feedId: number | null) =>
    unwrapResult(await commands.markFeedRead(feedId))
  )

export function useAddFeedItemToTodos() {
  const queryClient = useQueryClient()
  return useTaskMutation(async (id: number) => {
    const item = unwrapResult(await commands.addFeedItemToTodos(id))
    await queryClient.invalidateQueries({ queryKey: KEY })
    return item
  })
}
