/**
 * The time (Unix ms), read again every `everyMs`: once a minute for
 * deadline countdowns, once a second for a running timer.
 */
import { useEffect, useState } from 'react'

export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(id)
  }, [everyMs])
  return now
}
