/**
 * Applies the saved widget style (material, font, text size) to the current
 * Todo Duo window. Both windows run this, so a change in Preferences shows up
 * in both at once (preferences are re-read on `preferences-changed`).
 */
import { useEffect } from 'react'
import { Effect, getCurrentWindow } from '@tauri-apps/api/window'
import type { DuoStyle } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { usePreferences } from '@/services/preferences'

const SURFACE: Record<DuoStyle['material'], string> = {
  translucent: 'color-mix(in oklab, var(--background) 85%, transparent)',
  // With a system blur behind it, the panel only needs a light tint.
  acrylic: 'color-mix(in oklab, var(--background) 35%, transparent)',
  mica: 'color-mix(in oklab, var(--background) 25%, transparent)',
  solid: 'var(--background)',
}

const EFFECT: Partial<Record<DuoStyle['material'], Effect>> = {
  acrylic: Effect.Acrylic,
  mica: Effect.Mica,
}

const FONT: Record<DuoStyle['font'], string> = {
  system: "'Segoe UI', system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'Cascadia Code', Consolas, monospace",
}

const TEXT_SIZE: Record<DuoStyle['text_size'], string> = {
  small: '13px',
  medium: '14px',
  large: '16px',
}

export function useDuoStyle(): void {
  const style = usePreferences().data?.duo_style

  useEffect(() => {
    if (!style) return
    const root = document.documentElement.style
    root.setProperty('--duo-surface', SURFACE[style.material])
    root.setProperty('--duo-font', FONT[style.font])
    root.setProperty('--duo-font-size', TEXT_SIZE[style.text_size])

    // NOTE: the system blur covers the whole window rectangle, not just the
    // rounded panel; Windows 11 may or may not round it. Needs a look on screen.
    const effect = EFFECT[style.material]
    const window = getCurrentWindow()
    const applied = effect
      ? window.setEffects({ effects: [effect] })
      : window.clearEffects()
    applied.catch((error: unknown) =>
      logger.warn('Could not set window material', { error })
    )
  }, [style])
}
