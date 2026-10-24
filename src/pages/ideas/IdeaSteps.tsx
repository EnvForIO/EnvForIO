/**
 * The research checklist inside an idea: tick steps (the date is kept),
 * remove them, add more. Shows "Current: step (3/8)".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from 'lucide-react'
import {
  useAddIdeaStep,
  useDeleteIdeaStep,
  useIdeaSteps,
  useSetIdeaStepDone,
} from '@/api/ideas'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { dateLabel } from '@/pages/tasks/dates'

export function IdeaSteps({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: steps = [] } = useIdeaSteps(ideaId)
  const setDone = useSetIdeaStepDone()
  const deleteStep = useDeleteIdeaStep()
  const addStep = useAddIdeaStep()
  const [draft, setDraft] = useState('')

  const done = steps.filter(s => s.doneOn !== null).length
  const current = steps.find(s => s.doneOn === null)

  return (
    <section className="flex flex-col gap-1">
      <h3 className="flex items-baseline justify-between text-sm font-semibold">
        {t('ideas.progress')}
        <span className="text-xs font-normal text-muted-foreground">
          {current
            ? t('ideas.current', {
                step: current.title,
                done,
                total: steps.length,
              })
            : t('ideas.allStepsDone')}
        </span>
      </h3>
      {steps.map(step => (
        <div
          key={step.id}
          className={cn(
            'group flex items-center gap-2 rounded px-1 py-0.5',
            step.id === current?.id && 'bg-accent/60'
          )}
        >
          <Checkbox
            checked={step.doneOn !== null}
            onCheckedChange={checked =>
              setDone.mutate({ id: step.id, done: checked === true })
            }
            aria-label={step.title}
          />
          <span
            className={cn(
              'flex-1 text-sm',
              step.doneOn && 'text-muted-foreground'
            )}
          >
            {step.title}
          </span>
          {step.doneOn && (
            <span className="text-xs text-muted-foreground">
              {dateLabel(step.doneOn)}
            </span>
          )}
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => deleteStep.mutate(step.id)}
            aria-label={t('ideas.deleteStep')}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' || draft.trim() === '') return
          addStep.mutate({ ideaId, title: draft })
          setDraft('')
        }}
        placeholder={t('ideas.addStep')}
        className="mt-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </section>
  )
}
