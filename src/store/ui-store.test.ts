import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './ui-store'

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      leftSidebarVisible: true,
      rightSidebarVisible: true,
      commandPaletteOpen: false,
      preferencesOpen: false,
    })
  })

  it('has correct initial state', () => {
    const state = useUIStore.getState()
    expect(state.leftSidebarVisible).toBe(true)
    expect(state.rightSidebarVisible).toBe(true)
    expect(state.commandPaletteOpen).toBe(false)
    expect(state.preferencesOpen).toBe(false)
  })

  it('toggles left sidebar visibility', () => {
    const { toggleLeftSidebar } = useUIStore.getState()

    toggleLeftSidebar()
    expect(useUIStore.getState().leftSidebarVisible).toBe(false)

    toggleLeftSidebar()
    expect(useUIStore.getState().leftSidebarVisible).toBe(true)
  })

  it('sets left sidebar visibility directly', () => {
    const { setLeftSidebarVisible } = useUIStore.getState()

    setLeftSidebarVisible(false)
    expect(useUIStore.getState().leftSidebarVisible).toBe(false)

    setLeftSidebarVisible(true)
    expect(useUIStore.getState().leftSidebarVisible).toBe(true)
  })

  it('toggles preferences dialog', () => {
    const { togglePreferences } = useUIStore.getState()

    togglePreferences()
    expect(useUIStore.getState().preferencesOpen).toBe(true)

    togglePreferences()
    expect(useUIStore.getState().preferencesOpen).toBe(false)
  })

  it('opens the details pane only while a task is selected', () => {
    const { selectTask, selectView } = useUIStore.getState()

    selectTask(7)
    expect(useUIStore.getState()).toMatchObject({
      selectedTaskId: 7,
      rightSidebarVisible: true,
    })

    // Switching lists closes the details pane, like Microsoft To Do.
    selectView('Planned')
    expect(useUIStore.getState()).toMatchObject({
      selectedView: 'Planned',
      selectedTaskId: null,
      rightSidebarVisible: false,
    })
  })

  it('toggles command palette', () => {
    const { toggleCommandPalette } = useUIStore.getState()

    toggleCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)

    toggleCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
  })

  it('opens an idea from the overview and forgets it on the next page', () => {
    const { openIdea, openPage } = useUIStore.getState()
    openIdea(7)
    expect(useUIStore.getState()).toMatchObject({
      page: 'ideas',
      focusIdeaId: 7,
    })
    openPage('papers')
    openPage('ideas')
    expect(useUIStore.getState().focusIdeaId).toBeNull()
  })
})
