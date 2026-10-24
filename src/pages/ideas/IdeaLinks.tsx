/**
 * Links on an idea (Overleaf, a repo, a shared doc): open in the browser,
 * remove, or add "label + URL".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLinkIcon, XIcon } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useAddIdeaLink, useDeleteIdeaLink, useIdeaLinks } from '@/api/ideas'

export function IdeaLinks({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: links = [] } = useIdeaLinks(ideaId)
  const addLink = useAddIdeaLink()
  const deleteLink = useDeleteIdeaLink()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const add = () => {
    if (url.trim() === '') return
    addLink.mutate(
      { ideaId, label, url },
      { onSuccess: () => (setLabel(''), setUrl('')) }
    )
  }

  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{t('ideas.links')}</h3>
      {links.map(link => (
        <div key={link.id} className="group flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => void openUrl(link.url)}
            className="flex min-w-0 items-center gap-1 truncate text-primary hover:underline"
          >
            <ExternalLinkIcon className="size-3 shrink-0" />
            {link.label}
          </button>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => deleteLink.mutate(link.id)}
            aria-label={t('ideas.deleteLink')}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={t('ideas.linkLabel')}
          className="w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('ideas.linkUrl')}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {addLink.error && (
        <p className="text-xs text-destructive">{t('ideas.badLink')}</p>
      )}
    </section>
  )
}
