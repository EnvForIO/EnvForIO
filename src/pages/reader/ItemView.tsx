/**
 * One feed item in the reading pane: cover, title, feed, author and date,
 * the summary as plain text (the feed's HTML is never rendered), and
 * Open in browser / Add to todos / Mark as unread.
 */
import { useTranslation } from 'react-i18next'
import { CheckIcon, ExternalLinkIcon, ListPlusIcon } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { useAddFeedItemToTodos, useSetFeedItemRead } from '@/api/feeds'
import { errorText } from '@/api/papers'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { FeedItem } from '@/lib/tauri-bindings'
import { longDate } from './dates'

export function ItemView({ item }: { item: FeedItem }) {
  const { t } = useTranslation()
  const addToTodos = useAddFeedItemToTodos()
  const setRead = useSetFeedItemRead()
  const byline = [item.feedTitle, item.author, longDate(item.dateMs)]
    .filter(Boolean)
    .join(' · ')

  return (
    <ScrollArea className="h-full">
      <article className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-5">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="max-h-72 w-full rounded-lg object-cover"
          />
        )}
        <header className="flex flex-col gap-1">
          <h2 className="text-xl leading-snug font-semibold">{item.title}</h2>
          <p className="text-sm text-muted-foreground">{byline}</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {item.link && (
            <Button size="sm" onClick={() => void openUrl(item.link)}>
              <ExternalLinkIcon />
              {t('reader.openInBrowser')}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={item.taskId !== null || addToTodos.isPending}
            onClick={() =>
              addToTodos.mutate(item.id, {
                onSuccess: () => toast.success(t('reader.addedToTodos')),
                onError: e => toast.error(errorText(e)),
              })
            }
          >
            {item.taskId !== null ? <CheckIcon /> : <ListPlusIcon />}
            {item.taskId !== null
              ? t('reader.inTodos')
              : t('reader.addToTodos')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRead.mutate({ id: item.id, read: false })}
          >
            {t('reader.markUnread')}
          </Button>
        </div>
        {item.summary === '' ? (
          <p className="text-sm text-muted-foreground">
            {t('reader.noSummary')}
          </p>
        ) : (
          item.summary.split('\n\n').map((para, i) => (
            <p key={i} className="leading-relaxed select-text">
              {para}
            </p>
          ))
        )}
      </article>
    </ScrollArea>
  )
}
