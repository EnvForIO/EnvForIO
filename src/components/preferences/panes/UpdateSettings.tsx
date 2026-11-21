/**
 * Updates, in Preferences → General → Help: check now, and an opt-in check
 * at start-up. Both only tell the user about a newer release; nothing is
 * downloaded or installed (see `lib/updates.ts`).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { checkForUpdates } from '@/lib/updates'

export function UpdateSettings() {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()
  const [checking, setChecking] = useState(false)

  const checkNow = async () => {
    setChecking(true)
    try {
      await checkForUpdates()
    } finally {
      setChecking(false)
    }
  }

  const atStartup = preferences?.check_for_updates ?? false

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        variant="outline"
        disabled={checking}
        onClick={() => void checkNow()}
      >
        <DownloadIcon />
        {checking ? t('updates.checking') : t('updates.checkNow')}
      </Button>
      <div className="flex items-center space-x-2">
        <Switch
          id="check-for-updates"
          checked={atStartup}
          disabled={!preferences || savePreferences.isPending}
          onCheckedChange={next => {
            if (preferences)
              savePreferences.mutate({
                ...preferences,
                check_for_updates: next,
              })
          }}
        />
        <Label htmlFor="check-for-updates" className="text-sm">
          {t('updates.atStartup')}
        </Label>
      </div>
    </div>
  )
}
