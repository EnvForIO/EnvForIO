/**
 * Preferences > Monitor: the panel at the screen edge. Which edge, whether
 * pushing into it opens the panel and how hard, how wide it is, and the
 * shortcut that shows or hides it. Rust applies the change on save.
 */
import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MonitorPanel } from '@/lib/tauri-bindings'
import { usePreferences, useSavePreferences } from '@/services/preferences'
import { ShortcutPicker } from '../ShortcutPicker'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'

/** Matches DEFAULT_PANEL_SHORTCUT in src-tauri/src/types.rs. */
const DEFAULT_SHORTCUT = 'Alt+Shift+G'
const WIDTHS = [300, 340, 400, 460]

function Choice<T extends string>({
  value,
  options,
  label,
  disabled,
  onChange,
}: {
  value: T
  options: readonly T[]
  label: (option: T) => string
  disabled: boolean
  onChange: (value: T) => void
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={v => onChange(v as T)}
    >
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option} value={option}>
            {label(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MonitorPane() {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()
  const panel = preferences?.monitor_panel
  if (!preferences || !panel) return null

  const busy = savePreferences.isPending
  const save = (change: Partial<MonitorPanel>) =>
    savePreferences.mutate({
      ...preferences,
      monitor_panel: { ...panel, ...change },
    })

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.monitor.panel')}>
        <SettingsField
          label={t('preferences.monitor.openOnPush')}
          description={t('preferences.monitor.openOnPushDescription')}
        >
          <Switch
            checked={panel.openOnPush}
            disabled={busy}
            onCheckedChange={openOnPush => save({ openOnPush })}
          />
        </SettingsField>
        <SettingsField label={t('preferences.monitor.edge')}>
          <Choice
            value={panel.edge}
            options={['left', 'right'] as const}
            label={o => t(`preferences.monitor.edge.${o}`)}
            disabled={busy}
            onChange={edge => save({ edge })}
          />
        </SettingsField>
        <SettingsField
          label={t('preferences.monitor.push')}
          description={t('preferences.monitor.pushDescription')}
        >
          <Choice
            value={panel.push}
            options={['light', 'medium', 'firm'] as const}
            label={o => t(`preferences.monitor.push.${o}`)}
            disabled={busy || !panel.openOnPush}
            onChange={push => save({ push })}
          />
        </SettingsField>
        <SettingsField label={t('preferences.monitor.width')}>
          <Choice
            value={String(panel.width)}
            options={WIDTHS.map(String)}
            label={o => `${o} px`}
            disabled={busy}
            onChange={width => save({ width: Number(width) })}
          />
        </SettingsField>
        <SettingsField
          label={t('preferences.monitor.shortcut')}
          description={t('preferences.monitor.shortcutDescription')}
        >
          <ShortcutPicker
            value={panel.shortcut}
            defaultValue={DEFAULT_SHORTCUT}
            onChange={shortcut => save({ shortcut })}
            disabled={busy}
          />
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
