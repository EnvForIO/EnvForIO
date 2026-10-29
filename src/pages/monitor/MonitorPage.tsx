/**
 * The watched machine's readings in the main window: pick the machine,
 * then its cards. Readings flow only while this page is open and the
 * window is visible. A machine that cannot be reached shows why instead
 * of empty cards.
 *
 * Cards are the one look (user decision 2026-11-19, after comparing
 * Grafana, wandb, terminal and cards), coloured by thresholds as Grafana
 * colours its panels.
 */
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from 'lucide-react'
import { useMachineInfo, useMonitorFeed } from '@/api/monitor'
import { CardsView } from '@/components/monitor/cards/CardsView'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMonitorStore } from '@/store/monitor-store'
import { TargetPicker } from './TargetPicker'

export function MonitorPage() {
  const { t } = useTranslation()
  useMonitorFeed()
  const { data: info } = useMachineInfo()
  const error = useMonitorStore(state => state.error)

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{t('monitor.pageTitle')}</h1>
        <TargetPicker />
        {info?.os && (
          <span className="truncate text-sm text-muted-foreground">
            {info.hostName} · {info.os}
          </span>
        )}
      </header>
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex flex-col gap-0.5">
            <span>{t('monitor.unreachable')}</span>
            <code className="text-xs break-all text-muted-foreground">
              {error}
            </code>
          </div>
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        <div className="pr-3 pb-4">
          <CardsView />
        </div>
      </ScrollArea>
    </div>
  )
}
