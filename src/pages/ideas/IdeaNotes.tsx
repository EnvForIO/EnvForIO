/**
 * An idea's notes (Markdown with LaTeX), saved when the editor loses focus.
 */
import { useTranslation } from 'react-i18next'
import { useIdeaNotes, useSetIdeaNotes } from '@/api/ideas'
import { MarkdownNotes } from '@/components/MarkdownNotes'

export function IdeaNotes({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: notes } = useIdeaNotes(ideaId)
  const setNotes = useSetIdeaNotes()
  if (notes === undefined) return null
  return (
    <MarkdownNotes
      key={ideaId}
      saved={notes}
      onSave={text => setNotes.mutate({ id: ideaId, notes: text })}
      placeholder={t('ideas.notesPlaceholder')}
      emptyText={t('ideas.notesEmpty')}
    />
  )
}
