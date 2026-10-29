/**
 * The Grafana look: stat panels on top (CPU, memory, each GPU, the
 * fullest drive), gauges per GPU, then time series for usage, memory and
 * disk I/O, and a bar gauge per drive. Grafana's light theme (dark in dark mode).
 */
import { useTranslation } from 'react-i18next'
import { useMachineInfo } from '@/api/monitor'
import type { Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import { bytes, percent, rate, share } from '../format'
import { Gauge } from './Gauge'
import { BarGauge, Panel, Stat } from './Panel'
import { TimeSeries } from '../TimeSeries'
import { CHART, G } from './theme'

const GPU_COLORS = [G.green, G.orange, G.yellow, G.red]
const pct = (v: number) => percent(v)

export function GrafanaView() {
  const { t } = useTranslation()
  const history = useMonitorStore(state => state.history)
  const { data: info } = useMachineInfo()
  const now = history.at(-1)
  if (!now) {
    return (
      <p className="text-sm text-muted-foreground">{t('monitor.waiting')}</p>
    )
  }

  const of = (read: (s: Sample) => number) => history.map(read)
  const memPct = share(now.memory.used, now.memory.total)
  const gpuOf = (s: Sample, index: number) =>
    s.gpus.find(g => g.index === index)
  const fullest = [...now.drives].sort(
    (a, b) =>
      share(b.total - b.available, b.total) -
      share(a.total - a.available, a.total)
  )[0]

  return (
    <div
      className="grafana flex flex-col gap-2 rounded-md p-2"
      style={{ background: G.page }}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2">
        <Stat
          title={t('monitor.cpu')}
          value={Math.round(now.cpu.usage).toString()}
          unit="%"
          pct={now.cpu.usage}
          sub={info?.cpuBrand}
          history={of(s => s.cpu.usage)}
        />
        <Stat
          title={t('monitor.memory')}
          value={Math.round(memPct).toString()}
          unit="%"
          pct={memPct}
          sub={`${bytes(now.memory.used)} / ${bytes(now.memory.total)}`}
          history={of(s => share(s.memory.used, s.memory.total))}
        />
        {now.gpus.map(g => (
          <Stat
            key={g.index}
            title={`GPU ${g.index}`}
            value={g.usage === null ? '–' : Math.round(g.usage).toString()}
            unit={g.usage === null ? undefined : '%'}
            pct={g.usage ?? 0}
            sub={g.name}
            history={of(s => gpuOf(s, g.index)?.usage ?? 0)}
          />
        ))}
        {fullest && (
          <Stat
            title={`${t('monitor.disk')} ${fullest.mount}`}
            value={Math.round(
              share(fullest.total - fullest.available, fullest.total)
            ).toString()}
            unit="%"
            pct={share(fullest.total - fullest.available, fullest.total)}
            sub={t('monitor.free', { size: bytes(fullest.available) })}
            history={[]}
          />
        )}
      </div>

      {now.gpus.map(g => {
        const vram = share(g.memoryUsed ?? 0, g.memoryTotal ?? 0)
        const power = share(g.powerWatts ?? 0, g.powerLimitWatts ?? 0)
        return (
          <Panel key={g.index} title={`GPU ${g.index} · ${g.name}`}>
            <div className="flex flex-wrap justify-around gap-2">
              <Gauge
                pct={g.usage ?? 0}
                value={pct(g.usage ?? 0)}
                label={t('monitor.utilisation')}
              />
              <Gauge pct={vram} value={pct(vram)} label={t('monitor.vram')} />
              {g.temperature !== null && (
                <Gauge
                  pct={g.temperature}
                  value={`${g.temperature}°C`}
                  label={t('monitor.temperature')}
                />
              )}
              {g.powerWatts !== null && (
                <Gauge
                  pct={power}
                  value={`${Math.round(g.powerWatts)}W`}
                  label={t('monitor.power')}
                />
              )}
              {g.fanPercent !== null && (
                <Gauge
                  pct={g.fanPercent}
                  value={pct(g.fanPercent)}
                  label={t('monitor.fan')}
                />
              )}
            </div>
          </Panel>
        )
      })}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-2">
        <Panel title={t('monitor.usage')}>
          <TimeSeries
            palette={CHART}
            legend
            max={100}
            format={pct}
            series={[
              {
                name: t('monitor.cpu'),
                color: G.blue,
                values: of(s => s.cpu.usage),
              },
              ...now.gpus.map((g, i) => ({
                name: `GPU ${g.index}`,
                color: GPU_COLORS[i % GPU_COLORS.length] ?? G.green,
                values: of(s => gpuOf(s, g.index)?.usage ?? 0),
              })),
            ]}
          />
        </Panel>
        <Panel title={t('monitor.memory')}>
          <TimeSeries
            palette={CHART}
            legend
            max={100}
            format={pct}
            series={[
              {
                name: 'RAM',
                color: G.purple,
                values: of(s => share(s.memory.used, s.memory.total)),
              },
              ...now.gpus.map((g, i) => ({
                name: `VRAM ${g.index}`,
                color: GPU_COLORS[i % GPU_COLORS.length] ?? G.green,
                values: of(s => {
                  const x = gpuOf(s, g.index)
                  return share(x?.memoryUsed ?? 0, x?.memoryTotal ?? 0)
                }),
              })),
            ]}
          />
        </Panel>
        <Panel title={t('monitor.diskIo')}>
          <TimeSeries
            palette={CHART}
            legend
            format={v => rate(v)}
            series={[
              {
                name: t('monitor.read'),
                color: G.yellow,
                values: of(s => s.disk.read),
              },
              {
                name: t('monitor.written'),
                color: G.red,
                values: of(s => s.disk.written),
              },
            ]}
          />
        </Panel>
        <Panel title={t('monitor.drives')}>
          <div className="flex flex-col gap-2 pt-1">
            {now.drives.map(d => (
              <BarGauge
                key={d.mount}
                label={d.mount}
                pct={share(d.total - d.available, d.total)}
                text={`${bytes(d.total - d.available)} / ${bytes(d.total)}`}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
