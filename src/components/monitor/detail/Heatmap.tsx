/**
 * DCGM-style heatmap: a row per GPU (or one CPU row on a machine without
 * GPUs), a cell per second of the last minute, coloured from pale green
 * through yellow to red. Which card has been busy, and since when, reads
 * from across the room.
 */
import { useTranslation } from 'react-i18next'
import type { Sample } from '@/lib/tauri-bindings'
import { HISTORY } from '@/store/monitor-store'
import { heat } from '../format'
import { Tile } from '../parts'

const SCALE = Array.from({ length: 24 }, (_, i) => (i * 100) / 23)

function Row({ label, values }: { label: string; values: number[] }) {
  const padded = [
    ...Array<number>(Math.max(0, HISTORY - values.length)).fill(-1),
    ...values,
  ]
  return (
    <div className="flex min-h-5 flex-1 items-center gap-2">
      <span className="w-12 shrink-0 text-[11px] text-[var(--m-muted)]">
        {label}
      </span>
      <div
        className="grid h-full flex-1 gap-px"
        style={{ gridTemplateColumns: `repeat(${HISTORY}, minmax(0, 1fr))` }}
      >
        {padded.map((v, i) => (
          <span
            key={i}
            className="rounded-[2px]"
            style={{ background: v < 0 ? 'var(--m-track)' : heat(v) }}
          />
        ))}
      </div>
    </div>
  )
}

export function Heatmap({ history }: { history: Sample[] }) {
  const { t } = useTranslation()
  const now = history.at(-1)
  const gpus = now?.gpus ?? []
  return (
    <Tile className="flex min-h-56 flex-col gap-2">
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
      <div className="flex flex-1 flex-col gap-1">
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
      <div className="flex items-center gap-2 text-[11px] text-[var(--m-muted)]">
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
