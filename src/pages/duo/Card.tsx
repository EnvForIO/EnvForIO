/**
 * The Todo Duo card, with two tabs: Todo (the todos of one day, today
 * until the capsule's heatmap or the month picks another, with an add box)
 * and Month (the calendar with busy days and deadlines). Drag it by the
 * header. The tab is remembered on this machine.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateDayTask, useDayTasks, useToday } from '@/api/tasks'
import { cn } from '@/lib/utils'
import { dateLabel } from '@/pages/tasks/dates'
import { CardMonth } from './CardMonth'
import { CardRow } from './CardRow'
import { selectDuoDay, useSelectedDuoDay } from './events'

type Tab = 'todo' | 'month'
const TAB_KEY = 'duo-card-tab'

function savedTab(): Tab {
  try {
    return localStorage.getItem(TAB_KEY) === 'month' ? 'month' : 'todo'
  } catch {
    return 'todo'
  }
}

export function Card() {
  const { t } = useTranslation()
  const today = useToday()
  const day = useSelectedDuoDay(today)
  const { data: tasks = [] } = useDayTasks(day)
  const createTask = useCreateDayTask()
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<Tab>(savedTab)

  const switchTo = (next: Tab) => {
    setTab(next)
    try {
      localStorage.setItem(TAB_KEY, next)
    } catch {
      // Only a convenience: without storage the card opens on Todo.
    }
  }

  const add = () => {
    const title = draft.trim()
    if (title === '' || !day) return
    createTask.mutate({ title, date: day })
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col rounded-2xl bg-[var(--duo-surface)] p-3 text-foreground shadow-lg">
      <header
        data-tauri-drag-region
        className="flex items-center gap-2 px-2 pb-2"
      >
        <span data-tauri-drag-region className="flex-1 truncate font-semibold">
          {day === today ? t('duo.today') : day ? dateLabel(day) : ''}
        </span>
        {day !== today && today && (
          <button
            type="button"
            onClick={() => selectDuoDay(today)}
            className="text-xs text-muted-foreground hover:underline"
          >
            {t('duo.backToToday')}
          </button>
        )}
        <div className="flex rounded-md bg-foreground/8 p-0.5 text-xs">
          {(['todo', 'month'] as const).map(name => (
            <button
              key={name}
              type="button"
              onClick={() => switchTo(name)}
              className={cn(
                'rounded px-2 py-0.5',
                tab === name
                  ? 'bg-[var(--duo-surface)] font-medium shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              {t(`duo.tab.${name}`)}
            </button>
          ))}
        </div>
      </header>

      {tab === 'month' ? (
        today &&
        day && <CardMonth key={day.slice(0, 7)} today={today} day={day} />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tasks.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {t('duo.empty')}
              </p>
            )}
            {day &&
              tasks.map(task => (
                <CardRow key={task.id} task={task} day={day} />
              ))}
          </div>

          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('tasks.addPlaceholder')}
            className="mt-2 rounded-lg bg-foreground/8 px-3 py-1.5 outline-none placeholder:text-muted-foreground"
          />
        </>
      )}
    </div>
  )
}
