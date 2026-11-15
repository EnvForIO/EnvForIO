/**
 * DCGM-style heatmap: a row per GPU (or one CPU row on a machine without
 * GPUs), a cell per second of the last minute, coloured from pale green
 * through yellow to red like the rest of the Monitor page, and the latest
 * value at the end in its level colour, as the GPU tiles show it.
 *
 * Restyled after "this long bar is too ugly" (user, 2026-11-21): the rows
 * still fill the tile, but each is one continuous strip with hairline
 * seams instead of sixty separately rounded pills. Hovering a cell gives
 * its second and value.
 */
import { useTranslation } from 'react-i18next'
import type { Sample } from '@/lib/tauri-bindings'
import { HISTORY } from '@/store/monitor-store'
import { heat, pctColor, percent } from '../format'
import { Tile } from '../parts'

const SCALE = Array.from({ length: 24 }, (_, i) => (i * 100) / 23)

function Row({ label, values }: { label: string; values: number[] }) {
  const { t } = useTranslation()
  const padded = [
    ...Array<number | null>(Math.max(0, HISTORY - values.length)).fill(null),
    ...values,
  ]
  const latest = values.at(-1)
  return (
    <div className="flex min-h-5 flex-1 items-stretch gap-3">
      <span className="flex w-12 shrink-0 items-center text-xs text-[var(--m-muted)]">
        {label}
      </span>
      <div
        className="grid flex-1 gap-px overflow-hidden rounded-lg"
        style={{ gridTemplateColumns: `repeat(${HISTORY}, minmax(0, 1fr))` }}
      >
        {padded.map((v, i) => (
          <span
            key={i}
            title={
              v === null
                ? undefined
                : t('monitor.secondsAgo', {
                    count: HISTORY - 1 - i,
                    value: percent(v),
                  })
            }
            className="transition-colors duration-500"
            style={{ background: v === null ? 'var(--m-track)' : heat(v) }}
          />
        ))}
      </div>
      <span
        className="flex w-12 shrink-0 items-center justify-end text-lg font-semibold tabular-nums"
        style={{ color: latest === undefined ? undefined : pctColor(latest) }}
      >
        {latest === undefined ? '' : percent(latest)}
      </span>
    </div>
  )
}

export function Heatmap({ history }: { history: Sample[] }) {
  const { t } = useTranslation()
  const now = history.at(-1)
  const gpus = now?.gpus ?? []
  return (
    <Tile className="flex min-h-56 flex-col gap-3">
      <div className="flex items-baseline">
        <span className="text-[13px] font-medium">
          {gpus.length > 0
            ? t('monitor.gpuUtilisation')
            : t('monitor.cpuUtilisation')}
        </span>
        <span className="ms-auto text-[11px] text-[var(--m-muted)]">
          {t('monitor.lastMinute')}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">
        {gpus.length > 0 ? (
          gpus.map(g => (
            <Row
              key={g.index}
              label={`GPU ${g.index}`}
              values={history.map(
                s => s.gpus.find(x => x.index === g.index)?.usage ?? 0
              )}
            />
          ))
        ) : (
          <Row
            label={t('monitor.cpu')}
            values={history.map(s => s.cpu.usage)}
          />
        )}
      </div>
      <div className="flex items-center gap-2 ps-15 text-[11px] text-[var(--m-muted)]">
        <span>0%</span>
        <span className="flex h-1.5 w-28 overflow-hidden rounded-full">
          {SCALE.map(p => (
            <span key={p} className="flex-1" style={{ background: heat(p) }} />
          ))}
        </span>
        <span>100%</span>
      </div>
    </Tile>
  )
}
