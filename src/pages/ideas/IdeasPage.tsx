/**
 * Ideas (Seedbank), a tab of Research: "jot down a new idea" on top, filter
 * chips, then the card list on the left and the selected idea on the right.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LightbulbIcon } from 'lucide-react'
import { useCreateIdea, useIdeas } from '@/api/ideas'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useUIStore } from '@/store/ui-store'
import type { IdeaFilter } from '@/lib/tauri-bindings'
import { IdeaCard } from './IdeaCard'
import { IdeaDetail } from './IdeaDetail'
import { IdeaFilters } from './IdeaFilters'
import { NO_FILTER } from './status'
import { isEnter } from '@/lib/keys'

export function IdeasPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<IdeaFilter>(NO_FILTER)
  const [selected, setSelected] = useState<number | null>(
    () => useUIStore.getState().focusIdeaId
  )
  const [draft, setDraft] = useState('')
  const { data: ideas = [] } = useIdeas(filter)
  const createIdea = useCreateIdea()

  const add = () => {
    if (draft.trim() === '') return
    createIdea.mutate(draft, { onSuccess: idea => setSelected(idea.id) })
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col gap-3 px-5 pt-3 pb-4">
      <div className="flex items-center gap-2 rounded-md border px-3">
        <LightbulbIcon className="size-4 text-muted-foreground" />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={t('ideas.jotDown')}
          className="h-9 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <IdeaFilters filter={filter} onChange={setFilter} />
      <div className="flex min-h-0 flex-1 gap-4">
        <ScrollArea className="w-80 shrink-0">
          <div className="flex flex-col gap-2 pr-3">
            {ideas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('ideas.empty')}
              </p>
            )}
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                selected={idea.id === selected}
                onSelect={() => setSelected(idea.id)}
              />
            ))}
          </div>
        </ScrollArea>
        <ScrollArea className="min-w-0 flex-1">
          <div className="pr-3">
            {selected === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('ideas.pickOne')}
              </p>
            ) : (
              <IdeaDetail id={selected} onDeleted={() => setSelected(null)} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
