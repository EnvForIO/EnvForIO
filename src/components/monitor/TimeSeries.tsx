/**
 * A minute of one or more readings as lines over a y axis with gridlines
 * and a time axis (-60 s .. now), drawn at the container's real width so
 * text is not stretched. Used by the Grafana look, with its colours and
 * a legend of each series' last and max values.
 */
import { useEffect, useRef, useState } from 'react'
import { HISTORY } from '@/store/monitor-store'
import { niceMax } from './format'

export interface Series {
  name: string
  color: string
  values: number[]
}

export interface ChartPalette {
  grid: string
  muted: string
  text: string
  /** How opaque the fill under each line is (0 for none). */
  fill: number
}

const PAD = { left: 52, right: 8, top: 8, bottom: 18 }
const TICKS = 4

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry?.contentRect.width ?? 0)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

function Legend({
  series,
  format,
  palette,
}: {
  series: Series[]
  format: (v: number) => string
  palette: ChartPalette
}) {
  return (
    <table className="text-xs tabular-nums" style={{ color: palette.text }}>
      <thead style={{ color: palette.muted }}>
        <tr>
          <th className="text-start font-normal" />
          <th className="w-20 text-end font-normal">Last</th>
          <th className="w-20 text-end font-normal">Max</th>
        </tr>
      </thead>
      <tbody>
        {series.map(s => (
          <tr key={s.name}>
            <td className="truncate">
              <span
                className="me-1.5 inline-block h-[3px] w-3 align-middle"
                style={{ background: s.color }}
              />
              {s.name}
            </td>
            <td className="text-end">{format(s.values.at(-1) ?? 0)}</td>
            <td className="text-end">{format(Math.max(0, ...s.values))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function TimeSeries({
  series,
  max,
  format,
  palette,
  height = 150,
  legend = false,
}: {
  series: Series[]
  /** A fixed top (100 for percentages); otherwise a round value above the data. */
  max?: number
  format: (v: number) => string
  palette: ChartPalette
  height?: number
  legend?: boolean
}) {
  const { ref, width } = useWidth()
  const top = max ?? niceMax(Math.max(0, ...series.flatMap(s => s.values)))
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const x = (i: number, n: number) =>
    PAD.left + plotW - ((n - 1 - i) / (HISTORY - 1)) * plotW
  const y = (v: number) => PAD.top + plotH - (Math.min(v, top) / top) * plotH
  const base = PAD.top + plotH

  return (
    <div className="flex flex-col gap-1">
      <div ref={ref} className="w-full">
        {width > 0 && (
          <svg width={width} height={height}>
            {Array.from({ length: TICKS + 1 }, (_, i) => {
              const v = (top / TICKS) * i
              return (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    x2={PAD.left + plotW}
                    y1={y(v)}
                    y2={y(v)}
                    stroke={palette.grid}
                  />
                  <text
                    x={PAD.left - 6}
                    y={y(v) + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill={palette.muted}
                  >
                    {format(v)}
                  </text>
                </g>
              )
            })}
            {[60, 45, 30, 15, 0].map(s => {
              const px = PAD.left + plotW - (s / (HISTORY - 1)) * plotW
              return (
                <text
                  key={s}
                  x={Math.min(px, PAD.left + plotW - 10)}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={palette.muted}
                >
                  {s === 0 ? 'now' : `-${s}s`}
                </text>
              )
            })}
            {series.map(s => {
              if (s.values.length < 2) return null
              const n = s.values.length
              const pts = s.values.map((v, i) => `${x(i, n)},${y(v)}`)
              return (
                <g key={s.name}>
                  {palette.fill > 0 && (
                    <polygon
                      points={`${x(0, n)},${base} ${pts.join(' ')} ${x(n - 1, n)},${base}`}
                      fill={s.color}
                      fillOpacity={palette.fill}
                    />
                  )}
                  <polyline
                    points={pts.join(' ')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                </g>
              )
            })}
          </svg>
        )}
      </div>
      {legend && <Legend series={series} format={format} palette={palette} />}
    </div>
  )
}
