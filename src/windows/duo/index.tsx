/**
 * The two Todo Duo windows: query cache, i18n and the transparent widget styles.
 */
import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import '@/i18n'
import '@/pages/duo/duo.css'
import { EditMenu } from '@/components/ui/edit-menu'
import { queryClient } from '@/lib/query-client'
import { Capsule } from '@/pages/duo/Capsule'
import { Card } from '@/pages/duo/Card'
import { WidgetRoot } from '@/pages/duo/WidgetRoot'

export function renderDuo(root: Root, part: 'capsule' | 'card'): void {
  root.render(
    <QueryClientProvider client={queryClient}>
      <WidgetRoot>
        {part === 'capsule' ? <Capsule /> : <Card />}
        <EditMenu />
      </WidgetRoot>
    </QueryClientProvider>
  )
}
