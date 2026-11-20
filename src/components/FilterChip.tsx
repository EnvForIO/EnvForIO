/**
 * A rounded filter chip with an optional colour dot and an optional count,
 * for filters that are tags (Ideas, Library); a choice of views uses
 * `ui/segmented` instead. Selected chips are ink on a soft tint.
 */
import { cn } from '@/lib/utils'

export function FilterChip(props: {
  active: boolean
  onClick: () => void
  color?: string
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={cn(
        'flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors',
        props.active
          ? 'border-transparent bg-selected font-medium text-selected-text'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
      )}
    >
      {props.color && (
        <span
          className="size-2 rounded-full"
          style={{ background: props.color }}
        />
      )}
      {props.label}
      {props.count !== undefined && (
        <span className="opacity-60">{props.count}</span>
      )}
    </button>
  )
}
