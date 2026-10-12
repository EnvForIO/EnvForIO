/**
 * "Launch at login" switch. The OS keeps the setting (the Run registry key on
 * Windows), so it is read from and written to the autostart plugin directly,
 * not stored in EnvIO's preferences file.
 */
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { logger } from '@/lib/logger'

const KEY = ['autostart'] as const

export function LaunchAtLogin() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: on = false, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: isEnabled,
  })
  const toggle = useMutation({
    mutationFn: (next: boolean) => (next ? enable() : disable()),
    onError: error => {
      logger.error('Failed to change launch at login', { error })
      toast.error(t('preferences.general.launchAtLoginFailed'))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="launch-at-login"
        checked={on}
        disabled={isLoading || toggle.isPending}
        onCheckedChange={next => toggle.mutate(next)}
      />
      <Label htmlFor="launch-at-login" className="text-sm">
        {on ? t('common.enabled') : t('common.disabled')}
      </Label>
    </div>
  )
}
