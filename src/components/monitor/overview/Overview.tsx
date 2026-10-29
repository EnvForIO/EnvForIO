/**
 * The overview: every machine the user added, as coarse tiles, under one
 * line that sums them up (online, GPUs, busy GPUs, machines needing
 * attention). Click a tile for its detail.
 */
import { useTranslation } from 'react-i18next'
import type { MonitorTarget } from '@/lib/tauri-bindings'
import { useMonitorStore } from '@/store/monitor-store'
import { status, targetId } from '../machine'
import { StatusPill } from '../parts'
import { AddMachine } from './AddMachine'
import { MachineTile } from './MachineTile'

/** A GPU counts as busy from half its capacity. */
const BUSY = 50

export function Overview({
  machines,
  onOpen,
}: {
  machines: MonitorTarget[]
  onOpen: (target: MonitorTarget) => void
}) {
  const { t } = useTranslation()
  const history = useMonitorStore(state => state.history)
  const errors = useMonitorStore(state => state.errors)

  const states = machines.map(m => {
    const id = targetId(m)
    return {
      now: history[id]?.at(-1),
      state: status(history[id]?.at(-1), errors[id]),
    }
  })
  const online = states.filter(
    s => s.state !== 'unreachable' && s.state !== 'connecting'
  )
  const gpus = online.flatMap(s => s.now?.gpus ?? [])
  const busy = gpus.filter(g => (g.usage ?? 0) >= BUSY).length
  const attention = states.filter(s => s.state === 'attention').length

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-medium tracking-tight">
            {t('monitor.overviewTitle')}
          </h1>
          <p className="text-xs text-[var(--m-muted)]">
            {t('monitor.summary', {
              online: online.length,
              total: machines.length,
              gpus: gpus.length,
              busy,
            })}
          </p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <StatusPill
            status={attention > 0 ? 'attention' : 'normal'}
            text={
              attention > 0
                ? t('monitor.needAttention', { count: attention })
                : t('monitor.allNormal')
            }
          />
          <AddMachine added={machines} />
        </div>
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
        {machines.map(m => (
          <MachineTile key={targetId(m)} target={m} onOpen={() => onOpen(m)} />
        ))}
      </div>
    </div>
  )
}
