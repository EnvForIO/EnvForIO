/**
 * Filter chips above the idea list: All, Pinned, Unfinished, each status and
 * each tag, with counts. A new tag can be typed at the end.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateTag, useIdeaCounts, useTags } from '@/api/ideas'
import type { IdeaFilter } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { NO_FILTER, STATUS_COLOR, STATUSES } from './status'

function Chip(props: {
  active: boolean
  onClick: () => void
  color?: string
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
        props.active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'hover:bg-accent'
      )}
    >
      {props.color && (
        <span
          className="size-2 rounded-full"
          style={{ background: props.color }}
        />
      )}
      {props.label}
      <span className="opacity-60">{props.count}</span>
    </button>
  )
}

export function IdeaFilters({
  filter,
  onChange,
}: {
  filter: IdeaFilter
  onChange: (f: IdeaFilter) => void
}) {
  const { t } = useTranslation()
  const { data: counts } = useIdeaCounts()
  const { data: tags = [] } = useTags()
  const createTag = useCreateTag()
  const [newTag, setNewTag] = useState('')
  if (!counts) return null

  const is = (f: Partial<IdeaFilter>) =>
    JSON.stringify({ ...NO_FILTER, ...f }) === JSON.stringify(filter)
  const tagCount = new Map(counts.byTag)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip
        active={is({})}
        onClick={() => onChange(NO_FILTER)}
        label={t('ideas.all')}
        count={counts.all}
      />
      <Chip
        active={is({ pinned: true })}
        onClick={() => onChange({ ...NO_FILTER, pinned: true })}
        label={t('ideas.pinned')}
        count={counts.pinned}
      />
      <Chip
        active={is({ unfinished: true })}
        onClick={() => onChange({ ...NO_FILTER, unfinished: true })}
        label={t('ideas.unfinished')}
        count={counts.unfinished}
      />
      {STATUSES.map(status => (
        <Chip
          key={status}
          active={filter.status === status}
          onClick={() => onChange({ ...NO_FILTER, status })}
          color={STATUS_COLOR[status]}
          label={t(`ideas.status.${status}`)}
          count={counts.byStatus.find(([s]) => s === status)?.[1] ?? 0}
        />
      ))}
      {tags.map(tag => (
        <Chip
          key={tag.id}
          active={filter.tagId === tag.id}
          onClick={() => onChange({ ...NO_FILTER, tagId: tag.id })}
          label={`#${tag.name}`}
          count={tagCount.get(tag.id) ?? 0}
        />
      ))}
      <input
        value={newTag}
        onChange={e => setNewTag(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Enter' || newTag.trim() === '') return
          createTag.mutate({ name: newTag, color: '#64748b' })
          setNewTag('')
        }}
        placeholder={t('ideas.newTag')}
        className="w-24 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
