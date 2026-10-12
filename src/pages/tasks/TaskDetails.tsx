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
  useTasks,
  useToday,
  useUpdateTask,
} from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Task, TaskUpdate } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel, formatDate, parseDate } from './dates'
import { TaskSteps } from './TaskSteps'

export function TaskDetails() {
  const view = useUIStore(state => state.selectedView)
  const selectedTaskId = useUIStore(state => state.selectedTaskId)
  const { data: tasks = [] } = useTasks(view)
  // NOTE: the task is looked up in the current list, so un-starring a task in
  // Important closes the pane. Microsoft To Do keeps it open; fine for now.
  const task = tasks.find(t => t.id === selectedTaskId)
  if (!task) return null
  // Keyed by id so the text drafts reset when another task is selected.
  return <TaskDetailsForm key={task.id} task={task} />
}

function TaskDetailsForm({ task }: { task: Task }) {
  const { t } = useTranslation()
  const today = useToday()
  const selectTask = useUIStore(state => state.selectTask)
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)

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
