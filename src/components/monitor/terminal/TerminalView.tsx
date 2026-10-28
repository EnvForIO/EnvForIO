/**
 * The terminal look, after nvitop and btop: monospace text in titled
 * boxes, bars made of block characters, sparklines of ▁..█, and a row per
 * GPU with utilisation, memory, temperature, power, fan and clock. Dark
 * (a Nord-like palette) whatever the app theme is, as a terminal would be.
 */
import { useTranslation } from 'react-i18next'
import { useMachineInfo } from '@/api/monitor'
import type { GpuSample, Sample } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import {
  bytes,
  cells,
  ghz,
  lastN,
  level,
  rate,
  share,
  sparkText,
  type Level,
} from '../format'

const T = {
  bg: '#0b0e14',
  box: '#3b4252',
  title: '#88c0d0',
  text: '#d8dee9',
  dim: '#4c566a',
  accent: '#b48ead',
}
const LEVEL: Record<Level, string> = {
  ok: '#a3be8c',
  warn: '#ebcb8b',
  bad: '#bf616a',
}
const WIDTH = 30

function Box({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset
      className="min-w-0 rounded-sm border px-3 pt-1 pb-2"
      style={{ borderColor: T.box }}
    >
      <legend className="px-1" style={{ color: T.title }}>
        {title}
      </legend>
      <div className="flex flex-col gap-0.5">{children}</div>
    </fieldset>
  )
}

/** `NAME [█████░░░░░] 42%  note`, the filled part in its threshold colour. */
function Bar({
  name,
  pct,
  note,
}: {
  name: string
  pct: number
  note?: string
}) {
  const filled = cells(pct, WIDTH)
  return (
    <div className="whitespace-pre">
      <span style={{ color: T.dim }}>{name.padEnd(5)}[</span>
      <span style={{ color: LEVEL[level(pct)] }}>{'█'.repeat(filled)}</span>
      <span style={{ color: T.dim }}>{'░'.repeat(WIDTH - filled)}]</span>
      <span>{` ${Math.round(pct).toString().padStart(3)}%`}</span>
      {note && <span style={{ color: T.dim }}>{`  ${note}`}</span>}
    </div>
  )
}

function Spark({
  values,
  max = 100,
  color,
}: {
  values: number[]
  max?: number
  color: string
}) {
  return (
    <div className="truncate whitespace-pre" style={{ color }}>
      {sparkText(lastN(values, 60), max)}
    </div>
  )
}

function Gpu({ gpu, history }: { gpu: GpuSample; history: Sample[] }) {
  const vram = share(gpu.memoryUsed ?? 0, gpu.memoryTotal ?? 0)
  const facts = [
    gpu.temperature === null ? null : `${gpu.temperature}°C`,
    gpu.powerWatts === null
      ? null
      : `${Math.round(gpu.powerWatts)}${gpu.powerLimitWatts ? ` / ${Math.round(gpu.powerLimitWatts)}` : ''} W`,
    gpu.fanPercent === null ? null : `Fan ${gpu.fanPercent}%`,
    gpu.clockMhz === null ? null : `${gpu.clockMhz} MHz`,
  ].filter(Boolean)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="truncate whitespace-pre">
        <span style={{ color: T.accent }}>{`GPU ${gpu.index}  `}</span>
        <span>{gpu.name}</span>
        <span style={{ color: T.dim }}>{`   ${facts.join('  ')}`}</span>
      </div>
      <Bar name="UTIL" pct={gpu.usage ?? 0} />
      <Bar
        name="MEM"
        pct={vram}
        note={
          gpu.memoryUsed === null
            ? undefined
            : `${bytes(gpu.memoryUsed)} / ${bytes(gpu.memoryTotal ?? 0)}`
        }
      />
      <Spark
        values={history.map(
          s => s.gpus.find(g => g.index === gpu.index)?.usage ?? 0
        )}
        color={LEVEL.ok}
      />
    </div>
  )
}

export function TerminalView() {
  const { t } = useTranslation()
  const history = useMonitorStore(state => state.history)
  const { data: info } = useMachineInfo()
  const now = history.at(-1)
  const font = {
    fontFamily: "'Cascadia Mono', Consolas, 'DejaVu Sans Mono', monospace",
  }
  if (!now) {
    return (
      <p
        className="p-3 text-sm"
        style={{ ...font, background: T.bg, color: T.text }}
      >
        {t('monitor.waiting')}
      </p>
    )
  }

  const mem = share(now.memory.used, now.memory.total)
  const swap = share(now.memory.swapUsed, now.memory.swapTotal)
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(34rem,1fr))] gap-2 rounded-md p-3 text-[12.5px] leading-snug"
      style={{ ...font, background: T.bg, color: T.text }}
    >
      {now.gpus.length > 0 && (
        <Box title="gpu">
          {now.gpus.map(g => (
            <Gpu key={g.index} gpu={g} history={history} />
          ))}
        </Box>
      )}
      <Box title="cpu">
        <div className="truncate whitespace-pre" style={{ color: T.dim }}>
          {[
            info?.cpuBrand,
            `${now.cpu.cores.length} threads`,
            now.cpu.frequencyMhz > 0 ? ghz(now.cpu.frequencyMhz) : null,
          ]
            .filter(Boolean)
            .join('  ')}
        </div>
        <Bar name="TOTAL" pct={now.cpu.usage} />
        <Spark values={history.map(s => s.cpu.usage)} color={T.title} />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-x-3">
          {now.cpu.cores.map((core, i) => (
            <div key={i} className="whitespace-pre">
              <span
                style={{ color: T.dim }}
              >{`C${i.toString().padStart(2, '0')} `}</span>
              <span style={{ color: LEVEL[level(core)] }}>
                {sparkText(
                  lastN(
                    history.map(s => s.cpu.cores[i] ?? 0),
                    8
                  )
                )}
              </span>
              <span>{` ${Math.round(core).toString().padStart(3)}%`}</span>
            </div>
          ))}
        </div>
      </Box>
      <Box title="mem">
        <Bar
          name="RAM"
          pct={mem}
          note={`${bytes(now.memory.used)} / ${bytes(now.memory.total)}`}
        />
        {now.memory.swapTotal > 0 && (
          <Bar
            name="SWAP"
            pct={swap}
            note={`${bytes(now.memory.swapUsed)} / ${bytes(now.memory.swapTotal)}`}
          />
        )}
        <Spark
          values={history.map(s => share(s.memory.used, s.memory.total))}
          color={T.accent}
        />
      </Box>
      <Box title="disk">
        {now.drives.map(d => (
          <Bar
            key={d.mount}
            name={d.mount.length > 5 ? `${d.mount.slice(0, 4)}…` : d.mount}
            pct={share(d.total - d.available, d.total)}
            note={`${bytes(d.available)} free / ${bytes(d.total)}`}
          />
        ))}
        <div className="whitespace-pre">
          <span style={{ color: T.dim }}>IO </span>
          <span
            style={{ color: LEVEL.warn }}
          >{`R ${rate(now.disk.read)}`}</span>
          <span style={{ color: T.dim }}> </span>
          <span
            style={{ color: LEVEL.bad }}
          >{`W ${rate(now.disk.written)}`}</span>
        </div>
      </Box>
    </div>
  )
}
