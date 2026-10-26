/**
 * One paper in the library list: reading status, title, byline, and how
 * many ideas use it.
 */
import { LightbulbIcon } from 'lucide-react'
import type { Paper } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { paperByline, READING_COLOR } from './format'

export function PaperRow({
  paper,
  selected,
  onSelect,
}: {
  paper: Paper
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-1 rounded-md border p-2.5 text-start hover:bg-accent/60',
        selected && 'border-primary bg-accent/40'
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full"
          style={{ background: READING_COLOR[paper.status] }}
        />
        <span className="line-clamp-2 flex-1 text-sm font-medium">
          {paper.title}
        </span>
      </div>
      <div className="flex items-center gap-2 ps-4 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">{paperByline(paper)}</span>
        {paper.ideaCount > 0 && (
          <span className="flex shrink-0 items-center gap-0.5">
            <LightbulbIcon className="size-3" />
            {paper.ideaCount}
          </span>
        )}
      </div>
    </button>
  )
}
