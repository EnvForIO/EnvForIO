/**
 * The Monitor page, two levels (user decision 2026-11-19): the overview
 * shows a coarse tile per machine the user added; clicking one opens its
 * detail. Apple's clean white look with Datadog / DCGM content (GPU
 * heatmap, per-GPU tiles), coloured by thresholds. Readings flow only
 * while this page is open and the window is visible.
 */
import { useState } from 'react'
import { useMachines, useMonitorFeed } from '@/api/monitor'
import { Detail } from '@/components/monitor/detail/Detail'
import { targetId } from '@/components/monitor/machine'
import { Overview } from '@/components/monitor/overview/Overview'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MonitorPage() {
  useMonitorFeed()
  const { data: machines = [] } = useMachines()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = machines.find(m => targetId(m) === openId)

  return (
    <div className="monitor h-full bg-[var(--m-canvas)]">
      <ScrollArea className="h-full">
        <div className="px-6 py-5">
          {open ? (
            <Detail target={open} onBack={() => setOpenId(null)} />
          ) : (
            <Overview
              machines={machines}
              onOpen={m => setOpenId(targetId(m))}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
