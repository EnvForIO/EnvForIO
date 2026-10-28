/**
 * The machine's readings as lanes: CPU (with each thread), memory, each
 * GPU, and disk (with each drive's space). Reads the monitor store; the
 * caller runs useMonitorFeed.
 */
import { useTranslation } from 'react-i18next'
import { useMachineInfo } from '@/api/monitor'
import type { GpuSample, Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import { COLOR, bytes, ghz, percent, rate, share } from './format'
import { Bar, Lane } from './Lane'

const pick = (history: Sample[], read: (s: Sample) => number) =>
  history.map(read)

function GpuLane({ gpu, history }: { gpu: GpuSample; history: Sample[] }) {
  const { t } = useTranslation()
  const of = (s: Sample) => s.gpus.find(g => g.index === gpu.index)
  return (
    <Lane
      title={gpu.name || t('monitor.gpu')}
      value={gpu.usage === null ? '–' : percent(gpu.usage)}
      details={[
        gpu.memoryUsed !== null && gpu.memoryTotal !== null
          ? `${t('monitor.vram')} ${bytes(gpu.memoryUsed)} / ${bytes(gpu.memoryTotal)}`
          : null,
        gpu.temperature === null ? null : `${gpu.temperature} °C`,
        gpu.powerWatts === null
          ? null
          : `${Math.round(gpu.powerWatts)}${gpu.powerLimitWatts ? ` / ${Math.round(gpu.powerLimitWatts)}` : ''} W`,
        gpu.fanPercent === null
          ? null
          : `${t('monitor.fan')} ${gpu.fanPercent}%`,
        gpu.clockMhz === null ? null : `${gpu.clockMhz} MHz`,
      ]}
      series={[
        {
          values: pick(history, s => of(s)?.usage ?? 0),
          color: COLOR.gpu,
        },
      ]}
      max={100}
    />
  )
}

export function Lanes() {
  const { t } = useTranslation()
  const history = useMonitorStore(state => state.history)
  const { data: info } = useMachineInfo()
  const now = history.at(-1)
  if (!now) {
    return (
      <p className="text-sm text-muted-foreground">{t('monitor.waiting')}</p>
    )
  }

  const memory = share(now.memory.used, now.memory.total)
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-3">
      <Lane
        title={t('monitor.cpu')}
        value={percent(now.cpu.usage)}
        details={[
          info?.cpuBrand ?? null,
          now.cpu.frequencyMhz > 0 ? ghz(now.cpu.frequencyMhz) : null,
          t('monitor.threads', { count: now.cpu.cores.length }),
        ]}
        series={[{ values: pick(history, s => s.cpu.usage), color: COLOR.cpu }]}
        max={100}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] gap-0.5">
          {now.cpu.cores.map((core, i) => (
            <div
              key={i}
              title={`#${i} ${percent(core)}`}
              className="h-4 overflow-hidden rounded-sm bg-muted"
            >
              <div
                className="w-full"
                style={{
                  height: '100%',
                  background: COLOR.cpu,
                  opacity: 0.15 + (core / 100) * 0.85,
                }}
              />
            </div>
          ))}
        </div>
      </Lane>
      <Lane
        title={t('monitor.memory')}
        value={percent(memory)}
        details={[
          `${bytes(now.memory.used)} / ${bytes(now.memory.total)}`,
          now.memory.swapTotal > 0
            ? `${t('monitor.swap')} ${bytes(now.memory.swapUsed)}`
            : null,
        ]}
        series={[
          {
            values: pick(history, s => share(s.memory.used, s.memory.total)),
            color: COLOR.memory,
          },
        ]}
        max={100}
      />
      {now.gpus.map(gpu => (
        <GpuLane key={gpu.index} gpu={gpu} history={history} />
      ))}
      <Lane
        title={t('monitor.disk')}
        value={`R ${rate(now.disk.read)}`}
        details={[`W ${rate(now.disk.written)}`]}
        series={[
          { values: pick(history, s => s.disk.read), color: COLOR.read },
          { values: pick(history, s => s.disk.written), color: COLOR.written },
        ]}
      >
        <div className="flex flex-col gap-1.5">
          {now.drives.map(d => {
            const used = share(d.total - d.available, d.total)
            return (
              <div key={d.mount} className="flex flex-col gap-0.5 text-xs">
                <div className="flex gap-2 tabular-nums">
                  <span className="font-medium">{d.mount}</span>
                  <span className="ms-auto text-muted-foreground">
                    {t('monitor.free', { size: bytes(d.available) })} /{' '}
                    {bytes(d.total)}
                  </span>
                </div>
                <Bar
                  value={used}
                  color={used > 90 ? COLOR.written : COLOR.read}
                />
              </div>
            )
          })}
        </div>
      </Lane>
    </div>
  )
}
