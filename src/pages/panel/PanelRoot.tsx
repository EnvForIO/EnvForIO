/**
 * The monitor panel window's root: theme, and preference sync so theme
 * changes made in the main window show here too.
 */
import { ThemeProvider } from '@/components/ThemeProvider'
import { usePreferencesSync } from '@/services/preferences'
import { MonitorPanel } from './MonitorPanel'

export function PanelRoot() {
  usePreferencesSync()
  return (
    <ThemeProvider>
      <MonitorPanel />
    </ThemeProvider>
  )
}
