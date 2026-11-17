/**
 * Turns off the WebView's own right-click menu (Back, Refresh, Save as,
 * Print, More tools), which belongs to a browser, not a desktop app (user
 * decision 2026-11-20). It stays where it does a job: in text fields and
 * on selected text, for cut, copy and paste. The app's own menus
 * (`ui/context-menu.tsx`) prevent the default first and are left alone.
 */

function editable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return (
    target.closest(
      'input, textarea, [contenteditable=""], [contenteditable="true"]'
    ) !== null
  )
}

export function disableBrowserMenu(): void {
  window.addEventListener('contextmenu', e => {
    if (e.defaultPrevented || editable(e.target)) return
    if ((window.getSelection()?.toString() ?? '') !== '') return
    e.preventDefault()
  })
}
