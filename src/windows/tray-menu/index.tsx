/**
 * The tray's right-click menu window: query cache, i18n, the theme and the
 * transparent page styles.
 */
import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import './tray-menu.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TrayMenu } from '@/components/tray-menu/TrayMenu'
import { queryClient } from '@/lib/query-client'

export function renderTrayMenu(root: Root): void {
  root.render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TrayMenu />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
