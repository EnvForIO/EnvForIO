/**
 * The programs on a machine's GPUs, as nvitop lists them: the card, PID,
 * user, VRAM and how long it has run, heaviest first on each card. A
 * click on a row opens its command (user decision 2026-11-20: the command
 * is not a column). Compute programs only; what the machine cannot tell
 * reads "–".
 */
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon } from 'lucide-react'
import type { GpuSample } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { bytes, duration } from '../format'
import { Tile } from '../parts'

export function GpuProcesses({ gpus }: { gpus: GpuSample[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const rows = gpus.flatMap(g =>
    [...g.processes]
      .sort((a, b) => (b.gpuMemory ?? 0) - (a.gpuMemory ?? 0))
      .map(p => ({ ...p, gpu: g.index, key: `${g.index}:${p.pid}` }))
  )
  const head = 'px-2 py-1.5 font-normal text-start'
  const cell = 'px-2 py-1.5 whitespace-nowrap'

  return (
    <Tile className="flex flex-col gap-1">
      <div className="flex items-baseline text-[11px] text-[var(--m-muted)]">
        <span>{t('monitor.processes')}</span>
        <span className="ms-auto">
          {t('monitor.processCount', { count: rows.length })}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-[var(--m-muted)]">
          {t('monitor.noProcesses')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-[11px] text-[var(--m-muted)]">
              <tr className="border-b border-[var(--m-line)]">
                <th className={head}>GPU</th>
                <th className={head}>PID</th>
                <th className={head}>{t('monitor.user')}</th>
                <th className={`${head} text-end`}>{t('monitor.vram')}</th>
                <th className={`${head} text-end`}>{t('monitor.runTime')}</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const shown = open === p.key
                return (
                  <Fragment key={p.key}>
                    <tr
                      onClick={() => setOpen(shown ? null : p.key)}
                      className={cn(
                        'cursor-pointer border-b border-[var(--m-line)] hover:bg-[var(--m-track)]',
                        shown && 'bg-[var(--m-track)]'
                      )}
                    >
                      <td className={cell}>{p.gpu}</td>
                      <td className={`${cell} text-[var(--m-muted)]`}>
                        {p.pid}
                      </td>
                      <td className={`${cell} font-medium`}>{p.user || '–'}</td>
                      <td className={`${cell} text-end`}>
                        {p.gpuMemory === null ? '–' : bytes(p.gpuMemory)}
                      </td>
                      <td className={`${cell} text-end`}>
                        {p.runningSecs === null ? '–' : duration(p.runningSecs)}
                      </td>
                      <td className="pe-2 text-[var(--m-muted)]">
                        <ChevronRightIcon
                          className={cn(
                            'ms-auto size-3.5 transition-transform rtl:rotate-180',
                            shown && 'rotate-90 rtl:rotate-90'
                          )}
                        />
                      </td>
                    </tr>
                    {shown && (
                      <tr className="border-b border-[var(--m-line)]">
                        <td colSpan={6} className="px-2 py-2">
                          <p className="mb-1 text-[11px] text-[var(--m-muted)]">
                            {t('monitor.command')}
                          </p>
                          <code className="block font-mono text-[11px] break-all whitespace-pre-wrap select-text">
                            {p.command || t('monitor.noCommand')}
                          </code>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  )
}
