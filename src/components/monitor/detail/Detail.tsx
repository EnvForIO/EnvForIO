/**
 * One machine in detail: back to the overview, its name, GPUs and status;
 * a tile per GPU with the programs on it; the GPU heatmap beside CPU and
 * storage. A machine that
 * cannot be read says why. It can be taken off the overview from here.
 */
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon, ChevronLeftIcon } from 'lucide-react'
import { useMachineInfo, useRemoveMachine } from '@/api/monitor'
import { Button } from '@/components/ui/button'
import type { MonitorTarget } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import { gpuSummary, status, targetId } from '../machine'
import { StatusPill } from '../parts'
import { useMachineLabel } from '../useMachineLabel'
import { GpuTile } from './GpuTile'
import { Heatmap } from './Heatmap'
import { CpuTile, StorageTile } from './SystemTiles'

const NO_HISTORY: never[] = []

export function Detail({
  target,
  onBack,
}: {
  target: MonitorTarget
  onBack: () => void
}) {
  const { t } = useTranslation()
  const label = useMachineLabel()
  const id = targetId(target)
  const history = useMonitorStore(state => state.history[id] ?? NO_HISTORY)
  const error = useMonitorStore(state => state.errors[id])
  const { data: info } = useMachineInfo(target)
  const remove = useRemoveMachine()
  const now = history.at(-1)
  const spec = [
    now && now.gpus.length > 0 ? gpuSummary(now.gpus) : null,
    info?.cpuBrand,
    info?.os,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-0.5 text-sm text-[#0071e3] hover:underline"
        >
          <ChevronLeftIcon className="size-4" />
          {t('monitor.allMachines')}
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-medium tracking-tight">
            {label(target)}
          </h1>
          <p className="truncate text-xs text-[var(--m-muted)]">{spec}</p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <StatusPill status={status(now, error)} />
          <Button
            size="sm"
            variant="ghost"
            className="text-[var(--m-muted)]"
            onClick={() => remove.mutate(target, { onSuccess: onBack })}
          >
            {t('monitor.remove')}
          </Button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-2 rounded-[14px] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex flex-col gap-0.5">
            <span>{t('monitor.unreachable')}</span>
            <code className="text-xs break-all text-muted-foreground">
              {error}
            </code>
          </div>
        </div>
      )}

      {!now ? (
        !error && (
          <p className="text-sm text-[var(--m-muted)]">
            {t('monitor.waiting')}
          </p>
        )
      ) : (
        <>
          {now.gpus.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
              {now.gpus.map(g => (
                <GpuTile key={g.index} gpu={g} history={history} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Heatmap history={history} />
            <div className="flex flex-col gap-3">
              <CpuTile now={now} info={info} />
              <StorageTile now={now} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
