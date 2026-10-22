/**
 * Statistics. The key lives under ['tasks', ...] so finishing a task or
 * stopping the timer refreshes it.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult, type Period } from '@/lib/tauri-bindings'

export function useStats(period: Period, offset: number) {
  return useQuery({
    queryKey: ['tasks', 'stats', period, offset] as const,
    queryFn: async () => unwrapResult(await commands.getStats(period, offset)),
  })
}
