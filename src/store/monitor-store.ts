/**
 * The last minute of monitor samples, newest last, for the charts, and
 * why there are none if the watched machine cannot be reached. Shared by
 * everything in one window that shows readings; filled by useMonitorFeed,
 * emptied when the watched machine changes.
 */
import { create } from 'zustand'
import type { Sample } from '@/lib/tauri-bindings'

/** One sample a second: a minute of history. */
export const HISTORY = 60

interface MonitorState {
  history: Sample[]
  error: string | null
  push: (sample: Sample) => void
  clear: () => void
}

export const useMonitorStore = create<MonitorState>()(set => ({
  history: [],
  error: null,
  push: sample =>
    set(state => {
      if (sample.error !== null) return { error: sample.error }
      const last = state.history.at(-1)
      if (last && last.atMs >= sample.atMs) return state
      return {
        error: null,
        history: [...state.history, sample].slice(-HISTORY),
      }
    }),
  clear: () => set({ history: [], error: null }),
}))
