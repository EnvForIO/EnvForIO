/**
 * The middle pane: the selected list's title, an "Add a task" box, open
 * tasks, and a folded "Completed" section, laid out like Microsoft To Do.
 * The Tasks list also has filters (status and project), which took over
 * the Items page and the Planned list.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'
import {
  useCreateTask,
  useFilteredTasks,
  useTasks,
  useToday,
} from '@/api/tasks'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { isEnter } from '@/lib/keys'
import { SafetyLineCard } from '@/pages/plans/SafetyLineCard'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from './dates'
import { SortableTasks } from './SortableTasks'
import { POOL, type TaskFilter } from './filter'
import { flatten, nest } from './nest'
import { TaskFilters } from './TaskFilters'
import { TodayNote } from './TodayNote'
import { ToSchedule } from './ToSchedule'

export function TaskListPage() {
  const { t } = useTranslation()
  const view = useUIStore(state => state.selectedView)
  const today = useToday()
  const [filter, setFilter] = useState<TaskFilter>(POOL)
  const filtering = view === 'Tasks'
  const list = useTasks(view, !filtering)
  const filtered = useFilteredTasks(filter.status, filter.project, filtering)
  const { data: tasks = [], isLoading, error } = filtering ? filtered : list
  const createTask = useCreateTask()
  const [draft, setDraft] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)

  // "Done" lists only finished tasks, so it shows them instead of folding them.
  // A parent decides where its subtasks go: an open parent keeps its done
  // subtasks under it, and a done one takes them to Completed.
  const onlyDone = filtering && filter.status === 'Done'
  const groups = nest(tasks)
  const open = onlyDone
    ? []
    : flatten(groups.filter(g => g.task.doneAt === null))
  const done = onlyDone ? [] : groups.filter(g => g.task.doneAt !== null)
  const completed = flatten(done)
  // "With deadline" and "Done" are sorted by date, so a dragged order would not show.
  const sortable = !filtering || filter.status === 'All'
  // A new task goes into the pool (no project, no date): only offer it where it will show.
  const canAdd =
    !filtering ||
    (filter.status === 'All' &&
      (filter.project === null || filter.project === 0))
  const unfiltered =
    !filtering || (filter.status === POOL.status && filter.project === 0)

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
      {filtering && <TaskFilters filter={filter} onChange={setFilter} />}

      {canAdd && (
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
      )}

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
              {unfiltered ? t(`tasks.empty.${view}`) : t('tasks.filter.empty')}
            </p>
          )}

          {onlyDone ? (
            <SortableTasks tasks={tasks} view={view} sortable={false} />
          ) : (
            <SortableTasks tasks={open} view={view} sortable={sortable} />
          )}

          {done.length > 0 && (
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
                {t('tasks.completed', { count: done.length })}
              </button>
              {showCompleted && (
                <SortableTasks tasks={completed} view={view} sortable={false} />
              )}
            </>
          )}

          {view === 'MyDay' && today && <ToSchedule today={today} />}
        </div>
      </ScrollArea>
    </div>
  )
}
