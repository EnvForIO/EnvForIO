/**
 * The desktop calendar widget (phase 4 step 7): a month on a translucent
 * panel. Each day is shaded by how full it is and carries a dot per
 * deadline (projects, tasks due, followed conferences). Click a day to
 * list it below; double-click to open the main calendar there (user
 * decisions 2026-11-20). Drag the header to move; × hides it (tray menu
 * "Desktop calendar" brings it back).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useToday } from '@/api/tasks'
import { commands, unwrapResult, type DayMarks } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { calendarRange, shiftAnchor } from '@/pages/calendar/calendar-range'
import { parseDate } from '@/pages/tasks/dates'
import { BUSY_COLOR, busy, isDeadline } from './busy'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

/** Under ['tasks'] so every task change in any window refreshes it. */
function useMonthMarks(from: string, to: string) {
  return useQuery({
    queryKey: ['tasks', 'month', from, to] as const,
    queryFn: async () => unwrapResult(await commands.monthMarks(from, to)),
  })
}

export function MonthWidget() {
  const today = useToday()
  return today ? <Month today={today} /> : null
}

function Month({ today }: { today: string }) {
  const { t } = useTranslation()
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(today)
  const range = calendarRange('month', anchor)
  const { data: marks = [] } = useMonthMarks(range.from, range.to)
  const byDate = new Map(marks.map(m => [m.date, m]))
  const month = parseDate(anchor).getMonth()
  const title = parseDate(anchor).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const day = byDate.get(selected)

  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl bg-[var(--duo-surface)] p-3 text-foreground shadow-lg">
      <header data-tauri-drag-region className="flex items-center gap-1">
        <span
          data-tauri-drag-region
          className="flex-1 truncate text-sm font-semibold"
        >
          {title}
        </span>
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
            setSelected(today)
          }}
          className="rounded px-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          {t('calendar.today')}
        </button>
        <IconButton
          label={t('calendar.next')}
          onClick={() => setAnchor(shiftAnchor('month', anchor, 1))}
        >
          <ChevronRightIcon className="size-3.5" />
        </IconButton>
        <IconButton
          label={t('month.hide')}
          onClick={() => void commands.hideMonthWidget()}
        >
          <XIcon className="size-3.5" />
        </IconButton>
      </header>

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
            selected={date === selected}
            outside={parseDate(date).getMonth() !== month}
            onSelect={() => setSelected(date)}
          />
        ))}
      </div>

      <DayList date={selected} marks={day} />
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
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
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
  onSelect: () => void
}) {
  const { date, marks, today, selected, outside, onSelect } = props
  const dots = (marks?.items ?? []).filter(i => isDeadline(i.kind)).slice(0, 3)
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={() => void commands.openCalendarDay(date)}
      className={cn(
        'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-xs tabular-nums',
        outside && 'opacity-40',
        selected && 'ring-1 ring-foreground/40',
        !selected && 'hover:ring-1 hover:ring-foreground/20'
      )}
      style={{ background: marks ? BUSY_COLOR[busy(marks)] : undefined }}
    >
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full',
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
  const label = parseDate(date).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1 border-t border-foreground/10 pt-2">
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
