/**
 * Month and week calendar with a "To schedule" list on the right.
 * Drag tasks between days and the list; double-click or right-click a day
 * for its note, its available time and a new task. Events of subscribed
 * calendars (read-only ICS links, "Calendars" button) show above tasks.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { useCalendarEvents, useCalendarSync } from '@/api/calendars'
import { useCalendarTasks, useDayNotes, useDayOverrides } from '@/api/calendar'
import { useProjects } from '@/api/projects'
import { useToday } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { useUIStore } from '@/store/ui-store'
import type { Task } from '@/lib/tauri-bindings'
import { parseDate } from '@/pages/tasks/dates'
import { calendarRange, shiftAnchor, type CalendarMode } from './calendar-range'
import { DayCell } from './DayCell'
import { DayDialog } from './DayDialog'
import { UnscheduledPanel } from './UnscheduledPanel'
import { CalendarsDialog } from './CalendarsDialog'
import { dayEnd, dayStart, eventsOn } from './events'
import { ExportDialog } from '@/pages/export/ExportDialog'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function CalendarPage() {
  const today = useToday()
  // Opened from the desktop widget: start on that day (a new day remounts).
  const focus = useUIStore(state => state.calendarDate)
  // Wait for Rust's "today" so the first view opens on the right month.
  return today ? (
    <CalendarBody key={focus ?? 'today'} today={today} focus={focus} />
  ) : null
}

function CalendarBody({
  today,
  focus,
}: {
  today: string
  focus: string | null
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<CalendarMode>('month')
  const [anchor, setAnchor] = useState<string | null>(focus) // null = follow today
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [subscriptions, setSubscriptions] = useState(false)
  const current = anchor ?? today
  const range = calendarRange(mode, current)
  useCalendarSync()
  const { data: events = [] } = useCalendarEvents(
    dayStart(range.from),
    dayEnd(range.to)
  )
  const { data: tasks = [] } = useCalendarTasks(range.from, range.to)
  const { data: notes = [] } = useDayNotes(range.from, range.to)
  const { data: overrides = [] } = useDayOverrides(range.from, range.to)
  const { data: projects = [] } = useProjects()

  const colors = new Map(projects.map(p => [p.id, p.color]))
  const noteOn = new Map(notes.map(n => [n.date, n.text]))
  const overrideOn = new Map(overrides.map(o => [o.date, o.minutes]))
  // The same rule as every day view: planned for the day or due on it. A
  // task planned Monday and due Friday shows on both (Friday with a due marker).
  const tasksOn = (date: string): Task[] =>
    tasks.filter(task => task.scheduledDate === date || task.dueDate === date)
  const month = parseDate(current).getMonth()
  const title = parseDate(current).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-6 pt-5 pb-3">
          <h1 className="flex-1 text-[22px] font-semibold tracking-tight">
            {title}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSubscriptions(true)}
          >
            <CalendarPlusIcon className="size-4" />
            {t('calendars.button')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExporting(true)}>
            {t('export.button')}
          </Button>
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
          <Segmented
            value={mode}
            options={(['month', 'week'] as const).map(m => ({
              value: m,
              label: t(`calendar.mode.${m}`),
            }))}
            onChange={setMode}
            label={t('calendar.modeLabel')}
          />
        </header>
        <div className="grid grid-cols-7 border-b border-l text-xs text-muted-foreground">
          {WEEKDAYS.map(day => (
            <div key={day} className="px-2 py-1.5">
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
              events={eventsOn(events, date)}
              note={noteOn.get(date)}
              override={overrideOn.get(date)}
              colors={colors}
              onOpen={setOpenDay}
            />
          ))}
        </div>
      </div>
      <UnscheduledPanel colors={colors} />
      <CalendarsDialog open={subscriptions} onOpenChange={setSubscriptions} />
      <ExportDialog
        scope={{ kind: mode === 'month' ? 'Month' : 'Week', date: current }}
        open={exporting}
        onOpenChange={setExporting}
      />
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
