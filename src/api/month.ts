/**
 * The Todo Duo card's Month tab: each day's deadlines, scheduled time and
 * available time. Under ['tasks'] so every task change (in any window) and
 * following or unfollowing a conference refreshes it.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'

export const monthKey = ['tasks', 'month'] as const

export const useMonthMarks = (from: string, to: string) =>
  useQuery({
    queryKey: [...monthKey, from, to],
    queryFn: async () => unwrapResult(await commands.monthMarks(from, to)),
  })
