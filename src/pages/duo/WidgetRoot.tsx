/**
 * Shared wrapper for both Todo Duo windows: cross-window task sync and theme.
 */
import type { ReactNode } from 'react'
import { useTaskSync } from '@/api/tasks'
import { ThemeProvider } from '@/components/ThemeProvider'

export function WidgetRoot({ children }: { children: ReactNode }) {
  useTaskSync()
  return <ThemeProvider>{children}</ThemeProvider>
}
