/**
 * The Todo Duo card: the todos of one day (today until the capsule's
 * heatmap picks another), with an add box. Drag it by the header.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateDayTask, useDayTasks, useToday } from '@/api/tasks'
import { dateLabel } from '@/pages/tasks/dates'
import { CardRow } from './CardRow'
import { selectDuoDay, useSelectedDuoDay } from './events'

export function Card() {
  const { t } = useTranslation()
  const today = useToday()
  const day = useSelectedDuoDay(today)
  const { data: tasks = [] } = useDayTasks(day)
  const createTask = useCreateDayTask()
  const [draft, setDraft] = useState('')

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
        <span data-tauri-drag-region className="flex-1 font-semibold">
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
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {t('duo.empty')}
          </p>
        )}
        {day &&
          tasks.map(task => <CardRow key={task.id} task={task} day={day} />)}
      </div>

      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        placeholder={t('tasks.addPlaceholder')}
        className="mt-2 rounded-lg bg-foreground/8 px-3 py-1.5 outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
