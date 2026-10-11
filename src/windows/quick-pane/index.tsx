/**
 * Quick pane: the small floating window opened by the global shortcut.
 * Becomes EnvIO's quick-capture window in Phase 2.
 */
import type { Root } from 'react-dom/client'
import QuickPaneApp from '@/components/quick-pane/QuickPaneApp'
import '@/quick-pane.css'

export function renderQuickPane(root: Root): void {
  root.render(<QuickPaneApp />)
}
