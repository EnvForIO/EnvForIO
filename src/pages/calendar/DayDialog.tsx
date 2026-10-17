/**
 * Everything about one calendar day: add a task scheduled on it, write its
 * note, and set its available time (empty = the weekday's usual time).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateScheduledTask,
  useSetDayNote,
  useSetDayOverride,
} from '@/api/calendar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { dateLabel } from '@/pages/tasks/dates'

interface Props {
  date: string
  note: string | undefined
  override: number | undefined
  onClose: () => void
}

export function DayDialog({ date, note, override, onClose }: Props) {
  const { t } = useTranslation()
  const createTask = useCreateScheduledTask()
  const setNote = useSetDayNote()
  const setOverride = useSetDayOverride()
  const [title, setTitle] = useState('')
  const [text, setText] = useState(note ?? '')
  const [hours, setHours] = useState(
    override === undefined ? '' : String(override / 60)
  )

  const hoursValid =
    hours.trim() === '' || (Number(hours) >= 0 && Number(hours) <= 24)

  const save = () => {
    if (title.trim() !== '') createTask.mutate({ title, date })
    if (text !== (note ?? '')) setNote.mutate({ date, text })
    const minutes = hours.trim() === '' ? null : Math.round(Number(hours) * 60)
    if (minutes !== (override ?? null)) setOverride.mutate({ date, minutes })
    onClose()
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dateLabel(date)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t('calendar.newTask')}</Label>
            <Input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && hoursValid && save()}
              placeholder={t('tasks.addPlaceholder')}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{t('calendar.note')}</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>{t('calendar.availableHours')}</Label>
            <Input
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder={t('calendar.usualHours')}
              inputMode="decimal"
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {t('calendar.availableHoursHint')}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!hoursValid}>
            {t('calendar.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
