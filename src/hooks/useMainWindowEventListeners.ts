import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useCommandContext } from './use-command-context'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'
import { useUIStore } from '@/store/ui-store'

/**
 * Main window event listeners - handles global keyboard shortcuts and cross-window events.
 *
 * This hook composes specialized hooks for different event types:
 * - useKeyboardShortcuts: Global keyboard shortcuts (Cmd+, Cmd+1, Cmd+2)
 * - open-calendar-day: the Todo Duo month asks for the calendar at a day
 *
 * The quick pane needs no listener here: it creates the task itself and
 * emits TASKS_CHANGED, which `useTaskSync` (App.tsx) turns into a refetch.
 */
export function useMainWindowEventListeners() {
  const commandContext = useCommandContext()

  useKeyboardShortcuts(commandContext)

  // The desktop calendar widget asks to open the calendar at a day.
  useEffect(() => {
    const stop = listen<string>('open-calendar-day', event => {
      useUIStore.getState().openCalendarAt(event.payload)
    })
    return () => {
      void stop.then(unlisten => unlisten())
    }
  }, [])
}
