/**
 * The Duo card's Month tab. Each day is shaded by how full it is and
 * carries a dot per deadline (projects and tasks due).
 * A click picks the day for the whole Duo (the Todo tab then shows it)
 * and lists it below; a double-click opens the main calendar there.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useMonthMarks } from '@/api/month'
import { commands, type DayMarks } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { calendarRange, shiftAnchor } from '@/pages/calendar/calendar-range'
import { dateLabel, parseDate } from '@/pages/tasks/dates'
import { BUSY_COLOR, busy, isDeadline } from './busy'
import { selectDuoDay } from './events'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function CardMonth({ today, day }: { today: string; day: string }) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState(day)
  const range = calendarRange('month', anchor)
  const { data: marks = [] } = useMonthMarks(range.from, range.to)
  const byDate = new Map(marks.map(m => [m.date, m]))
  const month = parseDate(anchor).getMonth()
  const title = parseDate(anchor).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-1 px-1">
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        <IconButton
          label={t('calendar.previous')}
          onClick={() => setAnchor(shiftAnchor('month', anchor, -1))}
        >
          <ChevronLeftIcon className="size-3.5" />
        </IconButton>
        <button
          type="button"
          onClick={() => {
            setAnchor(today)
            selectDuoDay(today)
          }}
          className="rounded px-1.5 text-xs text-muted-foreground hover:bg-foreground/8"
        >
          {t('calendar.today')}
        </button>
        <IconButton
          label={t('calendar.next')}
          onClick={() => setAnchor(shiftAnchor('month', anchor, 1))}
        >
          <ChevronRightIcon className="size-3.5" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map(w => (
          <span key={w} className="text-[10px] text-muted-foreground">
            {t(`calendar.weekday.${w}`).slice(0, 2)}
          </span>
        ))}
        {range.weeks.flat().map(date => (
          <DayButton
            key={date}
            date={date}
            marks={byDate.get(date)}
            today={date === today}
            selected={date === day}
            outside={parseDate(date).getMonth() !== month}
          />
        ))}
      </div>

      <DayList date={day} marks={byDate.get(day)} />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
    >
      {children}
    </button>
  )
}

function DayButton(props: {
  date: string
  marks: DayMarks | undefined
  today: boolean
  selected: boolean
  outside: boolean
}) {
  const { date, marks, today, selected, outside } = props
  const dots = (marks?.items ?? []).filter(i => isDeadline(i.kind)).slice(0, 3)
  return (
    <button
      type="button"
      onClick={() => selectDuoDay(date)}
      onDoubleClick={() => void commands.openCalendarDay(date)}
      className={cn(
        'flex h-8 flex-col items-center justify-center rounded-md text-xs tabular-nums',
        outside && 'opacity-40',
        selected && 'ring-1 ring-foreground/40',
        !selected && 'hover:ring-1 hover:ring-foreground/20'
      )}
      style={{ background: marks ? BUSY_COLOR[busy(marks)] : undefined }}
    >
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full leading-none',
          today && 'bg-primary font-semibold text-primary-foreground'
        )}
      >
        {Number(date.slice(8))}
      </span>
      <span className="flex h-1 gap-0.5">
        {dots.map((d, i) => (
          <span
            key={i}
            className="size-1 rounded-full"
            style={{ background: d.color }}
          />
        ))}
      </span>
    </button>
  )
}

function DayList({
  date,
  marks,
}: {
  date: string
  marks: DayMarks | undefined
}) {
  const { t } = useTranslation()
  const items = marks?.items ?? []
  const label = dateLabel(date)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 border-t border-foreground/10 px-1 pt-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('month.nothing')}</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  'size-1.5 shrink-0',
                  isDeadline(item.kind) ? 'rounded-full' : 'rounded-[1px]'
                )}
                style={{ background: item.color }}
              />
              <span
                className={cn(
                  'truncate',
                  item.done && 'text-muted-foreground line-through'
                )}
              >
                {item.title}
              </span>
              <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                {t(`month.kind.${item.kind}`)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
