/**
 * The RSS reader: the only place the frontend calls the feed commands.
 * Rust refreshes the feeds on start and every three hours and says so with
 * `feeds-changed`; `useFeedSync` listens. "Add to todos" is a task write,
 * so it goes through the task mutation (refreshing every task list).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useInvalidateOn } from '@/hooks/useInvalidateOn'
import { commands, unwrapResult } from '@/lib/tauri-bindings'
import { useInvalidatingMutation } from './mutation'
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

export const useFeedSync = () => useInvalidateOn('feeds-changed', KEY)

export const useAddFeed = () =>
  useInvalidatingMutation([KEY], async (url: string) =>
    unwrapResult(await commands.addFeed(url))
  )

export const useRemoveFeed = () =>
  useInvalidatingMutation([KEY], async (id: number) =>
    unwrapResult(await commands.removeFeed(id))
  )

export const useRefreshFeeds = () =>
  useInvalidatingMutation([KEY], async () =>
    unwrapResult(await commands.refreshFeeds())
  )

export const useSetFeedItemRead = () =>
  useInvalidatingMutation(
    [KEY],
    async ({ id, read }: { id: number; read: boolean }) =>
      unwrapResult(await commands.setFeedItemRead(id, read))
  )

export const useMarkFeedRead = () =>
  useInvalidatingMutation([KEY], async (feedId: number | null) =>
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
