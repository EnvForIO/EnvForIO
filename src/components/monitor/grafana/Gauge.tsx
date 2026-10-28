/**
 * Grafana's gauge: a 240° arc filled to the value in its threshold colour,
 * the value in the middle, the label under it.
 */
import { level } from '../format'
import { G, LEVEL } from './theme'

const R = 40
const SWEEP = 240
const START = 90 + (360 - SWEEP) / 2 // from the lower left, clockwise

function point(deg: number) {
  const rad = (deg * Math.PI) / 180
  return [50 + R * Math.cos(rad), 50 + R * Math.sin(rad)]
}

function arc(from: number, to: number) {
  const [x1, y1] = point(START + from)
  const [x2, y2] = point(START + to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
}

export function Gauge({
  pct,
  value,
  label,
}: {
  /** 0..100: how full the arc is and which colour. */
  pct: number
  value: string
  label: string
}) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = LEVEL[level(clamped)]
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 86" className="h-24 w-28">
        <path
          d={arc(0, SWEEP)}
          fill="none"
          stroke={G.grid}
          strokeWidth={9}
          strokeLinecap="butt"
        />
        {clamped > 0 && (
          <path
            d={arc(0, (clamped / 100) * SWEEP)}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="butt"
          />
        )}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="17"
          fontWeight="600"
          fill={color}
        >
          {value}
        </text>
      </svg>
      <span className="-mt-2 text-xs" style={{ color: G.muted }}>
        {label}
      </span>
    </div>
  )
}
