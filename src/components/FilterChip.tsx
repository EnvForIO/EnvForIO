/**
 * A rounded filter chip with an optional colour dot and an optional count.
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
      {props.count !== undefined && (
        <span className="opacity-60">{props.count}</span>
      )}
    </button>
  )
}
