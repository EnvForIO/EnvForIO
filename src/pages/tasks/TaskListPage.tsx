/**
 * The middle pane: the selected list's title, an "Add a task" row, open
 * tasks as ledger rows, and a folded "Completed" section. My Day also has
 * today's safety line on top and the strip of today's hours at the right.
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { isEnter } from '@/lib/keys'
import { DayStrip } from '@/pages/plans/DayStrip'
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
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-8 pt-6">
        <header>
          <div className="flex items-baseline gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight">
              {t(`tasks.view.${view}`)}
            </h1>
            {view === 'MyDay' && today && (
              <span className="text-sm text-muted-foreground">
                {dateLabel(today)}
              </span>
            )}
          </div>
          {view === 'MyDay' && today && <TodayNote today={today} />}
        </header>

        {view === 'MyDay' && <SafetyLineCard />}
        {filtering && <TaskFilters filter={filter} onChange={setFilter} />}

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col pe-3 pb-6">
            {canAdd && (
              // A ledger row like the tasks under it: the + sits where their
              // checkboxes are.
              <div className="flex h-11 items-center gap-3 border-b px-2 focus-within:border-primary/60">
                <span className="-me-1.5 w-4 shrink-0" />
                <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => isEnter(e) && add()}
                  placeholder={t('tasks.addPlaceholder')}
                  aria-label={t('tasks.addPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            )}
            {isLoading && (
              <p className="text-sm text-muted-foreground">
                {t('tasks.loading')}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {t('tasks.loadFailed')}
              </p>
            )}
            {!isLoading && tasks.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {unfiltered
                  ? t(`tasks.empty.${view}`)
                  : t('tasks.filter.empty')}
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
                  className="mt-5 mb-1 flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {showCompleted ? (
                    <ChevronDownIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4" />
                  )}
                  {t('tasks.completed', { count: done.length })}
                </button>
                {showCompleted && (
                  <SortableTasks
                    tasks={completed}
                    view={view}
                    sortable={false}
                  />
                )}
              </>
            )}

            {view === 'MyDay' && today && <ToSchedule today={today} />}
          </div>
        </ScrollArea>
      </div>
      {view === 'MyDay' && (
        <div className="hidden lg:flex">
          <DayStrip />
        </div>
      )}
    </div>
  )
}
