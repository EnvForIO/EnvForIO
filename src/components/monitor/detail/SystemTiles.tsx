/**
 * The detail's right column: CPU (big number, a cell per thread on the
 * heatmap scale, model and clock), then memory, swap, each drive and disk
 * speed as rounded meters in their threshold colours.
 */
import { useTranslation } from 'react-i18next'
import type { MachineInfo, Sample } from '@/lib/tauri-bindings'
import { bytes, ghz, heat, pctColor, percent, rate, share } from '../format'
import { Meter, Tile } from '../parts'

export function CpuTile({
  now,
  info,
}: {
  now: Sample
  info: MachineInfo | null | undefined
}) {
  const { t } = useTranslation()
  const facts = [
    info?.cpuBrand,
    t('monitor.threads', { count: now.cpu.cores.length }),
    now.cpu.frequencyMhz > 0 ? ghz(now.cpu.frequencyMhz) : null,
  ].filter(Boolean)
  return (
    <Tile className="flex flex-col gap-2">
      <div className="flex items-baseline">
        <span className="text-[11px] text-[var(--m-muted)]">
          {t('monitor.cpu')}
        </span>
        <span
          className="ms-auto text-2xl font-medium tracking-tight tabular-nums"
          style={{ color: pctColor(now.cpu.usage) }}
        >
          {percent(now.cpu.usage)}
        </span>
      </div>
      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-0.5">
        {now.cpu.cores.map((core, i) => (
          <span
            key={i}
            title={`#${i} ${percent(core)}`}
            className="aspect-square rounded-[2px] transition-colors duration-500"
            style={{ background: heat(core) }}
          />
        ))}
      </div>
      <p className="truncate text-[11px] text-[var(--m-muted)]">
        {facts.join(', ')}
      </p>
    </Tile>
  )
}

function Row({
  name,
  detail,
  pct,
}: {
  name: string
  detail: string
  pct: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="truncate text-xs">{name}</span>
        <span className="truncate text-[11px] text-[var(--m-muted)]">
          {detail}
        </span>
        <span
          className="ms-auto text-[13px] font-medium tabular-nums"
          style={{ color: pctColor(pct) }}
        >
          {percent(pct)}
        </span>
      </div>
      <Meter value={pct} color={pctColor(pct)} />
    </div>
  )
}

export function StorageTile({ now }: { now: Sample }) {
  const { t } = useTranslation()
  const { memory } = now
  return (
    <Tile className="flex flex-col justify-center gap-2.5">
      <Row
        name={t('monitor.memory')}
        detail={`${bytes(memory.used)} / ${bytes(memory.total)}`}
        pct={share(memory.used, memory.total)}
      />
      {memory.swapTotal > 0 && (
        <Row
          name={t('monitor.swap')}
          detail={`${bytes(memory.swapUsed)} / ${bytes(memory.swapTotal)}`}
          pct={share(memory.swapUsed, memory.swapTotal)}
        />
      )}
      {now.drives.map(d => (
        <Row
          key={d.mount}
          name={d.mount}
          detail={`${bytes(d.total - d.available)} / ${bytes(d.total)}`}
          pct={share(d.total - d.available, d.total)}
        />
      ))}
      <p className="text-[11px] text-[var(--m-muted)] tabular-nums">
        {t('monitor.diskSpeed', {
          read: rate(now.disk.read),
          written: rate(now.disk.written),
        })}
      </p>
    </Tile>
  )
}
