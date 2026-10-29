/**
 * Machine monitoring. The overview lists machines the user added; Rust
 * reads all of them once a second while some window watches and sends a
 * batch, which useMonitorFeed puts in the monitor store.
 */
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { targetId } from '@/components/monitor/machine'
import {
  commands,
  unwrapResult,
  type MachineSample,
  type MonitorTarget,
} from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'

/** Emitted by `desktop::monitor` in Rust. */
const SAMPLES_EVENT = 'monitor-samples'

const keys = {
  machines: ['monitor', 'machines'] as const,
  targets: ['monitor', 'targets'] as const,
  info: (t: MonitorTarget) => ['monitor', 'info', targetId(t)] as const,
}

/** The overview's machines, in order. */
export const useMachines = () =>
  useQuery({
    queryKey: keys.machines,
    queryFn: async () => unwrapResult(await commands.listMachines()),
  })

/** What can be added: This PC, running WSL distributions, SSH config hosts. */
export const useMonitorTargets = (enabled: boolean) =>
  useQuery({
    queryKey: keys.targets,
    queryFn: () => commands.monitorTargets(),
    enabled,
    staleTime: 10_000,
  })

function useMachineChange(
  run: (target: MonitorTarget) => ReturnType<typeof commands.addMachine>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (target: MonitorTarget) =>
      unwrapResult(await run(target)),
    onSuccess: list => queryClient.setQueryData(keys.machines, list),
  })
}

export const useAddMachine = () => useMachineChange(commands.addMachine)
export const useRemoveMachine = () => useMachineChange(commands.removeMachine)

/** What a machine is. A remote one is known only once it answers. */
export const useMachineInfo = (target: MonitorTarget) =>
  useQuery({
    queryKey: keys.info(target),
    queryFn: () => commands.monitorInfo(target),
    staleTime: Infinity,
    refetchInterval: query => (query.state.data?.os ? false : 2000),
  })

/** Watch the machines while this component is mounted and its window is visible. */
export function useMonitorFeed() {
  useEffect(() => {
    const { push } = useMonitorStore.getState()
    const watch = () =>
      void commands.monitorWatch(document.visibilityState === 'visible')
    void commands.monitorLatest().then(push)
    const stop = listen<MachineSample[]>(SAMPLES_EVENT, event =>
      push(event.payload)
    )
    watch()
    document.addEventListener('visibilitychange', watch)
    return () => {
      document.removeEventListener('visibilitychange', watch)
      void commands.monitorWatch(false)
      void stop.then(unlisten => unlisten())
    }
  }, [])
}
