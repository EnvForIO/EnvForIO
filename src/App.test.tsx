import { render, screen } from '@/test/test-utils'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Tauri bindings are mocked globally in src/test/setup.ts.
// Language detection and the native menu need the Tauri runtime, which tests do not have.
vi.mock('./i18n/language-init', () => ({
  initializeLanguage: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./lib/menu', () => ({
  buildAppMenu: vi.fn().mockResolvedValue(undefined),
  setupMenuLanguageListener: vi.fn(),
}))

describe('App', () => {
  it('renders the My Day list by default', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /my day/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/add a task/i)).toBeInTheDocument()
  })

  it('renders title bar with traffic light buttons', () => {
    render(<App />)
    // Find specifically the window control buttons in the title bar
    const titleBarButtons = screen
      .getAllByRole('button')
      .filter(
        button =>
          button.getAttribute('aria-label')?.includes('window') ||
          button.className.includes('window-control')
      )
    // Should have at least the window control buttons
    expect(titleBarButtons.length).toBeGreaterThan(0)
  })
})
