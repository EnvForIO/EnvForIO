/**
 * The cards look (the first Monitor page, polished): a card each for CPU
 * (with a cell per thread), memory, every GPU and disk (with each drive's
 * space), each with a minute's chart. Follows the app theme.
 */
import { useTranslation } from 'react-i18next'
import {
  CpuIcon,
  GaugeIcon,
  HardDriveIcon,
  MemoryStickIcon,
} from 'lucide-react'
import { useMachineInfo } from '@/api/monitor'
import type { GpuSample, Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import { COLOR, bytes, ghz, percent, rate, share } from '../format'
import { Bar, Lane } from '../Lane'

const pick = (history: Sample[], read: (s: Sample) => number) =>
  history.map(read)

function GpuCard({ gpu, history }: { gpu: GpuSample; history: Sample[] }) {
  const { t } = useTranslation()
  return (
    <Lane
      icon={GaugeIcon}
      color={COLOR.gpu}
      title={gpu.name || t('monitor.gpu')}
      value={gpu.usage === null ? '–' : percent(gpu.usage)}
      facts={[
        [
          t('monitor.vram'),
          gpu.memoryUsed !== null && gpu.memoryTotal !== null
            ? `${bytes(gpu.memoryUsed)} / ${bytes(gpu.memoryTotal)}`
            : null,
        ],
        [
          t('monitor.temperature'),
          gpu.temperature === null ? null : `${gpu.temperature} °C`,
        ],
        [
          t('monitor.power'),
          gpu.powerWatts === null
            ? null
            : `${Math.round(gpu.powerWatts)}${gpu.powerLimitWatts ? ` / ${Math.round(gpu.powerLimitWatts)}` : ''} W`,
        ],
        [
          t('monitor.fan'),
          gpu.fanPercent === null ? null : `${gpu.fanPercent}%`,
        ],
        [
          t('monitor.clock'),
          gpu.clockMhz === null ? null : `${gpu.clockMhz} MHz`,
        ],
      ]}
      series={[
        {
          values: pick(
            history,
            s => s.gpus.find(g => g.index === gpu.index)?.usage ?? 0
          ),
          color: COLOR.gpu,
        },
      ]}
      max={100}
    />
  )
}

export function CardsView() {
  const { t } = useTranslation()
  const history = useMonitorStore(state => state.history)
  const { data: info } = useMachineInfo()
  const now = history.at(-1)
  if (!now) {
    return (
      <p className="text-sm text-muted-foreground">{t('monitor.waiting')}</p>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-4">
      <Lane
        icon={CpuIcon}
        color={COLOR.cpu}
        title={t('monitor.cpu')}
        value={percent(now.cpu.usage)}
        facts={[
          [t('monitor.model'), info?.cpuBrand ?? null],
          [
            t('monitor.clock'),
            now.cpu.frequencyMhz > 0 ? ghz(now.cpu.frequencyMhz) : null,
          ],
          [t('monitor.threadsLabel'), String(now.cpu.cores.length)],
        ]}
        series={[{ values: pick(history, s => s.cpu.usage), color: COLOR.cpu }]}
        max={100}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(1.1rem,1fr))] gap-1">
          {now.cpu.cores.map((core, i) => (
            <div
              key={i}
              title={`#${i} ${percent(core)}`}
              className="h-3.5 rounded-[3px] transition-opacity duration-500"
              style={{
                background: COLOR.cpu,
                opacity: 0.12 + (core / 100) * 0.88,
              }}
            />
          ))}
        </div>
      </Lane>
      <Lane
        icon={MemoryStickIcon}
        color={COLOR.memory}
        title={t('monitor.memory')}
        value={percent(share(now.memory.used, now.memory.total))}
        facts={[
          [
            t('monitor.used'),
            `${bytes(now.memory.used)} / ${bytes(now.memory.total)}`,
          ],
          [
            t('monitor.swap'),
            now.memory.swapTotal > 0
              ? `${bytes(now.memory.swapUsed)} / ${bytes(now.memory.swapTotal)}`
              : null,
          ],
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
        <GpuCard key={gpu.index} gpu={gpu} history={history} />
      ))}
      <Lane
        icon={HardDriveIcon}
        color={COLOR.read}
        title={t('monitor.disk')}
        value={rate(now.disk.read + now.disk.written)}
        facts={[
          [t('monitor.read'), rate(now.disk.read)],
          [t('monitor.written'), rate(now.disk.written)],
        ]}
        series={[
          { values: pick(history, s => s.disk.read), color: COLOR.read },
          { values: pick(history, s => s.disk.written), color: COLOR.written },
        ]}
      >
        <div className="flex flex-col gap-2">
          {now.drives.map(d => {
            const used = share(d.total - d.available, d.total)
            return (
              <div key={d.mount} className="flex flex-col gap-1 text-xs">
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
