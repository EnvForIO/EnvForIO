/**
 * The desktop calendar widget window: query cache, i18n, and the same
 * transparent widget styles and cross-window sync as Todo Duo.
 */
import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import '@/pages/duo/duo.css'
import { queryClient } from '@/lib/query-client'
import { WidgetRoot } from '@/pages/duo/WidgetRoot'
import { MonthWidget } from '@/pages/month/MonthWidget'

export function renderMonth(root: Root): void {
  root.render(
    <QueryClientProvider client={queryClient}>
      <WidgetRoot>
        <MonthWidget />
      </WidgetRoot>
    </QueryClientProvider>
  )
}
