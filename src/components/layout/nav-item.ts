/**
 * How a sidebar entry looks: plain text, a faint wash on hover, and the
 * current entry on a neutral grey with a short blue pill at its start, the
 * way Windows 11 marks the current item. Shared by the lists, the pages, the projects
 * and Reader's feeds so they match.
 */
import { cn } from '@/lib/utils'

export const navItemClass = (selected: boolean) =>
  cn(
    'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors hover:bg-foreground/[0.05] data-[state=open]:bg-foreground/[0.05]',
    selected &&
      "bg-selected font-medium text-selected-text before:absolute before:start-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-[''] hover:bg-selected"
  )

/** The count at the end of an entry, always quiet. */
export const navCountClass = () =>
  'ms-auto text-xs tabular-nums text-muted-foreground'
