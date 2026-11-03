/**
 * Subscribed calendars: each with its colour, name, when it was last
 * downloaded (or why it failed), a show/hide switch and remove; then a
 * form to subscribe to another ICS link. Read-only: EnvIO never writes
 * back to them. Links stay on this machine.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2Icon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddCalendar,
  useCalendars,
  useRefreshCalendars,
  useRemoveCalendar,
  useUpdateCalendar,
} from '@/api/calendars'
import { errorText } from '@/api/papers'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const COLORS = [
  '#0071e3',
  '#34c759',
  '#ff9500',
  '#af52de',
  '#ff2d55',
  '#5ac8fa',
  '#8e8e93',
]

export function CalendarsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { data: calendars = [] } = useCalendars()
  const add = useAddCalendar()
  const update = useUpdateCalendar()
  const remove = useRemoveCalendar()
  const refresh = useRefreshCalendars()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [color, setColor] = useState(COLORS[0] ?? '#0071e3')

  const subscribe = () => {
    if (name.trim() === '' || url.trim() === '') return
    add.mutate(
      { name, url, color },
      {
        onSuccess: list => {
          const added = list.find(c => c.name === name.trim())
          if (added?.error) toast.error(added.error)
          setName('')
          setUrl('')
        },
        onError: e => toast.error(errorText(e)),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('calendars.title')}</DialogTitle>
          <DialogDescription>{t('calendars.description')}</DialogDescription>
        </DialogHeader>

        {calendars.length > 0 && (
          <div className="flex flex-col divide-y rounded-md border">
            {calendars.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p
                    className={cn(
                      'truncate text-xs',
                      c.error ? 'text-destructive' : 'text-muted-foreground'
                    )}
                    title={c.error ?? c.url}
                  >
                    {c.error
                      ? t('calendars.failed', { error: c.error })
                      : c.fetchedAt
                        ? t('calendars.updated', {
                            count: c.eventCount,
                            time: new Date(c.fetchedAt).toLocaleString(),
                          })
                        : t('calendars.notYet')}
                  </p>
                </div>
                <Switch
                  checked={c.isVisible}
                  aria-label={t('calendars.show')}
                  onCheckedChange={visible =>
                    update.mutate({
                      id: c.id,
                      name: c.name,
                      color: c.color,
                      visible,
                    })
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={t('calendars.remove')}
                  onClick={() => remove.mutate(c.id)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t('calendars.add')}</p>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('calendars.namePlaceholder')}
          />
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={t('calendars.urlPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">
            {t('calendars.outlookHint')}
          </p>
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-5 rounded-full ring-offset-2 ring-offset-background',
                  color === c && 'ring-2 ring-ring'
                )}
                style={{ background: c }}
              />
            ))}
            <Button
              size="sm"
              className="ms-auto"
              disabled={
                add.isPending || name.trim() === '' || url.trim() === ''
              }
              onClick={subscribe}
            >
              {add.isPending && <Loader2Icon className="animate-spin" />}
              {t('calendars.subscribe')}
            </Button>
          </div>
        </div>

        {calendars.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={refresh.isPending}
            onClick={() =>
              refresh.mutate(undefined, {
                onError: e => toast.error(errorText(e)),
              })
            }
          >
            {refresh.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <RefreshCwIcon />
            )}
            {t('calendars.refresh')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
