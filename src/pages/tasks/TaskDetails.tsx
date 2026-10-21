/**
 * The right pane: everything about the selected task. Text fields save when
 * they lose focus; toggles and the date save at once.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinIcon, StarIcon, SunIcon, Trash2Icon, XIcon } from 'lucide-react'
import {
  toUpdate,
  useDeleteTask,
  useTask,
  useToday,
  useUpdateTask,
} from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { formatMinutes } from '@/lib/duration'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel, formatDate, parseDate } from './dates'
import { TaskSteps } from './TaskSteps'
import { TimerSection } from '@/pages/timer/TimerSection'

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

function TaskDetailsForm({ task }: { task: Task }) {
  const { t } = useTranslation()
  const today = useToday()
  const selectTask = useUIStore(state => state.selectTask)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [estimate, setEstimate] = useState(
    task.estimateMinutes === null ? '' : formatMinutes(task.estimateMinutes)
  )

  const save = (change: Partial<TaskUpdate>) =>
    updateTask.mutate({
      id: task.id,
      update: { ...toUpdate(task, today), title, note, ...change },
    })

  const inMyDay = task.myDayDate !== null && task.myDayDate === today
  const toggles = [
    {
      key: 'myDay',
      on: inMyDay,
      icon: SunIcon,
      label: inMyDay ? t('tasks.removeFromMyDay') : t('tasks.addToMyDay'),
      change: { inMyDay: !inMyDay },
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
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
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

      <TaskSteps taskId={task.id} />

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

      <DatePicker
        value={task.dueDate ? parseDate(task.dueDate) : undefined}
        onChange={date => save({ dueDate: date ? formatDate(date) : null })}
        placeholder={t('tasks.addDueDate')}
      />

      <Input
        value={estimate}
        onChange={e => setEstimate(e.target.value)}
        onBlur={() =>
          save({ estimate: estimate.trim() === '' ? null : estimate })
        }
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={t('tasks.addEstimate')}
        aria-label={t('tasks.estimate')}
      />
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
            deleteTask.mutate(task.id)
            selectTask(null)
          }}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  )
}
