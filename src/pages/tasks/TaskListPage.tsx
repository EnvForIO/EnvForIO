/**
 * The middle pane: the selected list's title, an "Add a task" box, open
 * tasks, and a folded "Completed" section, laid out like Microsoft To Do.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'
import { useCreateTask, useTasks, useToday } from '@/api/tasks'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from './dates'
import { SortableTasks } from './SortableTasks'
import { TaskRow } from './TaskRow'
import { SafetyLineCard } from '@/pages/plans/SafetyLineCard'
import { TodayNote } from './TodayNote'
import { ToSchedule } from './ToSchedule'
import { isEnter } from '@/lib/keys'

export function TaskListPage() {
  const { t } = useTranslation()
  const view = useUIStore(state => state.selectedView)
  const today = useToday()
  const { data: tasks = [], isLoading, error } = useTasks(view)
  const createTask = useCreateTask()
  const [draft, setDraft] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  const open = tasks.filter(task => task.doneAt === null)
  const completed = tasks.filter(task => task.doneAt !== null)

  const add = () => {
    const title = draft.trim()
    if (title === '') return
    createTask.mutate({ title, view })
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header>
        <h1 className="text-xl font-semibold">{t(`tasks.view.${view}`)}</h1>
        {view === 'MyDay' && today && (
          <p className="text-sm text-muted-foreground">{dateLabel(today)}</p>
        )}
        {view === 'MyDay' && today && <TodayNote today={today} />}
      </header>

      {view === 'MyDay' && <SafetyLineCard />}

      <div className="flex items-center gap-2 rounded-md border px-3">
        <PlusIcon className="size-4 text-muted-foreground" />
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={t('tasks.addPlaceholder')}
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 pr-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">
              {t('tasks.loading')}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{t('tasks.loadFailed')}</p>
          )}
          {!isLoading && tasks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t(`tasks.empty.${view}`)}
            </p>
          )}

          {/* Planned sorts by date, so a dragged order would not show there. */}
          <SortableTasks
            tasks={open}
            view={view}
            sortable={view !== 'Planned'}
          />

          {completed.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="mt-3 flex items-center gap-1 text-sm font-medium"
              >
                {showCompleted ? (
                  <ChevronDownIcon className="size-4" />
                ) : (
                  <ChevronRightIcon className="size-4" />
                )}
                {t('tasks.completed', { count: completed.length })}
              </button>
              {showCompleted &&
                completed.map(task => (
                  <TaskRow key={task.id} task={task} view={view} />
                ))}
            </>
          )}

          {view === 'MyDay' && today && <ToSchedule today={today} />}
        </div>
      </ScrollArea>
    </div>
  )
}
