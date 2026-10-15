/**
 * Shared wrapper for both Todo Duo windows: cross-window task and preference
 * sync, the widget style, and the theme.
 */
import type { ReactNode } from 'react'
import { useTaskSync } from '@/api/tasks'
import { ThemeProvider } from '@/components/ThemeProvider'
import { usePreferencesSync } from '@/services/preferences'
import { useDuoStyle } from './useDuoStyle'

export function WidgetRoot({ children }: { children: ReactNode }) {
  useTaskSync()
  usePreferencesSync()
  useDuoStyle()
  return <ThemeProvider>{children}</ThemeProvider>
}
