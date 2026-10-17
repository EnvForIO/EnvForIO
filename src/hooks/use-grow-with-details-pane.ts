/**
 * Opening the right-hand details pane makes the window wider by the pane's
 * width, and closing it gives the width back, so the lists never get squeezed.
 * A maximized window cannot grow, so it just shares its width instead.
 */
import { useEffect, useRef } from 'react'
import { PhysicalSize } from '@tauri-apps/api/dpi'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { logger } from '@/lib/logger'

export const DETAILS_PANE_WIDTH = 320 // logical px; matches w-80 on the pane

export function useGrowWithDetailsPane(open: boolean): void {
  const previous = useRef(open)

  useEffect(() => {
    if (previous.current === open) return // first render, or no change
    previous.current = open
    const window = getCurrentWindow()
    const resize = async () => {
      if (await window.isMaximized()) return
      const [size, scale] = await Promise.all([
        window.innerSize(),
        window.scaleFactor(),
      ])
      const delta = Math.round(DETAILS_PANE_WIDTH * scale) * (open ? 1 : -1)
      await window.setSize(new PhysicalSize(size.width + delta, size.height))
    }
    resize().catch((error: unknown) =>
      logger.warn('Could not resize the window for the details pane', { error })
    )
  }, [open])
}
