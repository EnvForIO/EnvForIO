/**
 * The busiest programs, each one's processes added up. Click a column to
 * sort by it. The GPU column shows only when the OS reports GPU use.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProcessGroup } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitor-store'
import { bytes, percent } from './format'

type SortKey = 'cpu' | 'memory' | 'gpu'

const value = (p: ProcessGroup, key: SortKey) =>
  key === 'gpu' ? (p.gpu ?? 0) : key === 'memory' ? p.memory : p.cpu

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <th className="w-20 text-end font-normal">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'hover:text-foreground',
          active && 'font-semibold text-foreground'
        )}
      >
        {label}
      </button>
    </th>
  )
}

export function ProcessTable({ rows = 10 }: { rows?: number }) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<SortKey>('cpu')
  const processes = useMonitorStore(state => state.history.at(-1)?.processes)
  if (!processes) return null
  const hasGpu = processes.some(p => p.gpu !== null)
  const shown = [...processes]
    .sort((a, b) => value(b, sort) - value(a, sort))
    .slice(0, rows)

  const header = (id: SortKey, label: string) => (
    <SortHeader
      label={label}
      active={sort === id}
      onClick={() => setSort(id)}
    />
  )

  return (
    <section className="flex flex-col gap-1.5 rounded-md border p-3">
      <h2 className="text-sm font-semibold">{t('monitor.processes')}</h2>
      <table className="w-full table-fixed text-sm tabular-nums">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="text-start font-normal">{t('monitor.program')}</th>
            {header('cpu', t('monitor.cpu'))}
            {header('memory', t('monitor.memory'))}
            {hasGpu && header('gpu', t('monitor.gpu'))}
          </tr>
        </thead>
        <tbody>
          {shown.map(p => (
            <tr key={p.name} className="border-t border-border/50">
              <td className="truncate py-0.5">
                {p.name}
                {p.count > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    ×{p.count}
                  </span>
                )}
              </td>
              <td className="text-end">{percent(p.cpu)}</td>
              <td className="text-end">{bytes(p.memory)}</td>
              {hasGpu && (
                <td className="text-end">
                  {p.gpu === null ? '–' : percent(p.gpu)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
