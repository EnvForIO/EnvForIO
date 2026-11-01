/**
 * The single entry point for every EnvIO window.
 *
 * All windows load index.html; Rust opens each one with `?window=<name>`
 * and this file mounts the matching view. Windows are imported lazily so
 * each one only loads its own code and styles.
 */
import ReactDOM from 'react-dom/client'
import { disableBrowserMenu } from './lib/browser-menu'

disableBrowserMenu()

const windowName =
  new URLSearchParams(window.location.search).get('window') ?? 'main'
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

async function mount(): Promise<void> {
  if (windowName === 'duo-capsule' || windowName === 'duo-card') {
    const { renderDuo } = await import('./windows/duo')
    renderDuo(root, windowName === 'duo-capsule' ? 'capsule' : 'card')
    return
  }
  if (windowName === 'quick-pane') {
    const { renderQuickPane } = await import('./windows/quick-pane')
    renderQuickPane(root)
    return
  }
  const { renderMain } = await import('./windows/main')
  renderMain(root)
}

void mount()
