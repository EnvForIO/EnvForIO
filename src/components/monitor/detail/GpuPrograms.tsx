/**
 * The programs on one GPU, at the foot of its tile: user, VRAM and how
 * long it has run, heaviest first, in fixed-width columns so they line up
 * across tiles. A click opens the PID and command (user decision
 * 2026-11-20: no separate table, the command only on demand).
 *
 * A program with no user is one the machine hides from us: servers that
 * mount /proc with hidepid show each user only their own processes, so
 * it belongs to someone else (or to a container).
 */
import { useTranslation } from 'react-i18next'
import type { GpuProcess } from '@/lib/tauri-bindings'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { bytes, duration } from '../format'

export function GpuPrograms({ processes }: { processes: GpuProcess[] }) {
  const { t } = useTranslation()
  if (processes.length === 0) return null
  const sorted = [...processes].sort(
    (a, b) => (b.gpuMemory ?? 0) - (a.gpuMemory ?? 0)
  )

  return (
    <div className="mt-0.5 flex flex-col border-t border-[var(--m-line)] pt-1.5 text-[11px] tabular-nums">
      {sorted.map(p => (
        <Popover key={p.pid}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="-mx-1 flex items-baseline gap-2 rounded px-1 py-0.5 text-start hover:bg-[var(--m-track)] data-[state=open]:bg-[var(--m-track)]"
            >
              <span
                className={
                  p.user
                    ? 'min-w-0 flex-1 truncate font-medium'
                    : 'min-w-0 flex-1 truncate text-[var(--m-muted)] italic'
                }
              >
                {p.user || t('monitor.otherUser')}
              </span>
              <span className="w-14 text-end">
                {p.gpuMemory === null ? '–' : bytes(p.gpuMemory)}
              </span>
              <span className="w-12 text-end text-[var(--m-muted)]">
                {p.runningSecs === null ? '–' : duration(p.runningSecs)}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-96 text-xs">
            <p className="mb-1 text-[var(--m-muted)]">
              PID {p.pid}
              {p.user ? ` · ${p.user}` : ''}
            </p>
            {p.command ? (
              <code className="block font-mono text-[11px] break-all whitespace-pre-wrap select-text">
                {p.command}
              </code>
            ) : (
              <p className="text-[var(--m-muted)]">
                {t('monitor.hiddenProgram')}
              </p>
            )}
          </PopoverContent>
        </Popover>
      ))}
    </div>
  )
}
