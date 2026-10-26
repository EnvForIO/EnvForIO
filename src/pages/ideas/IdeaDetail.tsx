/**
 * The right column of the Ideas page: status, priority, pin, venue,
 * deadline, tags, title and description, then the tabbed sections.
 * Text saves when it loses focus; choices save at once.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PinIcon, Trash2Icon } from 'lucide-react'
import { useDeleteIdea, useIdea, useTags, useUpdateIdea } from '@/api/ideas'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Idea, IdeaStatus, IdeaUpdate } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { formatDate, parseDate } from '@/pages/tasks/dates'
import { IdeaSections } from './IdeaSections'
import { STATUS_COLOR, STATUSES } from './status'

const toUpdate = (idea: Idea): IdeaUpdate => ({
  title: idea.title,
  description: idea.description,
  status: idea.status,
  priority: idea.priority,
  isPinned: idea.isPinned,
  venue: idea.venue,
  deadline: idea.deadline,
  tagIds: idea.tags.map(t => t.id),
})

export function IdeaDetail({
  id,
  onDeleted,
}: {
  id: number
  onDeleted: () => void
}) {
  const { data: idea } = useIdea(id)
  if (!idea) return null
  return <Form key={idea.id} idea={idea} onDeleted={onDeleted} />
}

function Form({ idea, onDeleted }: { idea: Idea; onDeleted: () => void }) {
  const { t } = useTranslation()
  const { data: tags = [] } = useTags()
  const updateIdea = useUpdateIdea()
  const deleteIdea = useDeleteIdea()
  const [title, setTitle] = useState(idea.title)
  const [description, setDescription] = useState(idea.description)
  const [venue, setVenue] = useState(idea.venue)

  const save = (change: Partial<IdeaUpdate>) =>
    updateIdea.mutate({
      id: idea.id,
      update: { ...toUpdate(idea), title, description, venue, ...change },
    })
  const tagIds = idea.tags.map(tag => tag.id)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={idea.status}
          onValueChange={v => save({ status: v as IdeaStatus })}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ background: STATUS_COLOR[s] }}
                />
                {t(`ideas.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(idea.priority)}
          onValueChange={v => save({ priority: Number(v) })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3].map(p => (
              <SelectItem key={p} value={String(p)}>
                {t(`ideas.priority.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={idea.isPinned ? 'default' : 'outline'}
          onClick={() => save({ isPinned: !idea.isPinned })}
        >
          <PinIcon className="size-3.5" />
          {idea.isPinned ? t('ideas.pinnedOn') : t('ideas.pin')}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto"
          aria-label={t('ideas.delete')}
          onClick={() => deleteIdea.mutate(idea.id, { onSuccess: onDeleted })}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => title.trim() !== '' && title !== idea.title && save({})}
        className="text-lg font-semibold"
        aria-label={t('ideas.title')}
      />
      <Textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={() => description !== idea.description && save({})}
        placeholder={t('ideas.descriptionPlaceholder')}
        className="min-h-16"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={venue}
          onChange={e => setVenue(e.target.value)}
          onBlur={() => venue !== idea.venue && save({})}
          placeholder={t('ideas.venuePlaceholder')}
        />
        <DatePicker
          value={idea.deadline ? parseDate(idea.deadline) : undefined}
          onChange={d => save({ deadline: d ? formatDate(d) : null })}
          placeholder={t('ideas.deadline')}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => {
          const on = tagIds.includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                save({
                  tagIds: on
                    ? tagIds.filter(id => id !== tag.id)
                    : [...tagIds, tag.id],
                })
              }
              className={cn(
                'rounded-full border px-2 py-0.5 text-xs',
                on
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground'
              )}
            >
              #{tag.name}
            </button>
          )
        })}
      </div>

      <IdeaSections idea={idea} />
    </div>
  )
}
