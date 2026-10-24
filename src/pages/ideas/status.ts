/**
 * How each idea status and priority looks. Labels come from the locale
 * (`ideas.status.<Status>`, `ideas.priority.<n>`).
 */
import type { IdeaFilter, IdeaStatus } from '@/lib/tauri-bindings'

export const STATUSES: IdeaStatus[] = [
  'Spark',
  'Researching',
  'InProgress',
  'Writing',
  'Submitted',
  'Done',
  'OnHold',
  'Dropped',
]

export const STATUS_COLOR: Record<IdeaStatus, string> = {
  Spark: '#eab308',
  Researching: '#06b6d4',
  InProgress: '#3b82f6',
  Writing: '#a855f7',
  Submitted: '#f97316',
  Done: '#22c55e',
  OnHold: '#94a3b8',
  Dropped: '#64748b',
}

export const PRIORITY_COLOR = ['', '#94a3b8', '#f59e0b', '#ef4444'] as const

/** The filter that shows every idea. */
export const NO_FILTER: IdeaFilter = {
  status: null,
  pinned: false,
  unfinished: false,
  tagId: null,
}
