/**
 * A minute of one or two readings as lines with a faint fill. `max` fixes
 * the scale (100 for percentages); without it the scale follows the
 * highest value shown, as traffic charts do.
 */
import { HISTORY } from '@/store/monitor-store'

const W = 120
const H = 32

function path(values: number[], max: number) {
  const step = W / (HISTORY - 1)
  const start = W - (values.length - 1) * step
  return values.map((v, i) => [start + i * step, H - (v / max) * (H - 1)])
}

export function Sparkline({
  series,
  max,
  className,
}: {
  series: { values: number[]; color: string }[]
  max?: number
  className?: string
}) {
  const top = max ?? Math.max(1, ...series.flatMap(s => s.values))
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className ?? 'h-10 w-full'}
    >
      {series.map(({ values, color }, i) => {
        if (values.length < 2) return null
        const points = path(values, top)
        const line = points.map(([x, y]) => `${x},${y}`).join(' ')
        const first = points[0]?.[0] ?? 0
        return (
          <g key={i}>
            <polygon
              points={`${first},${H} ${line} ${W},${H}`}
              fill={color}
              fillOpacity={0.12}
            />
            <polyline
              points={line}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </svg>
  )
}
