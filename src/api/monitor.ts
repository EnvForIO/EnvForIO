/**
 * Machine monitoring. Rust samples the watched machine (this PC, a WSL
 * distribution or an SSH host) once a second while some window watches;
 * useMonitorFeed watches while its window is visible and feeds the
 * samples into the monitor store.
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { commands, type MonitorTarget, type Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'

/** Emitted by `desktop::monitor` in Rust. */
const SAMPLE_EVENT = 'monitor-sample'

const keys = {
  all: ['monitor'] as const,
  info: ['monitor', 'info'] as const,
  target: ['monitor', 'target'] as const,
  targets: ['monitor', 'targets'] as const,
}

/** What the watched machine is. A remote one is known only once it answers. */
export const useMachineInfo = () =>
  useQuery({
    queryKey: keys.info,
    queryFn: () => commands.monitorInfo(),
    staleTime: Infinity,
    refetchInterval: query => (query.state.data?.os ? false : 2000),
  })

export const useMonitorTarget = () =>
  useQuery({ queryKey: keys.target, queryFn: () => commands.monitorTarget() })

/** This PC, running WSL distributions, SSH config hosts; re-read on open. */
export const useMonitorTargets = () =>
  useQuery({
    queryKey: keys.targets,
    queryFn: () => commands.monitorTargets(),
    staleTime: 30_000,
  })

export function useSetMonitorTarget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (target: MonitorTarget) => commands.monitorSetTarget(target),
    onSuccess: () => {
      useMonitorStore.getState().clear()
      void queryClient.invalidateQueries({ queryKey: keys.all })
    },
  })
}

/** A stable string for a target, for select values and React keys. */
export const targetId = (t: MonitorTarget) =>
  t.kind === 'local'
    ? 'local'
    : t.kind === 'wsl'
      ? `wsl:${t.distro}`
      : `ssh:${t.host}`

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
