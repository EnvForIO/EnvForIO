/**
 * The monitor panel's page. Rust places and shows the window, then says
 * "opening" (with the edge) or "closing"; this slides the panel in or out.
 * Readings flow only while the window is visible (useMonitorFeed).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listen } from '@tauri-apps/api/event'
import { useMachineInfo, useMonitorFeed } from '@/api/monitor'
import { Lanes } from '@/components/monitor/Lanes'
import { ProcessTable } from '@/components/monitor/ProcessTable'
import type { PanelEdge } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'

/** Emitted by `desktop::panel` in Rust. */
const OPENING = 'monitor-panel-opening'
const CLOSING = 'monitor-panel-closing'

function useSlide() {
  const [edge, setEdge] = useState<PanelEdge>('right')
  const [state, setState] = useState<'in' | 'out'>('out')
  useEffect(() => {
    const opening = listen<PanelEdge>(OPENING, event => {
      setEdge(event.payload)
      setState('out')
      // Two frames: the "out" position is laid out before sliding in.
      requestAnimationFrame(() => requestAnimationFrame(() => setState('in')))
    })
    const closing = listen(CLOSING, () => setState('out'))
    return () => {
      void opening.then(stop => stop())
      void closing.then(stop => stop())
    }
  }, [])
  return { edge, state }
}

export function MonitorPanel() {
  const { t } = useTranslation()
  useMonitorFeed()
  const { edge, state } = useSlide()
  const { data: info } = useMachineInfo()

  return (
    <div
      data-edge={edge}
      data-state={state}
      className={cn(
        'panel-slide flex h-full flex-col gap-3 overflow-y-auto bg-background/95 p-3 text-foreground shadow-2xl',
        edge === 'right' ? 'rounded-s-xl border-s' : 'rounded-e-xl border-e'
      )}
    >
      <header className="flex items-baseline gap-2 px-1">
        <h1 className="text-sm font-semibold">
          {info?.hostName ?? t('monitor.title')}
        </h1>
        {info && (
          <span className="truncate text-xs text-muted-foreground">
            {info.os}
          </span>
        )}
      </header>
      <Lanes />
      <ProcessTable rows={8} />
    </div>
  )
}
