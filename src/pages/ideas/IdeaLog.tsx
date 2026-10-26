/**
 * The progress log of an idea: dated one-line entries, newest first.
 * New entries are dated today.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from 'lucide-react'
import { useAddIdeaLog, useDeleteIdeaLog, useIdeaLogs } from '@/api/ideas'
import { dateLabel } from '@/pages/tasks/dates'

export function IdeaLog({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: logs = [] } = useIdeaLogs(ideaId)
  const add = useAddIdeaLog()
  const remove = useDeleteIdeaLog()
  const [draft, setDraft] = useState('')

  return (
    <section className="flex flex-col gap-1">
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' || draft.trim() === '') return
          add.mutate({ ideaId, text: draft })
          setDraft('')
        }}
        placeholder={t('ideas.addLog')}
        className="bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      {logs.map(log => (
        <div
          key={log.id}
          className="group flex gap-3 border-l-2 py-1 pl-3 text-sm"
        >
          <span className="w-20 shrink-0 text-xs text-muted-foreground">
            {dateLabel(log.date)}
          </span>
          <span className="flex-1">{log.text}</span>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => remove.mutate(log.id)}
            aria-label={t('ideas.deleteLog')}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </section>
  )
}
