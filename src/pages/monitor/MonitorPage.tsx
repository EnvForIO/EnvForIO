/**
 * The watched machine's readings in the main window: pick the machine and
 * the look, then its readings. Readings flow only while this page is open
 * and the window is visible. A machine that cannot be reached shows why
 * instead of empty charts.
 *
 * Two looks (user decision 2026-11-19, after comparing four): Grafana in
 * its light theme, and cards.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangleIcon } from 'lucide-react'
import { useMachineInfo, useMonitorFeed } from '@/api/monitor'
import { CardsView } from '@/components/monitor/cards/CardsView'
import { GrafanaView } from '@/components/monitor/grafana/GrafanaView'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useMonitorStore } from '@/store/monitor-store'
import { TargetPicker } from './TargetPicker'

const LOOKS = ['grafana', 'cards'] as const
type Look = (typeof LOOKS)[number]
const KEY = 'envio.monitor.look'

function savedLook(): Look {
  try {
    const saved = localStorage.getItem(KEY)
    return LOOKS.find(l => l === saved) ?? 'grafana'
  } catch {
    return 'grafana'
  }
}

function View({ look }: { look: Look }) {
  if (look === 'grafana') return <GrafanaView />
  return <CardsView />
}

export function MonitorPage() {
  const { t } = useTranslation()
  useMonitorFeed()
  const { data: info } = useMachineInfo()
  const error = useMonitorStore(state => state.error)
  const [look, setLook] = useState<Look>(savedLook)

  const pick = (value: string) => {
    const next = LOOKS.find(l => l === value)
    if (!next) return
    setLook(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // Not remembered; the page still switches.
    }
  }

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
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={look}
          onValueChange={pick}
          className="ms-auto"
        >
          {LOOKS.map(l => (
            <ToggleGroupItem key={l} value={l} className="px-3">
              {t(`monitor.look.${l}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
          <View look={look} />
        </div>
      </ScrollArea>
    </div>
  )
}
