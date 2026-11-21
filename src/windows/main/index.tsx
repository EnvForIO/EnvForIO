/**
 * Main window: the three-pane app (sidebar, list, details).
 */
import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import '@/i18n'
import App from '@/App'
import { EditMenu } from '@/components/ui/edit-menu'
import { queryClient } from '@/lib/query-client'

export function renderMain(root: Root): void {
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
      <EditMenu />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
