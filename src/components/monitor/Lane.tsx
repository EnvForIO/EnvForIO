/**
 * One reading's card: an icon in the reading's colour, its name and
 * current value, a minute's chart, label / value facts, and anything
 * extra (per-thread cells, drives).
 */
import type { LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'

export function Lane({
  icon: Icon,
  color,
  title,
  value,
  facts,
  series,
  max,
  children,
}: {
  icon: LucideIcon
  color: string
  title: string
  value: string
  facts?: [string, string | null][]
  series: { values: number[]; color: string }[]
  max?: number
  children?: React.ReactNode
}) {
  const shown = (facts ?? []).filter(
    (f): f is [string, string] => f[1] !== null
  )
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ background: `${color}1f`, color }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </h2>
          <p className="text-2xl leading-tight font-semibold tabular-nums">
            {value}
          </p>
        </div>
      </div>
      <Sparkline series={series} max={max} className="h-14 w-full" />
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {shown.map(([label, text]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate text-end tabular-nums">{text}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  )
}

/** A thin horizontal bar, 0..100. */
export function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  )
}
