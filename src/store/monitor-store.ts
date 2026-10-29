/**
 * The last minute of samples for every machine on the overview, newest
 * last, keyed by targetId; why a machine cannot be read; and when each
 * was last read. Filled by useMonitorFeed from Rust's batches.
 */
import { create } from 'zustand'
import { targetId } from '@/components/monitor/machine'
import type { MachineSample, Sample } from '@/lib/tauri-bindings'

/** One sample a second: a minute of history. */
export const HISTORY = 60

interface MonitorState {
  history: Record<string, Sample[]>
  errors: Record<string, string>
  lastSeen: Record<string, number>
  push: (batch: MachineSample[]) => void
}

export const useMonitorStore = create<MonitorState>()(set => ({
  history: {},
  errors: {},
  lastSeen: {},
  push: batch =>
    set(state => {
      const history = { ...state.history }
      const lastSeen = { ...state.lastSeen }
      const failed: Record<string, string> = {}
      const answered = new Set<string>()
      for (const { target, sample } of batch) {
        const id = targetId(target)
        if (sample.error !== null) {
          failed[id] = sample.error
          continue
        }
        answered.add(id)
        const past = history[id] ?? []
        const last = past.at(-1)
        if (last && last.atMs >= sample.atMs) continue
        history[id] = [...past, sample].slice(-HISTORY)
        lastSeen[id] = sample.atMs
      }
      // A machine that answered has no error any more.
      const kept = Object.entries(state.errors).filter(
        ([id]) => !answered.has(id)
      )
      const errors = { ...Object.fromEntries(kept), ...failed }
      return { history, errors, lastSeen }
    }),
}))
