/**
 * An idea's notes: Markdown with LaTeX ($x^2$, $$...$$), code blocks and
 * tables. Shown rendered; click to edit; saved when the editor loses focus.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { useIdeaNotes, useSetIdeaNotes } from '@/api/ideas'
import { Textarea } from '@/components/ui/textarea'

export function IdeaNotes({ ideaId }: { ideaId: number }) {
  const { data: notes } = useIdeaNotes(ideaId)
  if (notes === undefined) return null
  return <Editor key={ideaId} ideaId={ideaId} saved={notes} />
}

function Editor({ ideaId, saved }: { ideaId: number; saved: string }) {
  const { t } = useTranslation()
  const setNotes = useSetIdeaNotes()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(saved)

  if (editing) {
    return (
      <Textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (text !== saved) setNotes.mutate({ id: ideaId, notes: text })
        }}
        placeholder={t('ideas.notesPlaceholder')}
        className="min-h-64 font-mono text-sm"
      />
    )
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={e => e.key === 'Enter' && setEditing(true)}
      className="markdown min-h-24 cursor-text rounded-md border border-transparent p-2 text-sm hover:border-border"
    >
      {text.trim() === '' ? (
        <p className="text-muted-foreground">{t('ideas.notesEmpty')}</p>
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {text}
        </ReactMarkdown>
      )}
    </div>
  )
}
