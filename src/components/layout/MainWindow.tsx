import { TitleBar } from '@/components/titlebar/TitleBar'
import { LeftSideBar } from './LeftSideBar'
import { RightSideBar } from './RightSideBar'
import { MainWindowContent } from './MainWindowContent'
import { SidebarNav } from './SidebarNav'
import { SidebarProjects } from './SidebarProjects'
import { MainPane } from '@/pages/MainPane'
import { TaskDetails } from '@/pages/tasks/TaskDetails'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { PreferencesDialog } from '@/components/preferences/PreferencesDialog'
import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'
import { useUIStore } from '@/store/ui-store'
import { useMainWindowEventListeners } from '@/hooks/useMainWindowEventListeners'

export function MainWindow() {
  const { theme } = useTheme()
  const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
  const rightSidebarVisible = useUIStore(state => state.rightSidebarVisible)

  // Set up global event listeners (keyboard shortcuts, etc.)
  useMainWindowEventListeners()

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden rounded-[var(--app-corner-radius)] bg-background">
      <TitleBar />

      {/* relative: the details pane floats over the right edge of this area */}
      <div className="relative flex flex-1 overflow-hidden">
        {leftSidebarVisible && (
          <LeftSideBar className="w-60 shrink-0">
            <SidebarNav />
            <SidebarProjects />
          </LeftSideBar>
        )}

        <MainWindowContent className="min-w-0 flex-1">
          <MainPane />
        </MainWindowContent>

        {rightSidebarVisible && (
          <RightSideBar className="absolute inset-y-0 right-0 z-10 w-80 shadow-xl">
            <TaskDetails />
          </RightSideBar>
        )}
      </div>

      {/* Global UI Components (hidden until triggered) */}
      <CommandPalette />
      <PreferencesDialog />
      <Toaster
        position="bottom-right"
        theme={
          theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'system'
        }
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            description: 'group-[.toast]:text-muted-foreground',
            actionButton:
              'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
            cancelButton:
              'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          },
        }}
      />
    </div>
  )
}
