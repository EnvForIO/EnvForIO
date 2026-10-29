/**
 * "Add machine": the machines not on the overview yet, grouped as This PC,
 * running WSL distributions and SSH config hosts. The list is read when
 * the menu opens, so a distribution started meanwhile shows up.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAddMachine, useMonitorTargets } from '@/api/monitor'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MonitorTarget } from '@/lib/tauri-bindings'
import { targetId } from '../machine'
import { useMachineLabel } from '../useMachineLabel'

const GROUPS: MonitorTarget['kind'][] = ['local', 'wsl', 'ssh']

export function AddMachine({ added }: { added: MonitorTarget[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const label = useMachineLabel()
  const { data: targets = [], isFetching } = useMonitorTargets(open)
  const add = useAddMachine()
  const taken = new Set(added.map(targetId))
  const free = targets.filter(x => !taken.has(targetId(x)))

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full">
          <PlusIcon className="size-3.5" />
          {t('monitor.addMachine')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {free.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {isFetching ? t('monitor.looking') : t('monitor.nothingToAdd')}
          </p>
        )}
        {GROUPS.map(kind => {
          const items = free.filter(x => x.kind === kind)
          if (items.length === 0) return null
          return (
            <DropdownMenuGroup key={kind}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t(`monitor.group.${kind}`)}
              </DropdownMenuLabel>
              {items.map(x => (
                <DropdownMenuItem
                  key={targetId(x)}
                  onSelect={() =>
                    add.mutate(x, {
                      onError: e => toast.error(String(e)),
                    })
                  }
                >
                  {label(x)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
