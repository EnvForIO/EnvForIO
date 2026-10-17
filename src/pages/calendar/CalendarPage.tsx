/**
 * Month and week calendar with a "To schedule" list on the right.
 * Drag tasks between days and the list; double-click or right-click a day
 * for its note, its available time and a new task.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useCalendarTasks, useDayNotes, useDayOverrides } from '@/api/calendar'
import { useProjects } from '@/api/projects'
import { useToday } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import type { Task } from '@/lib/tauri-bindings'
import { parseDate } from '@/pages/tasks/dates'
import { calendarRange, shiftAnchor, type CalendarMode } from './calendar-range'
import { DayCell } from './DayCell'
import { DayDialog } from './DayDialog'
import { UnscheduledPanel } from './UnscheduledPanel'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function CalendarPage() {
  const today = useToday()
  // Wait for Rust's "today" so the first view opens on the right month.
  return today ? <CalendarBody today={today} /> : null
}

function CalendarBody({ today }: { today: string }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<CalendarMode>('month')
  const [anchor, setAnchor] = useState<string | null>(null) // null = follow today
  const [openDay, setOpenDay] = useState<string | null>(null)
  const current = anchor ?? today
  const range = calendarRange(mode, current)
  const { data: tasks = [] } = useCalendarTasks(range.from, range.to)
  const { data: notes = [] } = useDayNotes(range.from, range.to)
  const { data: overrides = [] } = useDayOverrides(range.from, range.to)
  const { data: projects = [] } = useProjects()

  const colors = new Map(projects.map(p => [p.id, p.color]))
  const noteOn = new Map(notes.map(n => [n.date, n.text]))
  const overrideOn = new Map(overrides.map(o => [o.date, o.minutes]))
  const tasksOn = (date: string): Task[] =>
    tasks.filter(
      task =>
        task.scheduledDate === date ||
        (task.scheduledDate === null && task.dueDate === date)
    )
  const month = parseDate(current).getMonth()
  const title = parseDate(current).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3">
          <h1 className="flex-1 text-xl font-semibold">{title}</h1>
          <Button variant="outline" size="sm" onClick={() => setAnchor(null)}>
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(shiftAnchor(mode, current, -1))}
            aria-label={t('calendar.previous')}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAnchor(shiftAnchor(mode, current, 1))}
            aria-label={t('calendar.next')}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          {(['month', 'week'] as const).map(m => (
            <Button
              key={m}
              size="sm"
              variant={m === mode ? 'default' : 'outline'}
              onClick={() => setMode(m)}
            >
              {t(`calendar.mode.${m}`)}
            </Button>
          ))}
        </header>
        <div className="grid grid-cols-7 border-t border-l text-xs text-muted-foreground">
          {WEEKDAYS.map(day => (
            <div key={day} className="border-r border-b px-2 py-1">
              {t(`calendar.weekday.${day}`)}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 overflow-y-auto border-l">
          {range.weeks.flat().map(date => (
            <DayCell
              key={date}
              date={date}
              today={today}
              outside={mode === 'month' && parseDate(date).getMonth() !== month}
              tall={mode === 'week'}
              tasks={tasksOn(date)}
              note={noteOn.get(date)}
              override={overrideOn.get(date)}
              colors={colors}
              onOpen={setOpenDay}
            />
          ))}
        </div>
      </div>
      <UnscheduledPanel colors={colors} />
      {openDay && (
        <DayDialog
          key={openDay}
          date={openDay}
          note={noteOn.get(openDay)}
          override={overrideOn.get(openDay)}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  )
}
