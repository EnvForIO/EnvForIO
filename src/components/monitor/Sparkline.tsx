/**
 * A minute of one or two readings as lines over a fill that fades
 * downwards. `max` fixes the scale (100 for percentages); without it the
 * scale follows the highest value shown, as traffic charts do.
 */
import { useId } from 'react'
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
  const id = useId()
  const top = max ?? Math.max(1, ...series.flatMap(s => s.values))
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={className ?? 'h-10 w-full'}
    >
      <defs>
        {series.map(({ color }, i) => (
          <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {series.map(({ values, color }, i) => {
        if (values.length < 2) return null
        const points = path(values, top)
        const line = points.map(([x, y]) => `${x},${y}`).join(' ')
        const first = points[0]?.[0] ?? 0
        return (
          <g key={i}>
            <polygon
              points={`${first},${H} ${line} ${W},${H}`}
              fill={`url(#${id}-${i})`}
            />
            <polyline
              points={line}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </svg>
  )
}
