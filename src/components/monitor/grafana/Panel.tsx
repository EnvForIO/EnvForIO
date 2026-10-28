/**
 * Grafana's building blocks: a panel with its title bar, a stat (big
 * number coloured by threshold over a faint chart), and a bar gauge row.
 */
import { level } from '../format'
import { Sparkline } from '../Sparkline'
import { G, LEVEL } from './theme'

export function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-[2px] border ${className ?? ''}`}
      style={{ background: G.panel, borderColor: G.border }}
    >
      <h3
        className="truncate px-2 pt-1.5 pb-1 text-[13px] font-medium"
        style={{ color: G.text }}
      >
        {title}
      </h3>
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-2">{children}</div>
    </section>
  )
}

/** A big value; `pct` picks its threshold colour, `history` draws behind it. */
export function Stat({
  title,
  value,
  unit,
  pct,
  sub,
  history,
}: {
  title: string
  value: string
  unit?: string
  pct: number
  sub?: string
  history: number[]
}) {
  const color = LEVEL[level(pct)]
  return (
    <Panel title={title}>
      <div className="relative flex h-24 flex-col justify-center">
        <Sparkline
          series={[{ values: history, color }]}
          max={100}
          className="absolute inset-x-0 bottom-0 h-12 w-full opacity-60"
        />
        <div className="relative text-center">
          <span
            className="text-4xl font-semibold tabular-nums"
            style={{ color }}
          >
            {value}
          </span>
          {unit && (
            <span className="ms-1 text-xl" style={{ color }}>
              {unit}
            </span>
          )}
        </div>
        {sub && (
          <p
            className="relative truncate text-center text-xs tabular-nums"
            style={{ color: G.muted }}
          >
            {sub}
          </p>
        )}
      </div>
    </Panel>
  )
}

/** Grafana's "bar gauge" row: label, a filled bar in threshold colour, value. */
export function BarGauge({
  label,
  pct,
  text,
}: {
  label: string
  pct: number
  text: string
}) {
  const color = LEVEL[level(pct)]
  return (
    <div className="flex items-center gap-2 text-xs tabular-nums">
      <span className="w-24 shrink-0 truncate" style={{ color: G.text }}>
        {label}
      </span>
      <div
        className="h-4 flex-1 overflow-hidden rounded-[2px]"
        style={{ background: G.grid }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
      <span className="w-36 shrink-0 text-end" style={{ color }}>
        {text}
      </span>
    </div>
  )
}
