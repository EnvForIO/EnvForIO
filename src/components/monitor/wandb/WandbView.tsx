/**
 * The Weights & Biases look: a "System" section like a run's system
 * metrics page, a grid of single-metric line charts (GPU utilisation,
 * memory, temperature, power; CPU; system memory; disk), each with its
 * title and one line per GPU or drive in wandb's run colours. Follows the
 * app's light or dark theme, as wandb does.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from 'lucide-react'
import type { Sample } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitor-store'
import { bytes, rate, share } from '../format'
import { TimeSeries, type ChartPalette, type Series } from '../TimeSeries'

/** wandb's run colours, in its order. */
const RUN = [
  '#5387dd',
  '#da4c4c',
  '#479a5f',
  '#7d54b2',
  '#e87b9f',
  '#e57439',
  '#a0c75c',
  '#87cebf',
]
const color = (i: number): string => RUN[i % RUN.length] ?? '#5387dd'

const PALETTE: ChartPalette = {
  grid: 'var(--border)',
  muted: 'var(--muted-foreground)',
  text: 'var(--foreground)',
  fill: 0,
}

const num = (digits: number) => (v: number) => v.toFixed(digits)

function Chart({
  title,
  series,
  max,
  format,
}: {
  title: string
  series: Series[]
  max?: number
  format: (v: number) => string
}) {
  return (
    <section className="flex flex-col gap-1 rounded-md border bg-card p-3 shadow-xs">
      <h3 className="truncate text-center text-[13px] font-semibold">
        {title}
      </h3>
      <TimeSeries
        series={series}
        max={max}
        format={format}
        palette={PALETTE}
        height={170}
      />
      {series.length > 1 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {series.map(s => (
            <span key={s.name} className="flex items-center gap-1">
              <span
                className="h-0.5 w-3 rounded"
                style={{ background: s.color }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export function WandbView() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const history = useMonitorStore(state => state.history)
  const now = history.at(-1)
  if (!now) {
    return (
      <p className="text-sm text-muted-foreground">{t('monitor.waiting')}</p>
    )
  }

  const of = (read: (s: Sample) => number) => history.map(read)
  const perGpu = (
    read: (g: Sample['gpus'][number]) => number | null
  ): Series[] =>
    now.gpus.map((g, i) => ({
      name: `GPU ${g.index}`,
      color: color(i),
      values: of(s => {
        const x = s.gpus.find(y => y.index === g.index)
        return x ? (read(x) ?? 0) : 0
      }),
    }))
  const hasGpu = now.gpus.length > 0
  const charts: {
    title: string
    series: Series[]
    max?: number
    format: (v: number) => string
  }[] = [
    ...(hasGpu
      ? [
          {
            title: 'GPU Utilization (%)',
            series: perGpu(g => g.usage),
            max: 100,
            format: num(0),
          },
          {
            title: 'GPU Memory Allocated (%)',
            series: perGpu(g => share(g.memoryUsed ?? 0, g.memoryTotal ?? 0)),
            max: 100,
            format: num(0),
          },
          {
            title: 'GPU Memory Allocated (Bytes)',
            series: perGpu(g => g.memoryUsed),
            format: bytes,
          },
          {
            title: 'GPU Temp (°C)',
            series: perGpu(g => g.temperature),
            format: num(0),
          },
          {
            title: 'GPU Power Usage (W)',
            series: perGpu(g => g.powerWatts),
            format: num(0),
          },
          {
            title: 'GPU Power Usage (%)',
            series: perGpu(g =>
              share(g.powerWatts ?? 0, g.powerLimitWatts ?? 0)
            ),
            max: 100,
            format: num(0),
          },
        ]
      : []),
    {
      title: 'CPU Utilization (%)',
      series: [
        {
          name: t('monitor.cpu'),
          color: color(0),
          values: of(s => s.cpu.usage),
        },
      ],
      max: 100,
      format: num(0),
    },
    {
      title: 'System Memory Utilization (%)',
      series: [
        {
          name: 'RAM',
          color: color(0),
          values: of(s => share(s.memory.used, s.memory.total)),
        },
      ],
      max: 100,
      format: num(0),
    },
    {
      title: 'Disk I/O',
      series: [
        {
          name: t('monitor.read'),
          color: color(0),
          values: of(s => s.disk.read),
        },
        {
          name: t('monitor.written'),
          color: color(1),
          values: of(s => s.disk.written),
        },
      ],
      format: rate,
    },
    {
      title: 'Disk Utilization (%)',
      series: now.drives.map((d, i) => ({
        name: d.mount,
        color: color(i),
        values: of(s => {
          const x = s.drives.find(y => y.mount === d.mount)
          return x ? share(x.total - x.available, x.total) : 0
        }),
      })),
      max: 100,
      format: num(0),
    },
  ]

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-semibold"
      >
        <ChevronDownIcon
          className={cn('size-4 transition-transform', !open && '-rotate-90')}
        />
        System
        <span className="rounded bg-muted px-1.5 text-xs font-normal text-muted-foreground">
          {charts.length}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-3">
          {charts.map(c => (
            <Chart key={c.title} {...c} />
          ))}
        </div>
      )}
    </section>
  )
}
