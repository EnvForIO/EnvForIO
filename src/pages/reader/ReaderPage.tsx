/**
 * The RSS reader (phase 4 step 8): feeds on the left (paste a feed or a
 * site's address to add one; right-click to remove), their items in the
 * middle with cover images, newest first, and the selected item on the
 * right. Opening an item marks it read. Feeds refresh on start and every
 * three hours.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircleIcon,
  CheckCheckIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAddFeed,
  useFeedItems,
  useFeedSync,
  useFeeds,
  useMarkFeedRead,
  useRefreshFeeds,
  useRemoveFeed,
  useSetFeedItemRead,
} from '@/api/feeds'
import { errorText } from '@/api/papers'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import type { FeedItem } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { ItemView } from './ItemView'
import { shortDate } from './dates'

export function ReaderPage() {
  const { t } = useTranslation()
  useFeedSync()
  const { data: feeds = [] } = useFeeds()
  const [feedId, setFeedId] = useState<number | null>(null)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const { data: items = [] } = useFeedItems(feedId, unreadOnly)
  const add = useAddFeed()
  const remove = useRemoveFeed()
  const refresh = useRefreshFeeds()
  const markAll = useMarkFeedRead()
  const setRead = useSetFeedItemRead()
  const [address, setAddress] = useState('')

  const totalUnread = feeds.reduce((sum, f) => sum + f.unread, 0)
  const item = items.find(i => i.id === selected) ?? null

  const subscribe = () => {
    if (address.trim() === '' || add.isPending) return
    add.mutate(address, {
      onSuccess: feed => {
        setAddress('')
        setFeedId(feed.id)
      },
      onError: e => toast.error(errorText(e)),
    })
  }

  const open = (i: FeedItem) => {
    setSelected(i.id)
    if (!i.isRead) setRead.mutate({ id: i.id, read: true })
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-56 shrink-0 flex-col gap-2 border-e p-3">
        <div className="flex items-center gap-1">
          <h1 className="flex-1 text-lg font-semibold">{t('reader.title')}</h1>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={t('reader.refresh')}
            disabled={refresh.isPending || feeds.length === 0}
            onClick={() =>
              refresh.mutate(undefined, {
                onError: e => toast.error(errorText(e)),
              })
            }
          >
            {refresh.isPending ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3.5" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-md border px-2">
          {add.isPending ? (
            <Loader2Icon className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && subscribe()}
            placeholder={t('reader.addPlaceholder')}
            className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <FeedButton
            label={t('reader.all')}
            unread={totalUnread}
            active={feedId === null}
            onClick={() => setFeedId(null)}
          />
          {feeds.map(f => (
            <ContextMenu key={f.id}>
              <ContextMenuTrigger asChild>
                <div>
                  <FeedButton
                    label={f.title}
                    unread={f.unread}
                    error={f.error}
                    active={feedId === f.id}
                    onClick={() => setFeedId(f.id)}
                  />
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-44">
                <ContextMenuItem onSelect={() => markAll.mutate(f.id)}>
                  <CheckCheckIcon />
                  {t('reader.markAllRead')}
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  onSelect={() => {
                    remove.mutate(f.id)
                    if (feedId === f.id) setFeedId(null)
                  }}
                >
                  <Trash2Icon />
                  {t('reader.remove')}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </nav>
        {feeds.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('reader.empty')}</p>
        )}
      </aside>

      <section className="flex w-80 shrink-0 flex-col border-e">
        <div className="flex items-center gap-1 border-b px-3 py-2 text-xs">
          {([false, true] as const).map(only => (
            <button
              key={String(only)}
              type="button"
              onClick={() => setUnreadOnly(only)}
              className={cn(
                'rounded-full px-2 py-0.5',
                unreadOnly === only
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              {only ? t('reader.unread') : t('reader.everything')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => markAll.mutate(feedId)}
            className="ms-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-accent"
          >
            <CheckCheckIcon className="size-3.5" />
            {t('reader.markAllRead')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('reader.noItems')}
            </p>
          ) : (
            items.map(i => (
              <button
                key={i.id}
                type="button"
                onClick={() => open(i)}
                className={cn(
                  'flex w-full gap-2.5 border-b px-3 py-2.5 text-start hover:bg-accent/50',
                  selected === i.id && 'bg-accent'
                )}
              >
                {i.image ? (
                  <img
                    src={i.image}
                    alt=""
                    loading="lazy"
                    className="h-12 w-16 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span className="h-12 w-16 shrink-0 rounded bg-muted" />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      'line-clamp-2 text-sm leading-snug',
                      i.isRead ? 'text-muted-foreground' : 'font-medium'
                    )}
                  >
                    {i.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {i.feedTitle} · {shortDate(i.dateMs)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <div className="min-w-0 flex-1">
        {item ? (
          <ItemView key={item.id} item={item} />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">
            {t('reader.pick')}
          </p>
        )}
      </div>
    </div>
  )
}

function FeedButton(props: {
  label: string
  unread: number
  active: boolean
  error?: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.error ?? undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent/60',
        props.active && 'bg-accent font-medium'
      )}
    >
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
      {props.error && (
        <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" />
      )}
      {props.unread > 0 && (
        <span className="text-xs text-muted-foreground">{props.unread}</span>
      )}
    </button>
  )
}
