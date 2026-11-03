/**
 * One day on the calendar: date, available time if it differs from the
 * usual, the note, events of subscribed calendars, and its tasks. Drop a task to schedule it here;
 * right-click for a new task, the note and the day's available time.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScheduleTask } from '@/api/calendar'
import { showContextMenu } from '@/lib/context-menu'
import { formatMinutes } from '@/lib/duration'
import type { CalendarEvent, Task } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { EventChip } from './EventChip'
import { TASK_DRAG_TYPE, TaskChip } from './TaskChip'

interface Props {
  date: string
  today: string | undefined
  outside: boolean // belongs to the previous or next month in month view
  tall: boolean // week view
  tasks: Task[]
  events: CalendarEvent[] // of subscribed calendars, read-only
  note: string | undefined
  override: number | undefined // available minutes set for this date only
  colors: Map<number, string>
  onOpen: (date: string) => void // the day dialog
}

export function DayCell(props: Props) {
  const { date, today, outside, tall, tasks, events, note, override } = props
  const { colors, onOpen } = props
  const { t } = useTranslation()
  const scheduleTask = useScheduleTask()
  const [dropping, setDropping] = useState(false)

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    void showContextMenu([
      {
        id: 'open',
        label: t('calendar.menu.open'),
        action: () => onOpen(date),
      },
    ])
  }

  return (
    <div
      onContextMenu={openMenu}
      onDoubleClick={() => onOpen(date)}
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={e => {
        e.preventDefault()
        setDropping(false)
        const id = Number(e.dataTransfer.getData(TASK_DRAG_TYPE))
        if (id) scheduleTask.mutate({ id, date })
      }}
      className={cn(
        'flex min-h-0 flex-col gap-0.5 overflow-hidden border-r border-b p-1',
        tall ? 'min-h-64' : 'min-h-20',
        outside && 'bg-muted/40 text-muted-foreground',
        dropping && 'bg-primary/10'
      )}
    >
      <div className="flex items-center gap-1 text-xs">
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-full',
            date === today && 'bg-primary font-semibold text-primary-foreground'
          )}
        >
          {Number(date.slice(8))}
        </span>
        {override !== undefined && (
          <span className="rounded bg-muted px-1 text-[10px]">
            {override === 0 ? t('calendar.rest') : formatMinutes(override)}
          </span>
        )}
      </div>
      {note && (
        <p className="truncate text-[11px] text-muted-foreground italic">
          {note}
        </p>
      )}
      {events.map(e => (
        <EventChip key={e.id} event={e} date={date} />
      ))}
      {tasks.map(task => (
        <TaskChip
          key={task.id}
          task={task}
          color={
            task.projectId === null ? undefined : colors.get(task.projectId)
          }
          dueMarker={task.scheduledDate !== date}
        />
      ))}
    </div>
  )
}
