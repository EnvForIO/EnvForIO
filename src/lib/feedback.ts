/**
 * Feedback without telemetry: open a prefilled GitHub bug report in the
 * browser, or the folder with the local log file. Nothing is sent from the
 * app; the user decides what to submit.
 */
import { toast } from 'sonner'
import i18n from '@/i18n/config'
import { commands, type AppError, type Result } from '@/lib/tauri-bindings'

function toastIfFailed(result: Result<null, AppError>): void {
  if (result.status === 'ok') return
  const error = result.error
  toast.error(i18n.t('feedback.openFailed'), {
    description: 'message' in error ? error.message : undefined,
  })
}

export async function reportProblem(): Promise<void> {
  toastIfFailed(await commands.reportProblem())
}

export async function openLogFolder(): Promise<void> {
  toastIfFailed(await commands.openLogFolder())
}
