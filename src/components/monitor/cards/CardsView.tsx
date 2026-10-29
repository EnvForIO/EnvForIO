/**
 * The Monitor page's cards: CPU (with a cell per thread), memory, every
 * GPU and disk (with each drive's space), each with a minute's chart.
 * Colours follow the values as Grafana's thresholds do: green while low,
 * yellow from 70 %, red from 90 % (GPU temperature: 70 °C and 85 °C).
 * Disk speed has no "too high", so it stays a neutral blue and purple.
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
import {
  LEVEL_COLOR,
  NEUTRAL,
  bytes,
  ghz,
  pctColor,
  percent,
  rate,
  share,
  tempLevel,
} from '../format'
import { Bar, Lane } from '../Lane'

const pick = (history: Sample[], read: (s: Sample) => number) =>
  history.map(read)

function GpuCard({ gpu, history }: { gpu: GpuSample; history: Sample[] }) {
  const { t } = useTranslation()
  const usage = gpu.usage ?? 0
  const color = pctColor(usage)
  const vram = share(gpu.memoryUsed ?? 0, gpu.memoryTotal ?? 0)
  const power = share(gpu.powerWatts ?? 0, gpu.powerLimitWatts ?? 0)
  return (
    <Lane
      icon={GaugeIcon}
      color={color}
      title={gpu.name || t('monitor.gpu')}
      value={gpu.usage === null ? '–' : percent(usage)}
      facts={[
        [
          t('monitor.temperature'),
          gpu.temperature === null ? null : `${gpu.temperature} °C`,
          gpu.temperature === null
            ? undefined
            : LEVEL_COLOR[tempLevel(gpu.temperature)],
        ],
        [
          t('monitor.power'),
          gpu.powerWatts === null
            ? null
            : `${Math.round(gpu.powerWatts)}${gpu.powerLimitWatts ? ` / ${Math.round(gpu.powerLimitWatts)}` : ''} W`,
          gpu.powerLimitWatts ? pctColor(power) : undefined,
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
          color,
        },
      ]}
      max={100}
    >
      {gpu.memoryUsed !== null && gpu.memoryTotal !== null && (
        <Bar
          label={t('monitor.vram')}
          detail={`${bytes(gpu.memoryUsed)} / ${bytes(gpu.memoryTotal)}`}
          value={vram}
          color={pctColor(vram)}
        />
      )}
    </Lane>
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

  const memory = share(now.memory.used, now.memory.total)
  const swap = share(now.memory.swapUsed, now.memory.swapTotal)
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-4">
      <Lane
        icon={CpuIcon}
        color={pctColor(now.cpu.usage)}
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
        series={[
          {
            values: pick(history, s => s.cpu.usage),
            color: pctColor(now.cpu.usage),
          },
        ]}
        max={100}
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(1.1rem,1fr))] gap-1">
          {now.cpu.cores.map((core, i) => (
            <div
              key={i}
              title={`#${i} ${percent(core)}`}
              className="h-3.5 rounded-[3px] transition-[opacity,background-color] duration-500"
              style={{
                background: pctColor(core),
                opacity: 0.25 + (core / 100) * 0.75,
              }}
            />
          ))}
        </div>
      </Lane>
      <Lane
        icon={MemoryStickIcon}
        color={pctColor(memory)}
        title={t('monitor.memory')}
        value={percent(memory)}
        series={[
          {
            values: pick(history, s => share(s.memory.used, s.memory.total)),
            color: pctColor(memory),
          },
        ]}
        max={100}
      >
        <Bar
          label="RAM"
          detail={`${bytes(now.memory.used)} / ${bytes(now.memory.total)}`}
          value={memory}
          color={pctColor(memory)}
        />
        {now.memory.swapTotal > 0 && (
          <Bar
            label={t('monitor.swap')}
            detail={`${bytes(now.memory.swapUsed)} / ${bytes(now.memory.swapTotal)}`}
            value={swap}
            color={pctColor(swap)}
          />
        )}
      </Lane>
      {now.gpus.map(gpu => (
        <GpuCard key={gpu.index} gpu={gpu} history={history} />
      ))}
      <Lane
        icon={HardDriveIcon}
        color={NEUTRAL.read}
        title={t('monitor.disk')}
        value={rate(now.disk.read + now.disk.written)}
        facts={[
          [t('monitor.read'), rate(now.disk.read), NEUTRAL.read],
          [t('monitor.written'), rate(now.disk.written), NEUTRAL.written],
        ]}
        series={[
          { values: pick(history, s => s.disk.read), color: NEUTRAL.read },
          {
            values: pick(history, s => s.disk.written),
            color: NEUTRAL.written,
          },
        ]}
      >
        {now.drives.map(d => {
          const used = share(d.total - d.available, d.total)
          return (
            <Bar
              key={d.mount}
              label={d.mount}
              detail={`${t('monitor.free', { size: bytes(d.available) })} / ${bytes(d.total)}`}
              value={used}
              color={pctColor(used)}
            />
          )
        })}
      </Lane>
    </div>
  )
}
