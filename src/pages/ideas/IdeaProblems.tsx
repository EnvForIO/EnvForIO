/**
 * Problems inside an idea: what is blocking, and how it was solved.
 * Open problems first; a solution is saved when its box loses focus.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheckIcon, CircleIcon, XIcon } from 'lucide-react'
import {
  useAddIdeaProblem,
  useDeleteIdeaProblem,
  useIdeaProblems,
  useUpdateIdeaProblem,
} from '@/api/ideas'
import { Textarea } from '@/components/ui/textarea'
import type { IdeaProblem } from '@/lib/tauri-bindings'
import { isEnter } from '@/lib/keys'

function Problem({ problem }: { problem: IdeaProblem }) {
  const { t } = useTranslation()
  const update = useUpdateIdeaProblem()
  const remove = useDeleteIdeaProblem()
  const [solution, setSolution] = useState(problem.solution)
  const save = (solved: boolean) =>
    update.mutate({ id: problem.id, solution, solved })

  return (
    <div className="group flex flex-col gap-1 rounded-md border p-2">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => save(!problem.isSolved)}
          aria-label={
            problem.isSolved ? t('ideas.markUnsolved') : t('ideas.markSolved')
          }
        >
          {problem.isSolved ? (
            <CircleCheckIcon className="size-4 text-emerald-600" />
          ) : (
            <CircleIcon className="size-4 text-amber-600" />
          )}
        </button>
        <span className="flex-1 text-sm font-medium">{problem.problem}</span>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100"
          onClick={() => remove.mutate(problem.id)}
          aria-label={t('ideas.deleteProblem')}
        >
          <XIcon className="size-3" />
        </button>
      </div>
      <Textarea
        value={solution}
        onChange={e => setSolution(e.target.value)}
        onBlur={() => solution !== problem.solution && save(problem.isSolved)}
        placeholder={t('ideas.solutionPlaceholder')}
        className="min-h-12 text-sm"
      />
    </div>
  )
}

export function IdeaProblems({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: problems = [] } = useIdeaProblems(ideaId)
  const add = useAddIdeaProblem()
  const [draft, setDraft] = useState('')

  return (
    <section className="flex flex-col gap-2">
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (!isEnter(e) || draft.trim() === '') return
          add.mutate({ ideaId, problem: draft })
          setDraft('')
        }}
        placeholder={t('ideas.addProblem')}
        className="bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      {problems.map(p => (
        <Problem key={`${p.id}-${p.isSolved}`} problem={p} />
      ))}
    </section>
  )
}
