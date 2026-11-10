/**
 * Sub-steps of a task in the details pane: tick, delete, and "Next step".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon, XIcon } from 'lucide-react'
import {
  useAddTaskStep,
  useDeleteTaskStep,
  useSetTaskStepDone,
  useTaskSteps,
} from '@/api/tasks'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isEnter } from '@/lib/keys'

export function TaskSteps({ taskId }: { taskId: number }) {
  const { t } = useTranslation()
  const { data: steps = [] } = useTaskSteps(taskId)
  const addStep = useAddTaskStep()
  const setStepDone = useSetTaskStepDone()
  const deleteStep = useDeleteTaskStep()
  const [draft, setDraft] = useState('')

  const add = () => {
    const title = draft.trim()
    if (title === '') return
    addStep.mutate({ taskId, title })
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1">
      {steps.map(step => (
        <div key={step.id} className="group flex items-center gap-2 px-1 py-1">
          <Checkbox
            checked={step.isDone}
            onCheckedChange={checked =>
              setStepDone.mutate({ id: step.id, done: checked === true })
            }
            aria-label={step.title}
          />
          <span
            className={cn(
              'flex-1 text-sm',
              step.isDone && 'text-muted-foreground line-through'
            )}
          >
            {step.title}
          </span>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => deleteStep.mutate(step.id)}
            aria-label={t('tasks.deleteStep')}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 px-1">
        <PlusIcon className="size-4 text-muted-foreground" />
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={
            steps.length === 0 ? t('tasks.addStep') : t('tasks.nextStep')
          }
          className="h-8 border-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  )
}
