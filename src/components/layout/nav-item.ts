/**
 * How a sidebar entry looks (Ledger style, 2026-11-21): quiet grey text,
 * a faint wash on hover, and the selected entry in ink on its soft tint.
 * Shared by the lists, the pages and the projects so all three match.
 */
import { cn } from '@/lib/utils'

export const navItemClass = (selected: boolean) =>
  cn(
    'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors hover:bg-foreground/5 hover:text-foreground data-[state=open]:bg-foreground/5',
    selected &&
      'bg-ink-soft font-medium text-ink-text hover:bg-ink-soft hover:text-ink-text'
  )

/** The count at the end of an entry: dim, and ink when the entry is selected. */
export const navCountClass = (selected: boolean) =>
  cn(
    'ms-auto text-xs tabular-nums',
    selected ? 'text-ink-text/80' : 'text-muted-foreground'
  )
