/**
 * Re-export generated Tauri bindings with project conventions
 *
 * This file provides type-safe access to all Tauri commands.
 * Types are auto-generated from Rust by tauri-specta.
 *
 * @example
 * ```typescript
 * import { commands, unwrapResult } from '@/lib/tauri-bindings'
 *
 * // In TanStack Query - let errors propagate
 * const prefs = unwrapResult(await commands.loadPreferences())
 *
 * // In event handlers - explicit error handling
 * const result = await commands.savePreferences(prefs)
 * if (result.status === 'error') {
 *   toast.error(result.error)
 * }
 * ```
 *
 * @see docs/developer/tauri-commands.md for full documentation
 */

export { commands, type Result } from './bindings'
export type {
  AppError,
  AppPreferences,
  DayNote,
  DayOverride,
  DuoStyle,
  ExportScope,
  Idea,
  IdeaCounts,
  IdeaFilter,
  IdeaLink,
  IdeaStatus,
  IdeaStep,
  IdeaUpdate,
  IdeaLog,
  IdeaProblem,
  IdeaTodo,
  MonitorTarget,
  GpuSample,
  MachineInfo,
  Sample,
  Deadline,
  DeadlineKind,
  OpenProblem,
  OpenTodo,
  ResearchOverview,
  IdeaPaper,
  Paper,
  PaperCounts,
  PaperFilter,
  PaperIdea,
  PaperRelation,
  PaperUpdate,
  ReadingStatus,
  Tag,
  Health,
  Period,
  PlanningSettings,
  Stats,
  ItemStatus,
  TodayLine,
  WeekCapacity,
  Module,
  Project,
  ProjectInput,
  ProjectTemplate,
  JsonValue,
  RecoveryError,
  Task,
  TaskStep,
  TaskUpdate,
  TaskView,
} from './bindings'

/**
 * Helper to unwrap a Result type, throwing on error
 */
export function unwrapResult<T, E>(
  result: { status: 'ok'; data: T } | { status: 'error'; error: E }
): T {
  if (result.status === 'ok') {
    return result.data
  }
  throw result.error
}
