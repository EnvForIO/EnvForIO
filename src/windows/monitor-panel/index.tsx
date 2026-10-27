/**
 * The monitor panel window: query cache, i18n and the transparent panel styles.
 */
import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import '@/pages/panel/panel.css'
import { queryClient } from '@/lib/query-client'
import { PanelRoot } from '@/pages/panel/PanelRoot'

export function renderMonitorPanel(root: Root): void {
  root.render(
    <QueryClientProvider client={queryClient}>
      <PanelRoot />
    </QueryClientProvider>
  )
}
