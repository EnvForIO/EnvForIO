/**
 * The Monitor page's small parts, in its Apple-clean look (colours from
 * the `.monitor` variables in App.css): a white tile, a rounded meter and
 * a status pill.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { statusColor, type Status } from './machine'

export function Tile({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-[14px] border border-[var(--m-line)] bg-[var(--m-tile)] px-3.5 py-3',
        className
      )}
    >
      {children}
    </div>
  )
}

/** A thin rounded bar, 0..100, in the given colour. */
export function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--m-track)]">
      <div
        className="h-full rounded-full transition-[width,background-color] duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
        }}
      />
    </div>
  )
}

/** A dot and a word; `text` replaces the word (the overview's summary). */
export function StatusPill({
  status,
  text,
}: {
  status: Status
  text?: string
}) {
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--m-line)] bg-[var(--m-tile)] px-3 py-1 text-xs">
      <span
        className="size-2 rounded-full transition-colors duration-500"
        style={{ background: statusColor(status) }}
      />
      {text ?? t(`monitor.status.${status}`)}
    </span>
  )
}
