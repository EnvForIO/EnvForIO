/**
 * Which machine the Monitor page watches: This PC, a running WSL
 * distribution, or a host from the SSH config. The list is re-read each
 * time it opens, so a distribution started meanwhile shows up.
 */
import { useTranslation } from 'react-i18next'
import { MonitorIcon, ServerIcon, TerminalSquareIcon } from 'lucide-react'
import {
  targetId,
  useMonitorTarget,
  useMonitorTargets,
  useSetMonitorTarget,
} from '@/api/monitor'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MonitorTarget } from '@/lib/tauri-bindings'

function Label({ target }: { target: MonitorTarget }) {
  const { t } = useTranslation()
  if (target.kind === 'local')
    return (
      <span className="flex items-center gap-2">
        <MonitorIcon className="size-3.5" />
        {t('monitor.thisPc')}
      </span>
    )
  if (target.kind === 'wsl')
    return (
      <span className="flex items-center gap-2">
        <TerminalSquareIcon className="size-3.5" />
        WSL · {target.distro}
      </span>
    )
  return (
    <span className="flex items-center gap-2">
      <ServerIcon className="size-3.5" />
      {target.host}
    </span>
  )
}

export function TargetPicker() {
  const { t } = useTranslation()
  const { data: current } = useMonitorTarget()
  const { data: targets = [], refetch } = useMonitorTargets()
  const setTarget = useSetMonitorTarget()
  if (!current) return null

  // The current target stays listed even if it is gone (a stopped distribution).
  const all = targets.some(x => targetId(x) === targetId(current))
    ? targets
    : [current, ...targets]
  const group = (kind: MonitorTarget['kind']) =>
    all.filter(x => x.kind === kind)
  const byId = new Map(all.map(x => [targetId(x), x]))

  return (
    <Select
      value={targetId(current)}
      onOpenChange={open => open && void refetch()}
      onValueChange={id => {
        const target = byId.get(id)
        if (target) setTarget.mutate(target)
      }}
    >
      <SelectTrigger className="h-8 w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(['local', 'wsl', 'ssh'] as const).map(kind => {
          const items = group(kind)
          if (items.length === 0) return null
          return (
            <SelectGroup key={kind}>
              {kind !== 'local' && (
                <SelectLabel>{t(`monitor.group.${kind}`)}</SelectLabel>
              )}
              {items.map(x => (
                <SelectItem key={targetId(x)} value={targetId(x)}>
                  <Label target={x} />
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
