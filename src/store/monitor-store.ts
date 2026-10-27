/**
 * The last minute of monitor samples, newest last, for the charts. Shared
 * by everything in one window that shows readings; filled by useMonitorFeed.
 */
import { create } from 'zustand'
import type { Sample } from '@/lib/tauri-bindings'

/** One sample a second: a minute of history. */
export const HISTORY = 60

interface MonitorState {
  history: Sample[]
  push: (sample: Sample) => void
}

export const useMonitorStore = create<MonitorState>()(set => ({
  history: [],
  push: sample =>
    set(state => {
      const last = state.history.at(-1)
      if (last && last.atMs >= sample.atMs) return state
      return { history: [...state.history, sample].slice(-HISTORY) }
    }),
}))
