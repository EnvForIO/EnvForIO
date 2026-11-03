/**
 * A project as a board (phase 4 step 5): To do, Doing and Done columns
 * (user decision 2026-11-20). Drag a card to another column to move it;
 * Doing is set by dragging or by starting the task's timer, Done completes
 * the task. Click a card to open its details; "To do" has an add box.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ListChecksIcon, TimerIcon } from 'lucide-react'
import { useAddProjectTask } from '@/api/projects'
import { useSetTaskStage } from '@/api/tasks'
import { formatMinutes } from '@/lib/duration'
import type { Module, Task, TaskStage } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from '@/pages/tasks/dates'

const STAGES: TaskStage[] = ['Todo', 'Doing', 'Done']
const STAGE_COLOR: Record<TaskStage, string> = {
  Todo: 'var(--muted-foreground)',
  Doing: '#0071e3',
  Done: '#34c759',
}
const DRAG_TYPE = 'application/x-envio-board-task'

const stageOf = (task: Task): TaskStage =>
  task.doneAt !== null ? 'Done' : task.startedAt !== null ? 'Doing' : 'Todo'

/** Open columns keep the manual order; Done shows the latest finished first. */
function inColumn(tasks: Task[], stage: TaskStage): Task[] {
  const here = tasks.filter(task => stageOf(task) === stage)
  return stage === 'Done'
    ? here.sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
    : here
}

export function ProjectBoard({
  projectId,
  modules,
  tasks,
}: {
  projectId: number
  modules: Module[]
  tasks: Task[]
}) {
  const moduleName = new Map(modules.map(m => [m.id, m.name]))
  return (
    <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
      {STAGES.map(stage => (
        <Column
          key={stage}
          stage={stage}
          projectId={projectId}
          tasks={inColumn(tasks, stage)}
          moduleName={moduleName}
        />
      ))}
    </div>
  )
}

function Column({
  stage,
  projectId,
  tasks,
  moduleName,
}: {
  stage: TaskStage
  projectId: number
  tasks: Task[]
  moduleName: Map<number, string>
}) {
  const { t } = useTranslation()
  const setStage = useSetTaskStage()
  const addTask = useAddProjectTask()
  const [dropping, setDropping] = useState(false)
  const [title, setTitle] = useState('')

  const add = () => {
    if (title.trim() === '') return
    addTask.mutate({ projectId, moduleId: null, title, estimate: null })
    setTitle('')
  }

  return (
    <section
      onDragOver={e => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={e => {
        setDropping(false)
        const id = Number(e.dataTransfer.getData(DRAG_TYPE))
        if (id) setStage.mutate({ id, stage })
      }}
      className={cn(
        'flex min-h-0 flex-col gap-2 rounded-lg bg-muted/50 p-2 transition-colors',
        dropping && 'bg-accent ring-2 ring-primary/30'
      )}
    >
      <header className="flex items-center gap-2 px-1 text-sm font-medium">
        <span
          className="size-2 rounded-full"
          style={{ background: STAGE_COLOR[stage] }}
        />
        {t(`projects.stage.${stage}`)}
        <span className="text-xs font-normal text-muted-foreground">
          {tasks.length}
        </span>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map(task => (
          <Card
            key={task.id}
            task={task}
            module={
              task.moduleId === null ? null : moduleName.get(task.moduleId)
            }
          />
        ))}
        {stage === 'Todo' && (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('projects.addTask')}
            className="h-8 shrink-0 rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground hover:bg-background/60 focus:bg-background"
          />
        )}
      </div>
    </section>
  )
}

function Card({ task, module }: { task: Task; module?: string | null }) {
  const selected = useUIStore(state => state.selectedTaskId === task.id)
  const selectTask = useUIStore(state => state.selectTask)
  const done = task.doneAt !== null
  const facts = [
    task.estimateMinutes !== null && {
      icon: TimerIcon,
      text: formatMinutes(task.estimateMinutes),
    },
    task.stepCount > 0 && {
      icon: ListChecksIcon,
      text: `${task.stepsDone}/${task.stepCount}`,
    },
  ].filter(f => f !== false)

  return (
    <button
      type="button"
      draggable
      onDragStart={e => {
        e.dataTransfer.setData(DRAG_TYPE, String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => selectTask(task.id)}
      className={cn(
        'flex shrink-0 cursor-grab flex-col gap-1.5 rounded-md border bg-card p-2.5 text-start shadow-xs hover:border-ring/60 active:cursor-grabbing',
        selected && 'border-primary'
      )}
    >
      <span
        className={cn(
          'flex items-start gap-1.5 text-sm',
          done && 'text-muted-foreground line-through'
        )}
      >
        {done && (
          <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-[#34c759]" />
        )}
        {task.title}
      </span>
      {(module || task.dueDate || facts.length > 0) && (
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {module && (
            <span className="rounded bg-muted px-1.5 py-0.5">{module}</span>
          )}
          {task.dueDate && <span>{dateLabel(task.dueDate)}</span>}
          {facts.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1">
              <Icon className="size-3" />
              {text}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}
