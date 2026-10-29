/**
 * The programs on a machine's GPUs, as nvitop lists them: the card, PID,
 * user, VRAM, how long it has run and its command, heaviest first on each
 * card. Compute programs only; a field the machine cannot tell reads "–".
 */
import { useTranslation } from 'react-i18next'
import type { GpuSample } from '@/lib/tauri-bindings'
import { bytes, duration } from '../format'
import { Tile } from '../parts'

export function GpuProcesses({ gpus }: { gpus: GpuSample[] }) {
  const { t } = useTranslation()
  const rows = gpus.flatMap(g =>
    [...g.processes]
      .sort((a, b) => (b.gpuMemory ?? 0) - (a.gpuMemory ?? 0))
      .map(p => ({ ...p, gpu: g.index }))
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
                <th className={`${head} w-full`}>{t('monitor.command')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr
                  key={`${p.gpu}:${p.pid}`}
                  className="border-b border-[var(--m-line)] last:border-0"
                >
                  <td className={cell}>{p.gpu}</td>
                  <td className={`${cell} text-[var(--m-muted)]`}>{p.pid}</td>
                  <td className={`${cell} font-medium`}>{p.user || '–'}</td>
                  <td className={`${cell} text-end`}>
                    {p.gpuMemory === null ? '–' : bytes(p.gpuMemory)}
                  </td>
                  <td className={`${cell} text-end`}>
                    {p.runningSecs === null ? '–' : duration(p.runningSecs)}
                  </td>
                  <td
                    className={`${cell} max-w-0 truncate font-mono text-[11px]`}
                    title={p.command}
                  >
                    {p.command || '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tile>
  )
}
