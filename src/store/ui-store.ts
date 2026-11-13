import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { TaskView } from '@/lib/tauri-bindings'

interface UIState {
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  commandPaletteOpen: boolean
  preferencesOpen: boolean
  /** The pane Preferences shows (kept here so other screens can open one). */
  preferencesPane: PreferencePane
  /** Which built-in list the main pane shows. */
  selectedView: TaskView
  /** The project shown in the middle pane instead of a built-in list, if any. */
  selectedProjectId: number | null
  /** A full page in the middle pane instead of a list or project. */
  page: MainPage | null
  /** The idea the Ideas page opens with (set when jumping from the overview). */
  focusIdeaId: number | null
  /** The task open in the details pane, or null when it is closed. */
  selectedTaskId: number | null
  /** The day the calendar page opens on (set from the desktop widget). */
  calendarDate: string | null
  /** How a project page shows its tasks: grouped by module, or as a board. */
  projectView: 'list' | 'board'

  toggleLeftSidebar: () => void
  setLeftSidebarVisible: (visible: boolean) => void
  toggleRightSidebar: () => void
  setRightSidebarVisible: (visible: boolean) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  togglePreferences: () => void
  setPreferencesOpen: (open: boolean) => void
  setPreferencesPane: (pane: PreferencePane) => void
  /** Opens Preferences on one pane, e.g. Planning for "Set daily time". */
  openPreferencesAt: (pane: PreferencePane) => void
  setSquareCorners: (enabled: boolean) => void
  selectView: (view: TaskView) => void
  selectTask: (id: number | null) => void
  selectProject: (id: number) => void
  openPage: (page: MainPage) => void
  openIdea: (id: number) => void
  setProjectView: (view: 'list' | 'board') => void
  openCalendarAt: (date: string) => void
}

export type PreferencePane = 'general' | 'planning' | 'appearance' | 'advanced'

/** The full pages the middle pane can show instead of a list or project. */
export type MainPage =
  'calendar' | 'stats' | 'research' | 'ideas' | 'papers' | 'monitor' | 'reader'

export const useUIStore = create<UIState>()(
  devtools(
    set => ({
      leftSidebarVisible: true,
      rightSidebarVisible: false, // the details pane opens when a task is selected
      commandPaletteOpen: false,
      preferencesOpen: false,
      preferencesPane: 'general',
      selectedView: 'MyDay',
      selectedProjectId: null,
      page: null,
      focusIdeaId: null,
      selectedTaskId: null,
      projectView: 'list',
      calendarDate: null,

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

      setPreferencesPane: pane =>
        set({ preferencesPane: pane }, undefined, 'setPreferencesPane'),

      openPreferencesAt: pane =>
        set(
          { preferencesOpen: true, preferencesPane: pane },
          undefined,
          'openPreferencesAt'
        ),

      selectView: view =>
        set(
          {
            selectedView: view,
            selectedProjectId: null,
            page: null,
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
            page: null,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'selectProject'
        ),

      openPage: page =>
        set(
          {
            page,
            focusIdeaId: null,
            selectedProjectId: null,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'openPage'
        ),

      openIdea: id =>
        set(
          {
            page: 'ideas',
            focusIdeaId: id,
            selectedProjectId: null,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'openIdea'
        ),

      openCalendarAt: date =>
        set(
          {
            page: 'calendar',
            calendarDate: date,
            selectedProjectId: null,
            selectedTaskId: null,
            rightSidebarVisible: false,
          },
          undefined,
          'openCalendarAt'
        ),

      setProjectView: view =>
        set({ projectView: view }, undefined, 'setProjectView'),

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
