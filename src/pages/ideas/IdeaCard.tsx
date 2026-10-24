/**
 * One idea in the list: title, target venue, priority flag, description,
 * a segmented progress bar with the current step, days left and tags.
 */
import { useTranslation } from 'react-i18next'
import { FlagIcon, PinIcon } from 'lucide-react'
import { useToday } from '@/api/tasks'
import type { Idea } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { parseDate } from '@/pages/tasks/dates'
import { PRIORITY_COLOR, STATUS_COLOR } from './status'

const daysBetween = (from: string, to: string) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000)

export function IdeaCard({
  idea,
  selected,
  onSelect,
}: {
  idea: Idea
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const today = useToday()
  const daysLeft =
    idea.deadline && today ? daysBetween(today, idea.deadline) : null

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-1.5 rounded-md border bg-card p-3 text-left hover:bg-accent/40',
        selected && 'border-primary bg-accent/60'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: STATUS_COLOR[idea.status] }}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {idea.title}
        </span>
        {idea.venue && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
            {idea.venue}
          </span>
        )}
        {idea.priority > 0 && (
          <FlagIcon
            className="size-3.5 shrink-0"
            style={{
              color: PRIORITY_COLOR[idea.priority],
              fill: PRIORITY_COLOR[idea.priority],
            }}
          />
        )}
        {idea.isPinned && (
          <PinIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
      {idea.description && (
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {idea.description}
        </p>
      )}
      {idea.stepCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-0.5">
            {Array.from({ length: idea.stepCount }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i < idea.stepsDone ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {idea.currentStep ?? t('ideas.allStepsDone')}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {daysLeft !== null && (
          <span className={cn(daysLeft < 0 && 'text-destructive')}>
            {daysLeft >= 0
              ? t('ideas.daysLeft', { count: daysLeft })
              : t('ideas.daysOver', { count: -daysLeft })}
          </span>
        )}
        {idea.tags.map(tag => (
          <span key={tag.id}>#{tag.name}</span>
        ))}
      </div>
    </button>
  )
}
