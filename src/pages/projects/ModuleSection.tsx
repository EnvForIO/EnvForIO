/**
 * One module of a project (or the ungrouped tasks): its name, its tasks,
 * and an add row that takes a title and an optional estimate ("1h30m").
 * Double-click the name to rename; the menu deletes the module.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2Icon } from 'lucide-react'
import {
  useAddProjectTask,
  useDeleteModule,
  useRenameModule,
} from '@/api/projects'
import { formatMinutes } from '@/lib/duration'
import type { Module, Task } from '@/lib/tauri-bindings'
import { TaskRow } from '@/pages/tasks/TaskRow'

interface Props {
  projectId: number
  module: Module | null // null = tasks without a module
  tasks: Task[]
}

export function ModuleSection({ projectId, module, tasks }: Props) {
  const { t } = useTranslation()
  const addTask = useAddProjectTask()
  const renameModule = useRenameModule()
  const deleteModule = useDeleteModule()
  const [title, setTitle] = useState('')
  const [estimate, setEstimate] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(module?.name ?? '')

  const total = tasks.reduce(
    (sum, task) => sum + (task.estimateMinutes ?? 0),
    0
  )

  const add = () => {
    if (title.trim() === '') return
    addTask.mutate(
      {
        projectId,
        moduleId: module?.id ?? null,
        title,
        estimate: estimate || null,
      },
      { onSuccess: () => (setTitle(''), setEstimate('')) }
    )
  }
  const finishRename = () => {
    setRenaming(false)
    if (module && name.trim() !== '' && name !== module.name) {
      renameModule.mutate({ id: module.id, name })
    }
  }

  return (
    <section className="flex flex-col gap-1">
      <div className="group flex items-center gap-2 px-1 pt-2">
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={finishRename}
            onKeyDown={e => e.key === 'Enter' && finishRename()}
            className="rounded bg-accent px-1 text-sm font-semibold outline-none"
          />
        ) : (
          <h2
            className="text-sm font-semibold"
            onDoubleClick={() => module && setRenaming(true)}
          >
            {module ? module.name : t('projects.ungrouped')}
          </h2>
        )}
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatMinutes(total)}
          </span>
        )}
        {module && (
          <button
            type="button"
            className="ml-auto opacity-0 group-hover:opacity-100"
            aria-label={t('projects.deleteModule')}
            onClick={() => deleteModule.mutate(module.id)}
          >
            <Trash2Icon className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {tasks.map(task => (
        <TaskRow key={task.id} task={task} view="Tasks" />
      ))}

      <div className="flex items-center gap-2 rounded-md border border-dashed px-3">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('tasks.addPlaceholder')}
          className="h-8 flex-1 bg-transparent text-sm outline-none"
        />
        <input
          value={estimate}
          onChange={e => setEstimate(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('projects.estimatePlaceholder')}
          className="h-8 w-20 bg-transparent text-right text-sm outline-none"
        />
      </div>
      {addTask.error && (
        <p className="px-1 text-xs text-destructive">
          {t('projects.badEstimate')}
        </p>
      )}
    </section>
  )
}
