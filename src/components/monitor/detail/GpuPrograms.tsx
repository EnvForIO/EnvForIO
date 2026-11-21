/**
 * The programs on one GPU, at the foot of its tile: user, PID, VRAM and
 * (when the machine tells it) how long it has run, heaviest first. The
 * command line is not shown.
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
  const timed = sorted.some(p => p.runningSecs !== null)

  return (
    <div className="flex flex-col gap-0.5 border-t border-[var(--m-line)] pt-2 text-[11px] tabular-nums">
      {sorted.map(p => (
        <div key={p.pid} className="flex items-baseline gap-2">
          <span
            className={
              p.user
                ? 'min-w-0 truncate font-medium'
                : 'min-w-0 truncate text-[var(--m-muted)] italic'
            }
          >
            {p.user || t('monitor.otherUser')}
          </span>
          <span className="text-[var(--m-muted)]">{p.pid}</span>
          <span className="ms-auto">
            {p.gpuMemory === null ? '' : bytes(p.gpuMemory)}
          </span>
          {timed && (
            <span className="w-12 text-end text-[var(--m-muted)]">
              {p.runningSecs === null ? '' : duration(p.runningSecs)}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
