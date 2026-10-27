/**
 * Machine monitoring. Rust samples once a second while some window
 * watches; useMonitorFeed watches while its window is visible and feeds
 * the samples into the monitor store.
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { commands, type Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'

/** Emitted by `desktop::monitor` in Rust. */
const SAMPLE_EVENT = 'monitor-sample'

export const useMachineInfo = () =>
  useQuery({
    queryKey: ['monitor', 'info'] as const,
    queryFn: () => commands.monitorInfo(),
    staleTime: Infinity, // the machine does not change while EnvIO runs
  })

/** Watch the machine while this component is mounted and its window is visible. */
export function useMonitorFeed() {
  useEffect(() => {
    const { push } = useMonitorStore.getState()
    const watch = () =>
      void commands.monitorWatch(document.visibilityState === 'visible')
    void commands.monitorLatest().then(sample => sample && push(sample))
    const stop = listen<Sample>(SAMPLE_EVENT, event => push(event.payload))
    watch()
    document.addEventListener('visibilitychange', watch)
    return () => {
      document.removeEventListener('visibilitychange', watch)
      void commands.monitorWatch(false)
      void stop.then(unlisten => unlisten())
    }
  }, [])
}
