/**
 * "Check for updates" that only tells: if GitHub has a newer release, a
 * toast offers its download page. Nothing is downloaded or installed by the
 * app. `quiet` (the startup check) stays silent unless there is something new.
 */
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import i18n from '@/i18n/config'
import { logger } from '@/lib/logger'
import { commands } from '@/lib/tauri-bindings'

export async function checkForUpdates({ quiet = false } = {}): Promise<void> {
  const result = await commands.checkForUpdates()
  if (result.status === 'error') {
    logger.warn('Update check failed', { error: result.error })
    if (!quiet) {
      const error = result.error
      toast.error(i18n.t('updates.failed'), {
        description: 'message' in error ? error.message : undefined,
      })
    }
    return
  }

  const check = result.data
  if (check.newer && check.latest) {
    toast.info(i18n.t('updates.available', { version: check.latest }), {
      description: i18n.t('updates.availableDescription', {
        current: check.current,
      }),
      duration: 20_000,
      action: {
        label: i18n.t('updates.download'),
        onClick: () => void openUrl(check.url),
      },
    })
    return
  }
  if (quiet) return
  toast.success(
    check.latest
      ? i18n.t('updates.upToDate', { version: check.current })
      : i18n.t('updates.noRelease', { version: check.current })
  )
}
