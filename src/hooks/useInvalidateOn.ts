/**
 * Refetches the queries under `queryKey` whenever Rust emits `event` (its
 * background refreshes: `calendars-changed`, `feeds-changed`).
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'

export function useInvalidateOn(event: string, queryKey: readonly unknown[]) {
  const queryClient = useQueryClient()
  useEffect(() => {
    const unlisten = listen(event, () => {
      void queryClient.invalidateQueries({ queryKey })
    })
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [queryClient, event, queryKey])
}
