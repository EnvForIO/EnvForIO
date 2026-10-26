/**
 * Notes in Markdown with LaTeX ($x^2$, $$...$$), code blocks and tables.
 * Shown rendered; click to edit; `onSave` runs when the editor loses focus
 * and the text changed. Remount (via `key`) to show a different note.
 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { Textarea } from '@/components/ui/textarea'

export function MarkdownNotes({
  saved,
  onSave,
  placeholder,
  emptyText,
}: {
  saved: string
  onSave: (text: string) => void
  placeholder: string
  emptyText: string
}) {
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
          if (text !== saved) onSave(text)
        }}
        placeholder={placeholder}
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
        <p className="text-muted-foreground">{emptyText}</p>
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
