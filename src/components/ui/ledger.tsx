/**
 * Overview page parts. The headline numbers are one sentence ("5 tasks
 * done, 2h tracked and active 3 of 7 days"), not a row of big figures over
 * small labels; sections open with their title and space, not a rule.
 */
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

export interface Figure {
  value: string // the number, set in the text's own size, in bold
  label: string // the words after it ("tasks done")
  onClick?: () => void // the figure opens what it counts
}

/** The figures as one sentence: "a, b, c and d." */
export function Summary({ items }: { items: Figure[] }) {
  return (
    <p className="text-[15px] leading-relaxed text-muted-foreground">
      {items.map((item, i) => {
        const glue = i === 0 ? '' : i === items.length - 1 ? ' and ' : ', '
        const body = (
          <>
            <strong className="font-semibold text-foreground tabular-nums">
              {item.value}
            </strong>{' '}
            {item.label}
          </>
        )
        return (
          <Fragment key={item.label}>
            {glue}
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className="rounded-sm underline-offset-4 hover:text-foreground hover:underline"
              >
                {body}
              </button>
            ) : (
              <span>{body}</span>
            )}
          </Fragment>
        )
      })}
      .
    </p>
  )
}

/** A titled part of a page: its title, then its content. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode // e.g. a small button at the right of the title
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3', className)}>
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <div className="ms-auto">{action}</div>}
      </div>
      {children}
    </section>
  )
}
