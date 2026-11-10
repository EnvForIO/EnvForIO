/**
 * Reading key presses in text inputs.
 */
import type { KeyboardEvent } from 'react'

/**
 * True for an Enter that means "submit", false for the Enter that confirms an
 * input method candidate (Chinese, Japanese, Korean). Without this, picking a
 * candidate adds the half-typed text as a task.
 *
 * NOTE: `isComposing` alone is not enough. WebKit (the webview on macOS and
 * Linux) ends the composition before it delivers this keydown, so the flag is
 * already false; the key code is still 229 there (WebKit bug 165004).
 */
export const isEnter = (e: KeyboardEvent): boolean =>
  e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229
