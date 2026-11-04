/**
 * A running clock since `startedAt` (RFC 3339), ticking once a second.
 * Display only: the minutes that count are worked out in Rust on stop.
 */
import { useNow } from '@/hooks/useNow'

function format(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function Elapsed({ startedAt }: { startedAt: string }) {
  const now = useNow(1000)
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000))
  return <span className="tabular-nums">{format(seconds)}</span>
}
