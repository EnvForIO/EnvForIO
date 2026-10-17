import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { TaskView } from '@/lib/tauri-bindings'

interface UIState {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  lastQuickPaneEntry: string | null
  /** Which built-in list the main pane shows. */
  selectedView: TaskView
  /** The project shown in the middle pane instead of a built-in list, if any. */
  selectedProjectId: number | null
  /** The calendar is shown in the middle pane. */
  calendarOpen: boolean
  /** The task open in the details pane, or null when it is closed. */
  selectedTaskId: number | null

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setLastQuickPaneEntry: (text: string) => void
  setSquareCorners: (enabled: boolean) => void
  selectView: (view: TaskView) => void
  selectTask: (id: number | null) => void
  selectProject: (id: number) => void
  openCalendar: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      rightSidebarVisible: false, // the details pane opens when a task is selected
      commandPaletteOpen: false,
      preferencesOpen: false,
      lastQuickPaneEntry: null,
      selectedView: 'MyDay',
      selectedProjectId: null,
      calendarOpen: false,
      selectedTaskId: null,

      toggleLeftSidebar: () =>
        set(
          state => ({ leftSidebarVisible: !state.leftSidebarVisible }),
          undefined,
          'toggleLeftSidebar'
        ),

      setLeftSidebarVisible: visible =>
        set(
          { leftSidebarVisible: visible },
          undefined,
          'setLeftSidebarVisible'
        ),

      toggleRightSidebar: () =>
        set(
          state => ({ rightSidebarVisible: !state.rightSidebarVisible }),
          undefined,
          'toggleRightSidebar'
        ),

      setRightSidebarVisible: visible =>
        set(
          { rightSidebarVisible: visible },
          undefined,
          'setRightSidebarVisible'
        ),

      toggleCommandPalette: () =>
        set(
          state => ({ commandPaletteOpen: !state.commandPaletteOpen }),
          undefined,
          'toggleCommandPalette'
        ),

      setCommandPaletteOpen: open =>
        set({ commandPaletteOpen: open }, undefined, 'setCommandPaletteOpen'),

      togglePreferences: () =>
        set(
          state => ({ preferencesOpen: !state.preferencesOpen }),
          undefined,
          'togglePreferences'
        ),

      setPreferencesOpen: open =>
        set({ preferencesOpen: open }, undefined, 'setPreferencesOpen'),

      setLastQuickPaneEntry: text =>
        set({ lastQuickPaneEntry: text }, undefined, 'setLastQuickPaneEntry'),

      selectView: view =>
        set(
          {
            selectedView: view,
            selectedProjectId: null,
            calendarOpen: false,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'selectView'
        ),

      selectProject: id =>
        set(
          {
            selectedProjectId: id,
            calendarOpen: false,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'selectProject'
        ),

      openCalendar: () =>
        set(
          {
            calendarOpen: true,
            selectedProjectId: null,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'openCalendar'
        ),

      selectTask: id =>
        set(
          { selectedTaskId: id, rightSidebarVisible: id !== null },
          undefined,
          'selectTask'
        ),

      setSquareCorners: (enabled: boolean) => {
        document.documentElement.classList.toggle('square-corners', enabled)
      },
    }),
    {
      name: 'ui-store',
    }
  )
)
