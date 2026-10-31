/**
 * One GPU in the detail: its use as a big number in its threshold colour
 * beside a minute's curve, temperature, VRAM and power, then its programs.
 */
import { useTranslation } from 'react-i18next'
import type { GpuSample, Sample } from '@/lib/tauri-bindings'
import { LEVEL_COLOR, bytes, pctColor, share, tempLevel } from '../format'
import { gpuName } from '../machine'
import { Meter, Tile } from '../parts'
import { Sparkline } from '../Sparkline'
import { GpuPrograms } from './GpuPrograms'

export function GpuTile({
  gpu,
  history,
}: {
  gpu: GpuSample
  history: Sample[]
}) {
  const { t } = useTranslation()
  const usage = gpu.usage ?? 0
  const color = pctColor(usage)
  const vram = share(gpu.memoryUsed ?? 0, gpu.memoryTotal ?? 0)
  const values = history.map(
    s => s.gpus.find(g => g.index === gpu.index)?.usage ?? 0
  )

  return (
    <Tile className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-[11px] text-[var(--m-muted)]">
        <span className="truncate">
          GPU {gpu.index} · {gpuName(gpu.name)}
        </span>
        {gpu.temperature !== null && (
          <span
            className="ms-auto shrink-0 tabular-nums"
            style={{ color: LEVEL_COLOR[tempLevel(gpu.temperature)] }}
          >
            {gpu.temperature}°C
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <p
          className="w-[4.5ch] shrink-0 text-4xl leading-none font-medium tracking-tight tabular-nums"
          style={{ color }}
        >
          {gpu.usage === null ? '–' : Math.round(usage)}
          {gpu.usage !== null && <span className="text-base">%</span>}
        </p>
        <Sparkline
          series={[{ values, color }]}
          max={100}
          className="h-9 min-w-0 flex-1"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex text-[11px] text-[var(--m-muted)] tabular-nums">
          <span>
            {t('monitor.vram')}{' '}
            {gpu.memoryUsed === null
              ? '–'
              : `${bytes(gpu.memoryUsed)} / ${bytes(gpu.memoryTotal ?? 0)}`}
          </span>
          {gpu.powerWatts !== null && (
            <span className="ms-auto">
              {Math.round(gpu.powerWatts)}
              {gpu.powerLimitWatts
                ? ` / ${Math.round(gpu.powerLimitWatts)}`
                : ''}{' '}
              W
            </span>
          )}
        </div>
        <Meter value={vram} color={pctColor(vram)} />
      </div>
      <GpuPrograms processes={gpu.processes} />
    </Tile>
  )
}
