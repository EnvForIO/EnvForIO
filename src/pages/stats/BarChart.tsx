/**
 * A small vertical bar chart: one column per item, label underneath, value
 * in the tooltip. Every column has a faint track, so a quiet period still
 * reads as a chart with nothing in it rather than a blank area; when every
 * value is zero the `empty` line sits over the tracks.
 */
import { cn } from '@/lib/utils'
import { labelledColumns } from './chart-layout'

interface Bar {
  key: string
  label: string
  value: number
  tooltip: string
  highlight?: boolean // e.g. today
}

export function BarChart({
  bars,
  height = 120,
  empty,
}: {
  bars: Bar[]
  height?: number
  empty: string
}) {
  const top = Math.max(1, ...bars.map(b => b.value))
  const blank = bars.every(b => b.value === 0)
  const labelled = labelledColumns(
    bars.length,
    bars.findIndex(b => b.highlight)
  )

  return (
    <div className="relative">
      <div className={cn('flex', bars.length > 14 ? 'gap-1' : 'gap-2')}>
        {bars.map((bar, i) => (
          <div
            key={bar.key}
            title={bar.tooltip}
            className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <div
              className="flex w-full max-w-10 flex-col justify-end overflow-hidden rounded-[4px] bg-foreground/[0.04]"
              style={{ height }}
            >
              <div
                className={bar.highlight ? 'bg-primary' : 'bg-primary/70'}
                style={{
                  height:
                    bar.value > 0
                      ? Math.max(3, Math.round((bar.value / top) * height))
                      : 0,
                }}
              />
            </div>
            <span
              className={cn(
                'h-3.5 truncate text-[11px] leading-none tabular-nums',
                bar.highlight
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {labelled[i] ? bar.label : ''}
            </span>
          </div>
        ))}
      </div>
      {blank && (
        <p
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center text-xs text-muted-foreground"
          style={{ height }}
        >
          {empty}
        </p>
      )}
    </div>
  )
}
