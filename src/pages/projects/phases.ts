/**
 * A new project's phases before it exists: the template's, dated back from
 * the deadline. The same rule as Rust's `projects::mutation::default_phases`
 * (that one runs when a caller sends no phases); here the dialog shows
 * them so the user can change them first.
 */
import type {
  PhaseInput,
  ProjectInput,
  ProjectTemplate,
} from '@/lib/tauri-bindings'
import { formatDate, parseDate } from '@/pages/tasks/dates'

/** 'YYYY-MM-DD' minus some days. */
function daysBefore(date: string, days: number): string {
  const d = parseDate(date)
  return formatDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - days))
}

/** A phase that would end before the start, or without a deadline, gets no date. */
export function defaultPhases(
  template: ProjectTemplate | undefined,
  input: Pick<ProjectInput, 'deadline' | 'startDate'>
): PhaseInput[] {
  return (template?.phases ?? []).map(phase => {
    const end =
      input.deadline !== null && phase.daysBefore !== null
        ? daysBefore(input.deadline, phase.daysBefore)
        : null
    return {
      name: phase.name,
      endDate: end !== null && end >= (input.startDate ?? '') ? end : null,
      budget: null,
    }
  })
}

/** The day a moment (Unix ms) falls on here, 'YYYY-MM-DD', as Rust counts it. */
export const localDay = (ms: number): string => formatDate(new Date(ms))
