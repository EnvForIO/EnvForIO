/**
 * What the Tasks list's filter row picks (see `TaskFilters`).
 */
import type { ItemStatus } from '@/lib/tauri-bindings'

export interface TaskFilter {
  status: ItemStatus
  project: number | null // null = any project; 0 = outside projects
}

/** What the list shows when it opens: the task pool, as Tasks always did. */
export const POOL: TaskFilter = { status: 'All', project: 0 }
