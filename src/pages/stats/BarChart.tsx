/**
 * A small vertical bar chart: one bar per item, label underneath, value in
 * the tooltip. Bars are scaled to the largest value.
 */
interface Bar {
  key: string
  label: string
  value: number
  tooltip: string
}

export function BarChart({
  bars,
  height = 96,
}: {
  bars: Bar[]
  height?: number
}) {
  const top = Math.max(1, ...bars.map(b => b.value))
  // Thin bars get no labels except every few, so they never overlap.
  const every = bars.length > 14 ? Math.ceil(bars.length / 10) : 1

  return (
    <div className="flex items-end gap-0.5" style={{ height: height + 16 }}>
      {bars.map((bar, i) => (
        <div
          key={bar.key}
          title={bar.tooltip}
          className="flex min-w-0 flex-1 flex-col items-center justify-end"
        >
          <div
            className="w-full rounded-sm bg-primary/70"
            style={{
              height: Math.max(
                bar.value > 0 ? 2 : 0,
                Math.round((bar.value / top) * height)
              ),
            }}
          />
          <span className="mt-0.5 h-3 truncate text-[10px] text-muted-foreground">
            {i % every === 0 ? bar.label : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
