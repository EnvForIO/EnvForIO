/**
 * Preferences > Appearance > Todo Duo widgets: material, font and text size.
 * Saved with the other preferences; both widget windows apply it at once.
 */
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DuoStyle } from '@/lib/tauri-bindings'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'

const OPTIONS: { [K in keyof DuoStyle]: DuoStyle[K][] } = {
  material: ['translucent', 'acrylic', 'mica', 'solid'],
  font: ['system', 'serif', 'mono'],
  text_size: ['small', 'medium', 'large'],
}

export function DuoStyleSettings() {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()
  const style = preferences?.duo_style
  if (!preferences || !style) return null

  const field = <K extends keyof DuoStyle>(key: K) => (
    <SettingsField key={key} label={t(`preferences.duo.${key}`)}>
      <Select
        value={style[key]}
        disabled={savePreferences.isPending}
        onValueChange={value =>
          savePreferences.mutate({
            ...preferences,
            duo_style: { ...style, [key]: value as DuoStyle[K] },
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS[key].map(option => (
            <SelectItem key={option} value={option}>
              {t(`preferences.duo.${key}.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  )

  return (
    <SettingsSection title={t('preferences.duo.title')}>
      {field('material')}
      {field('font')}
      {field('text_size')}
    </SettingsSection>
  )
}
