/**
 * "To schedule": open tasks without a day. Drag one onto the calendar;
 * drop a scheduled task here to take it off the calendar.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useScheduleTask, useUnscheduledTasks } from '@/api/calendar'
import { cn } from '@/lib/utils'
import { TASK_DRAG_TYPE, TaskChip } from './TaskChip'

export function UnscheduledPanel({ colors }: { colors: Map<number, string> }) {
  const { t } = useTranslation()
  const { data: tasks = [] } = useUnscheduledTasks()
  const scheduleTask = useScheduleTask()
  const [dropping, setDropping] = useState(false)

  return (
    <aside
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={e => {
        e.preventDefault()
        setDropping(false)
        const id = Number(e.dataTransfer.getData(TASK_DRAG_TYPE))
        if (id) scheduleTask.mutate({ id, date: null })
      }}
      className={cn(
        'flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-l p-2',
        dropping && 'bg-primary/10'
      )}
    >
      <h2 className="px-1 text-sm font-semibold">
        {t('calendar.toSchedule', { count: tasks.length })}
      </h2>
      <p className="px-1 text-xs text-muted-foreground">
        {t('calendar.dragHint')}
      </p>
      {tasks.map(task => (
        <TaskChip
          key={task.id}
          task={task}
          color={
            task.projectId === null ? undefined : colors.get(task.projectId)
          }
        />
      ))}
    </aside>
  )
}
