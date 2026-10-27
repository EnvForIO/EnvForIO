/**
 * One reading's block: its name and current value on top, a line of
 * details, a minute's chart, and anything extra (per-core bars, drives).
 */
import { Sparkline } from './Sparkline'

export function Lane({
  title,
  value,
  details,
  series,
  max,
  children,
}: {
  title: string
  value: string
  details?: (string | null)[]
  series: { values: number[]; color: string }[]
  max?: number
  children?: React.ReactNode
}) {
  const shown = (details ?? []).filter((d): d is string => d !== null)
  return (
    <section className="flex flex-col gap-1.5 rounded-md border p-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ms-auto text-lg font-semibold tabular-nums">
          {value}
        </span>
      </div>
      {shown.length > 0 && (
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {shown.join(' · ')}
        </p>
      )}
      <Sparkline series={series} max={max} />
      {children}
    </section>
  )
}

/** A thin horizontal bar, 0..100. */
export function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  )
}
