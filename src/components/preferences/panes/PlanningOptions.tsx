/**
 * Preferences > Planning > Safety line: when a new day starts, and the two
 * levelling switches (see the safety line rules in docs/developer/envforio-design.md).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlanningSettings, useSavePlanningSettings } from '@/api/plans'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { PlanningSettings } from '@/lib/tauri-bindings'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'

export function PlanningOptions() {
  const { data: settings } = usePlanningSettings()
  if (!settings) return null
  return <Options key={JSON.stringify(settings)} settings={settings} />
}

function Options({ settings }: { settings: PlanningSettings }) {
  const { t } = useTranslation()
  const save = useSavePlanningSettings()
  const [dayStart, setDayStart] = useState(settings.dayStart)
  const update = (change: Partial<PlanningSettings>) =>
    save.mutate({ ...settings, ...change })

  return (
    <SettingsSection title={t('preferences.planning.safetyLine')}>
      <SettingsField
        label={t('preferences.planning.dayStart')}
        description={t('preferences.planning.dayStartDescription')}
      >
        <Input
          type="time"
          value={dayStart}
          onChange={e => setDayStart(e.target.value)}
          onBlur={() => dayStart !== settings.dayStart && update({ dayStart })}
          className="w-32"
        />
      </SettingsField>
      <SettingsField
        label={t('preferences.planning.level')}
        description={t('preferences.planning.levelDescription')}
      >
        <Switch
          checked={settings.level}
          onCheckedChange={level => update({ level })}
        />
      </SettingsField>
      <SettingsField
        label={t('preferences.planning.earliestFirst')}
        description={t('preferences.planning.earliestFirstDescription')}
      >
        <Switch
          checked={settings.earliestFirst}
          onCheckedChange={earliestFirst => update({ earliestFirst })}
        />
      </SettingsField>
    </SettingsSection>
  )
}
