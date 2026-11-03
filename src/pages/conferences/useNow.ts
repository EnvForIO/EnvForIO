/** The time (Unix ms), read again each minute, for deadline countdowns. */
import { useEffect, useState } from 'react'

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
