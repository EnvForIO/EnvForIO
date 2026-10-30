/**
 * The programs on one GPU, at the foot of its tile: user, PID, VRAM and
 * how long it has run, heaviest first, in fixed-width columns so they line
 * up across tiles. No command (user decision 2026-11-20).
 *
 * A program with no user is one no source on the machine names: /proc
 * hidden with hidepid and no gpustat cache from root, or a container.
 */
import { useTranslation } from 'react-i18next'
import type { GpuProcess } from '@/lib/tauri-bindings'
import { bytes, duration } from '../format'

export function GpuPrograms({ processes }: { processes: GpuProcess[] }) {
  const { t } = useTranslation()
  if (processes.length === 0) return null
  const sorted = [...processes].sort(
    (a, b) => (b.gpuMemory ?? 0) - (a.gpuMemory ?? 0)
  )

  return (
    <div className="mt-0.5 flex flex-col gap-0.5 border-t border-[var(--m-line)] pt-1.5 text-[11px] tabular-nums">
      {sorted.map(p => (
        <div key={p.pid} className="flex items-baseline gap-1.5">
          <span
            className={
              p.user
                ? 'min-w-0 flex-1 truncate font-medium'
                : 'min-w-0 flex-1 truncate text-[var(--m-muted)] italic'
            }
          >
            {p.user || t('monitor.otherUser')}
          </span>
          <span className="w-14 text-end text-[var(--m-muted)]">{p.pid}</span>
          <span className="w-12 text-end">
            {p.gpuMemory === null ? '–' : bytes(p.gpuMemory)}
          </span>
          <span className="w-11 text-end text-[var(--m-muted)]">
            {p.runningSecs === null ? '–' : duration(p.runningSecs)}
          </span>
        </div>
      ))}
    </div>
  )
}
