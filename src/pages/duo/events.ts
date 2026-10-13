/**
 * Messages between the two Todo Duo windows. Each window is its own page, so
 * the capsule tells the card which day to show through a Tauri event.
 */
import { useEffect, useState } from 'react'
import { emit, listen } from '@tauri-apps/api/event'

const DAY_SELECTED = 'duo-day-selected'

export function selectDuoDay(date: string): void {
  void emit(DAY_SELECTED, date)
}

/** The day the card shows: today until the capsule picks another day. */
export function useSelectedDuoDay(
  today: string | undefined
): string | undefined {
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => {
    const unlisten = listen<string>(DAY_SELECTED, event =>
      setPicked(event.payload)
    )
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [])
  return picked ?? today
}
