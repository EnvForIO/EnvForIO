/**
 * "To schedule" at the bottom of My Day: open tasks with no day to do them
 * on (never planned, or planned for a day that passed), folded by default.
 * "Today" plans one for today so it joins My Day.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { useScheduleTask, useUnscheduledTasks } from '@/api/calendar'
import { Button } from '@/components/ui/button'
import { formatMinutes } from '@/lib/duration'

export function ToSchedule({ today }: { today: string }) {
  const { t } = useTranslation()
  const { data: unscheduled = [] } = useUnscheduledTasks()
  const scheduleTask = useScheduleTask()
  const [open, setOpen] = useState(false)
  // Due today or overdue is already in the list above; do not show it twice.
  const tasks = unscheduled.filter(
    task => task.dueDate === null || task.dueDate > today
  )
  if (tasks.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium"
      >
        {open ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronRightIcon className="size-4" />
        )}
        {t('tasks.toSchedule', { count: tasks.length })}
      </button>
      {open &&
        tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-2 rounded-md px-3 py-1 text-sm hover:bg-accent/40"
          >
            <span className="min-w-0 flex-1 truncate">{task.title}</span>
            {task.estimateMinutes !== null && (
              <span className="text-xs text-muted-foreground">
                {formatMinutes(task.estimateMinutes)}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => scheduleTask.mutate({ id: task.id, date: today })}
            >
              {t('tasks.today')}
            </Button>
          </div>
        ))}
    </div>
  )
}
