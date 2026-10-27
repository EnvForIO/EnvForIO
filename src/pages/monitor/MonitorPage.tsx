/**
 * The local machine's readings in the main window: the lanes, then the
 * busiest programs. Readings flow only while this page is open and the
 * window is visible. Later steps show the same blocks in the edge panel.
 */
import { useTranslation } from 'react-i18next'
import { useMachineInfo, useMonitorFeed } from '@/api/monitor'
import { Lanes } from '@/components/monitor/Lanes'
import { ProcessTable } from '@/components/monitor/ProcessTable'
import { ScrollArea } from '@/components/ui/scroll-area'

export function MonitorPage() {
  const { t } = useTranslation()
  useMonitorFeed()
  const { data: info } = useMachineInfo()

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">{t('monitor.pageTitle')}</h1>
        {info && (
          <span className="truncate text-sm text-muted-foreground">
            {info.hostName} · {info.os}
          </span>
        )}
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 pr-3 pb-4">
          <Lanes />
          <ProcessTable />
        </div>
      </ScrollArea>
    </div>
  )
}
