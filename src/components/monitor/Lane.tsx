/**
 * One reading's card: an icon, its name and current value, a minute's
 * chart, label / value facts, and anything extra (bars, per-thread
 * cells, drives). `color` is the main reading's threshold colour (green,
 * yellow, red), so the icon, number and line all say how it is doing.
 */
import type { LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'

/** label, value (null hides the row), and the value's own colour if any. */
export type Fact = [string, string | null, string?]

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
  facts?: Fact[]
  series: { values: number[]; color: string }[]
  max?: number
  children?: React.ReactNode
}) {
  const shown = (facts ?? []).filter(f => f[1] !== null)
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg transition-colors duration-500"
          style={{ background: `${color}1f`, color }}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-medium text-muted-foreground">
            {title}
          </h2>
          <p
            className="text-2xl leading-tight font-semibold tabular-nums transition-colors duration-500"
            style={{ color }}
          >
            {value}
          </p>
        </div>
      </div>
      <Sparkline series={series} max={max} className="h-14 w-full" />
      {children}
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {shown.map(([label, text, tint]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd
                className="truncate text-end font-medium tabular-nums"
                style={tint ? { color: tint } : undefined}
              >
                {text}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

/** A labelled bar, 0..100, in the colour of its value. */
export function Bar({
  label,
  detail,
  value,
  color,
}: {
  label?: string
  detail?: string
  value: number
  color: string
}) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {(label || detail) && (
        <div className="flex gap-2 tabular-nums">
          <span className="font-medium">{label}</span>
          <span className="ms-auto text-muted-foreground">{detail}</span>
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-500"
          style={{ width: `${Math.min(100, value)}%`, background: color }}
        />
      </div>
    </div>
  )
}
