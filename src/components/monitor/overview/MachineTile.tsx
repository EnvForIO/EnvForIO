/**
 * One machine on the overview, the coarse result: name, kind, status, a
 * block per GPU coloured by its use (heatmap scale) with the number under
 * it, then CPU, memory and the hottest GPU. A machine that cannot be read
 * is greyed out with when it was last seen. Click to open its detail;
 * right-click for a menu (drawn by the app, not the OS's: user decision
 * 2026-11-20) to open it or take it off the overview.
 */
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useMachineInfo, useRemoveMachine } from '@/api/monitor'
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { MonitorTarget } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useMonitorStore } from '@/store/monitor-store'
import {
  LEVEL_COLOR,
  heat,
  pctColor,
  percent,
  share,
  tempLevel,
} from '../format'
import {
  KIND_LABEL,
  gpuSummary,
  hottest,
  status,
  statusColor,
  targetId,
} from '../machine'
import { useMachineLabel } from '../useMachineLabel'

function Figure({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <span className="text-[var(--m-muted)]">
      {label}{' '}
      <b
        className="font-medium tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </b>
    </span>
  )
}

export function MachineTile({
  target,
  onOpen,
}: {
  target: MonitorTarget
  onOpen: () => void
}) {
  const { t } = useTranslation()
  const label = useMachineLabel()
  const id = targetId(target)
  const now = useMonitorStore(state => state.history[id]?.at(-1))
  const error = useMonitorStore(state => state.errors[id])
  const lastSeen = useMonitorStore(state => state.lastSeen[id])
  const { data: info } = useMachineInfo(target)
  const state = status(now, error)
  const offline = state === 'unreachable' || state === 'connecting'
  const hot = hottest(now)
  const memory = now ? share(now.memory.used, now.memory.total) : 0
  const gpus = now?.gpus ?? []
  const remove = useRemoveMachine()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            'flex min-h-44 min-w-0 flex-col gap-2 rounded-[14px] border border-[var(--m-line)] bg-[var(--m-tile)] px-3.5 py-3 text-start transition-colors hover:border-[var(--m-muted)]',
            offline && 'opacity-60'
          )}
        >
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[15px] font-medium">
              {label(target)}
            </span>
            <span className="text-[11px] text-[var(--m-muted)]">
              {KIND_LABEL[target.kind]}
            </span>
            <span
              className="ms-auto flex shrink-0 items-center gap-1.5 text-[11px]"
              style={{ color: offline ? 'var(--m-muted)' : statusColor(state) }}
            >
              <span
                className="size-[7px] rounded-full"
                style={{ background: statusColor(state) }}
              />
              {t(`monitor.status.${state}`)}
            </span>
          </div>
          <p className="truncate text-[11px] text-[var(--m-muted)]">
            {gpus.length > 0 ? gpuSummary(gpus) : (info?.cpuBrand ?? '')}
          </p>
          {gpus.length > 0 ? (
            <div
              className="grid min-h-12 flex-1 gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.min(8, gpus.length)}, minmax(0, 1fr))`,
              }}
            >
              {gpus.map(g => (
                <div key={g.index} className="flex min-h-0 flex-col gap-1">
                  <div
                    className="flex-1 rounded-[5px] transition-colors duration-500"
                    style={{
                      background: offline
                        ? 'var(--m-track)'
                        : heat(g.usage ?? 0),
                    }}
                  />
                  <span
                    className="text-center text-[11px] tabular-nums"
                    style={{
                      color: offline
                        ? 'var(--m-muted)'
                        : pctColor(g.usage ?? 0),
                    }}
                  >
                    {offline || g.usage === null ? '–' : Math.round(g.usage)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center">
              <span
                className="text-3xl font-medium tabular-nums"
                style={{
                  color:
                    now && !offline
                      ? pctColor(now.cpu.usage)
                      : 'var(--m-muted)',
                }}
              >
                {now && !offline ? percent(now.cpu.usage) : '–'}
              </span>
              <span className="text-[11px] text-[var(--m-muted)]">
                {t('monitor.cpu')}
              </span>
            </div>
          )}
          <div className="flex gap-3 text-[11px]">
            {offline ? (
              <span className="text-[var(--m-muted)]">
                {lastSeen
                  ? t('monitor.lastSeen', {
                      time: new Date(lastSeen).toLocaleTimeString(),
                    })
                  : (error ?? t('monitor.status.connecting'))}
              </span>
            ) : (
              <>
                <Figure
                  label={t('monitor.cpu')}
                  value={percent(now?.cpu.usage ?? 0)}
                  color={pctColor(now?.cpu.usage ?? 0)}
                />
                <Figure
                  label={t('monitor.mem')}
                  value={percent(memory)}
                  color={pctColor(memory)}
                />
                {hot !== null && (
                  <span className="ms-auto">
                    <Figure
                      label=""
                      value={`${hot}°C`}
                      color={LEVEL_COLOR[tempLevel(hot)]}
                    />
                    <span className="text-[var(--m-muted)]">
                      {' '}
                      {t('monitor.max')}
                    </span>
                  </span>
                )}
              </>
            )}
          </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onOpen}>
          <ExternalLinkIcon />
          {t('monitor.openDetail')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onSelect={() =>
            remove.mutate(target, { onError: e => toast.error(String(e)) })
          }
        >
          <Trash2Icon />
          {t('monitor.remove')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
