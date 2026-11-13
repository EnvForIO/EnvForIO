/**
 * The right pane: everything about the selected task. Text fields save when
 * they lose focus; toggles and the date save at once.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CornerLeftUpIcon,
  LightbulbIcon,
  PinIcon,
  StarIcon,
  SunIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { useIdea } from '@/api/ideas'
import {
  toUpdate,
  useDeleteTask,
  useTask,
  useToday,
  useUndo,
  useUpdateTask,
} from '@/api/tasks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel, formatDate, parseDate } from './dates'
import { TaskSubtasks } from './TaskSubtasks'
import { TimerSection } from '@/pages/timer/TimerSection'
import { isEnter } from '@/lib/keys'

export function TaskDetails() {
  const selectedTaskId = useUIStore(state => state.selectedTaskId)
  // Fetched by id, so the pane works from any list, project or the calendar,
  // and stays open when an edit moves the task out of the current list.
  const { data: task } = useTask(selectedTaskId)
  if (!task) return <NothingSelected />
  // Keyed by id so the text drafts reset when another task is selected.
  return <TaskDetailsForm key={task.id} task={task} />
}

function NothingSelected() {
  const { t } = useTranslation()
  return (
    <p className="p-6 text-center text-sm text-muted-foreground">
      {t('tasks.nothingSelected')}
    </p>
  )
}

/** A todo of an idea: its title, opening the idea. */
function FromIdea({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: idea } = useIdea(ideaId)
  const openIdea = useUIStore(state => state.openIdea)
  if (!idea) return null
  return (
    <button
      type="button"
      onClick={() => openIdea(idea.id)}
      className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-start text-sm hover:bg-accent/60"
    >
      <LightbulbIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{t('tasks.fromIdea')}</span>
      <span className="truncate font-medium">{idea.title}</span>
    </button>
  )
}

function TaskDetailsForm({ task }: { task: Task }) {
  const { t } = useTranslation()
  const today = useToday()
  const selectTask = useUIStore(state => state.selectTask)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const undo = useUndo()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [estimate, setEstimate] = useState(
    task.estimateMinutes === null ? '' : formatMinutes(task.estimateMinutes)
  )

  const save = (change: Partial<TaskUpdate>) =>
    updateTask.mutate({
      id: task.id,
      update: { ...toUpdate(task), title, note, ...change },
    })

  // In My Day = planned for today, so the toggle and the "Do on" date below
  // are two ways to set the same field.
  const inMyDay = task.scheduledDate !== null && task.scheduledDate === today
  const toggles = [
    {
      key: 'myDay',
      on: inMyDay,
      icon: SunIcon,
      label: inMyDay ? t('tasks.removeFromMyDay') : t('tasks.addToMyDay'),
      change: { scheduledDate: inMyDay ? null : (today ?? null) },
    },
    {
      key: 'important',
      on: task.isImportant,
      icon: StarIcon,
      label: task.isImportant
        ? t('tasks.unmarkImportant')
        : t('tasks.markImportant'),
      change: { isImportant: !task.isImportant },
    },
    {
      key: 'pin',
      on: task.isPinned,
      icon: PinIcon,
      label: task.isPinned ? t('tasks.unpin') : t('tasks.pin'),
      change: { isPinned: !task.isPinned },
    },
  ]

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-start gap-2">
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title.trim() !== '' && title !== task.title && save({})}
          onKeyDown={e => isEnter(e) && e.currentTarget.blur()}
          className="text-base font-semibold"
          aria-label={t('tasks.title')}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => selectTask(null)}
          aria-label={t('tasks.closeDetails')}
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      {task.ideaId !== null && <FromIdea ideaId={task.ideaId} />}
      {task.parentId !== null && task.parentTitle !== null && (
        <button
          type="button"
          onClick={() => task.parentId !== null && selectTask(task.parentId)}
          className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-start text-sm hover:bg-accent/60"
        >
          <CornerLeftUpIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">{t('tasks.subtaskOf')}</span>
          <span className="truncate font-medium">{task.parentTitle}</span>
        </button>
      )}

      {/* One level deep: a subtask has no subtasks of its own. */}
      {task.parentId === null && <TaskSubtasks task={task} />}

      <TimerSection task={task} />

      <div className="flex flex-col gap-1">
        {toggles.map(({ key, on, icon: Icon, label, change }) => (
          <Button
            key={key}
            variant="ghost"
            className="justify-start gap-2"
            onClick={() => save(change)}
          >
            <Icon className={cn('size-4', on && 'fill-primary text-primary')} />
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">
          {t('tasks.doOn')}
        </Label>
        <DatePicker
          value={task.scheduledDate ? parseDate(task.scheduledDate) : undefined}
          onChange={date =>
            save({ scheduledDate: date ? formatDate(date) : null })
          }
          placeholder={t('tasks.addDoOn')}
        />
      </div>
      <div className="grid gap-1">
        <Label className="text-xs text-muted-foreground">
          {t('tasks.due')}
        </Label>
        <DatePicker
          value={task.dueDate ? parseDate(task.dueDate) : undefined}
          onChange={date => save({ dueDate: date ? formatDate(date) : null })}
          placeholder={t('tasks.addDueDate')}
        />
      </div>

      <Input
        value={estimate}
        onChange={e => setEstimate(e.target.value)}
        onBlur={() =>
          save({ estimate: estimate.trim() === '' ? null : estimate })
        }
        onKeyDown={e => isEnter(e) && e.currentTarget.blur()}
        placeholder={t('tasks.addEstimate')}
        aria-label={t('tasks.estimate')}
        aria-describedby={
          task.subtaskCount > 0 ? `budget-hint-${task.id}` : undefined
        }
      />
      {task.subtaskCount > 0 && (
        <p
          id={`budget-hint-${task.id}`}
          className="-mt-2 px-1 text-xs text-muted-foreground"
        >
          {t('tasks.budgetHint')}
        </p>
      )}
      {updateTask.error && (
        <p className="text-xs text-destructive">{t('tasks.saveFailed')}</p>
      )}

      <Textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={() => note !== task.note && save({})}
        placeholder={t('tasks.addNote')}
        className="min-h-24"
      />

      <div className="mt-auto flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
        <span>
          {t('tasks.createdOn', {
            date: dateLabel(task.createdAt.slice(0, 10)),
          })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('tasks.delete')}
          onClick={() => {
            deleteTask.mutate(task.id, {
              onSuccess: () =>
                toast(t('undo.deleted', { title: task.title }), {
                  action: {
                    label: t('undo.undo'),
                    onClick: () => undo.mutate(undefined),
                  },
                }),
            })
            selectTask(null)
          }}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
