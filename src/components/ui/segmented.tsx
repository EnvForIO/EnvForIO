/**
 * The one control for picking one of a few views or filters: a grey track
 * with the chosen option raised on it, used on Tasks, Calendar, Stats and
 * Reader. Built on native radio buttons (modern-web-guidance
 * `browser-ui-theming`), so the arrow keys move between options and a
 * screen reader hears a radio group, with the styling read from
 * `:has(:checked)`.
 */
import { useId } from 'react'
import { cn } from '@/lib/utils'

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string // what is being chosen, for screen readers
  className?: string
}) {
  const name = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5',
        className
      )}
    >
      {options.map(option => (
        <label
          key={option.value}
          className="flex h-7 items-center rounded-md px-3 text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground has-[:checked]:bg-background has-[:checked]:font-medium has-[:checked]:text-foreground has-[:checked]:shadow-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
