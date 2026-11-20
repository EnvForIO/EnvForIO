/**
 * Quick pane: the small floating window opened by the global shortcut.
 * It is EnvForIO's quick capture: whatever is typed becomes a task in My Day.
 */
import type { Root } from 'react-dom/client'
import '@/i18n'
import QuickPaneApp from '@/components/quick-pane/QuickPaneApp'
import '@/quick-pane.css'

export function renderQuickPane(root: Root): void {
  root.render(<QuickPaneApp />)
}
