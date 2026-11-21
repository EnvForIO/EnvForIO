/**
 * Turns off the WebView's own right-click menu everywhere. Its page items
 * (Back, Refresh, Save as, Print, More tools) belong to a browser, not a
 * desktop app (user decision 2026-11-20), and its edit items look like
 * Windows, not EnvForIO (2026-11-21). The app's own menus
 * (`ui/context-menu.tsx`) prevent the default first and are left alone.
 *
 * Where the WebView menu did a job, in a text field or on selected text,
 * the app's edit menu (`ui/edit-menu.tsx`) opens instead.
 */

export interface EditTarget {
  x: number
  y: number
  /** The text field right-clicked, or null for selected page text. */
  field: HTMLElement | null
}

type Listener = (target: EditTarget) => void
let listener: Listener | null = null

/** Called with where to open the edit menu; one listener per window. */
export function onEditMenu(next: Listener | null): void {
  listener = next
}

function editableField(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(
    'input, textarea, [contenteditable=""], [contenteditable="true"]'
  )
}

export function disableBrowserMenu(): void {
  window.addEventListener('contextmenu', e => {
    if (e.defaultPrevented) return
    e.preventDefault()
    const field = editableField(e.target)
    const selected = (window.getSelection()?.toString() ?? '') !== ''
    if (field !== null || selected)
      listener?.({ x: e.clientX, y: e.clientY, field })
  })
}
