/**
 * Facts about one machine on the overview, worked out from its latest
 * sample: how it is doing, what its GPUs are, how hot it runs.
 */
import type { GpuSample, MonitorTarget, Sample } from '@/lib/tauri-bindings'
import { LEVEL_COLOR, level, share, tempLevel, type Level } from './format'

export type Status =
  'connecting' | 'unreachable' | 'normal' | 'busy' | 'attention'

export const STATUS_LEVEL: Record<Status, Level | null> = {
  connecting: null,
  unreachable: null,
  normal: 'ok',
  busy: 'warn',
  attention: 'bad',
}

/** A status's threshold colour; grey while connecting or unreachable. */
export function statusColor(state: Status) {
  const lvl = STATUS_LEVEL[state]
  return lvl ? LEVEL_COLOR[lvl] : 'var(--m-muted)'
}

export const KIND_LABEL: Record<MonitorTarget['kind'], string> = {
  local: 'Local',
  wsl: 'WSL',
  ssh: 'SSH',
}

const WORST: Record<Level, number> = { ok: 0, warn: 1, bad: 2 }

/** The worst of CPU, memory, every GPU's use, VRAM and temperature. */
export function status(
  sample: Sample | undefined,
  error: string | undefined
): Status {
  if (error) return 'unreachable'
  if (!sample) return 'connecting'
  const levels: Level[] = [
    level(sample.cpu.usage),
    level(share(sample.memory.used, sample.memory.total)),
    ...sample.gpus.flatMap(g => [
      level(g.usage ?? 0),
      level(share(g.memoryUsed ?? 0, g.memoryTotal ?? 0)),
      tempLevel(g.temperature ?? 0),
    ]),
  ]
  const worst = levels.reduce<Level>(
    (a, b) => (WORST[b] > WORST[a] ? b : a),
    'ok'
  )
  return worst === 'bad' ? 'attention' : worst === 'warn' ? 'busy' : 'normal'
}

/** "NVIDIA GeForce RTX 3080" reads as "RTX 3080". */
export const gpuName = (name: string) =>
  name
    .replace(/^NVIDIA\s+/i, '')
    .replace(/^GeForce\s+/i, '')
    .trim()

/** "8 × A100-SXM4-80GB", or "2 × RTX 4090 + RTX 3090" for mixed cards. */
export function gpuSummary(gpus: GpuSample[]): string {
  const counts = new Map<string, number>()
  for (const g of gpus) {
    const name = gpuName(g.name)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .map(([name, n]) => (n > 1 ? `${n} × ${name}` : name))
    .join(' + ')
}

/** The hottest GPU, in °C, or null with no GPU temperatures. */
export function hottest(sample: Sample | undefined): number | null {
  const temps = (sample?.gpus ?? []).flatMap(g =>
    g.temperature === null ? [] : [g.temperature]
  )
  return temps.length === 0 ? null : Math.max(...temps)
}

/** A stable string for a machine, for keys and the store. */
export const targetId = (t: MonitorTarget) =>
  t.kind === 'local'
    ? 'local'
    : t.kind === 'wsl'
      ? `wsl:${t.distro}`
      : `ssh:${t.host}`
