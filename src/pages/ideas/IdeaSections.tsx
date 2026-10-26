/**
 * The tabbed lower half of an idea: Progress (steps and links), Todos,
 * Notes, Problems, Papers and Log, each with its count.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIdeaPapers } from '@/api/papers'
import type { Idea } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { IdeaLinks } from './IdeaLinks'
import { IdeaLog } from './IdeaLog'
import { IdeaNotes } from './IdeaNotes'
import { IdeaPapers } from './IdeaPapers'
import { IdeaProblems } from './IdeaProblems'
import { IdeaSteps } from './IdeaSteps'
import { IdeaTodos } from './IdeaTodos'

type Section = 'progress' | 'todos' | 'notes' | 'problems' | 'papers' | 'log'

export function IdeaSections({ idea }: { idea: Idea }) {
  const { t } = useTranslation()
  const [section, setSection] = useState<Section>('progress')
  const { data: papers = [] } = useIdeaPapers(idea.id)
  const tabs: { id: Section; count?: string }[] = [
    { id: 'progress', count: `${idea.stepsDone}/${idea.stepCount}` },
    { id: 'todos', count: String(idea.openTodos) },
    { id: 'notes' },
    { id: 'problems', count: String(idea.openProblems) },
    { id: 'papers', count: String(papers.length) },
    { id: 'log', count: String(idea.logCount) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={cn(
              '-mb-px border-b-2 px-3 py-1.5 text-sm',
              section === tab.id
                ? 'border-primary font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t(`ideas.section.${tab.id}`)}
            {tab.count !== undefined && (
              <span className="ml-1 text-xs opacity-60">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      {section === 'progress' && (
        <>
          <IdeaSteps ideaId={idea.id} />
          <IdeaLinks ideaId={idea.id} />
        </>
      )}
      {section === 'todos' && <IdeaTodos ideaId={idea.id} />}
      {section === 'notes' && <IdeaNotes ideaId={idea.id} />}
      {section === 'problems' && <IdeaProblems ideaId={idea.id} />}
      {section === 'papers' && <IdeaPapers ideaId={idea.id} />}
      {section === 'log' && <IdeaLog ideaId={idea.id} />}
    </div>
  )
}
