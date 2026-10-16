/**
 * Preferences > Planning: hours available for project work on each weekday.
 * Empty = no limit (still a work day); 0 = rest day. The safety line uses this.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetWeekdayCapacity, useWeekCapacity } from '@/api/plans'
import { Input } from '@/components/ui/input'
import { SettingsField, SettingsSection } from '../shared/SettingsComponents'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const asText = (minutes: number | null) =>
  minutes === null ? '' : String(minutes / 60)

function HoursInput({
  weekday,
  minutes,
}: {
  weekday: number
  minutes: number | null
}) {
  const { t } = useTranslation()
  const setCapacity = useSetWeekdayCapacity()
  const [text, setText] = useState(asText(minutes))

  const save = () => {
    const trimmed = text.trim()
    const hours = Number(trimmed)
    if (trimmed === '') setCapacity.mutate({ weekday, minutes: null })
    else if (Number.isFinite(hours) && hours >= 0 && hours <= 24)
      setCapacity.mutate({ weekday, minutes: Math.round(hours * 60) })
    else setText(asText(minutes)) // not a number of hours: undo the edit
  }

  return (
    <Input
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={save}
      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder={t('preferences.planning.noLimit')}
      inputMode="decimal"
      className="w-28"
    />
  )
}

export function PlanningPane() {
  const { t } = useTranslation()
  const { data: week } = useWeekCapacity()
  if (!week) return null

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.planning.availableTime')}>
        <p className="text-sm text-muted-foreground">
          {t('preferences.planning.availableTimeDescription')}
        </p>
        {WEEKDAYS.map((day, i) => (
          <SettingsField key={day} label={t(`preferences.planning.${day}`)}>
            <HoursInput weekday={i} minutes={week[i] ?? null} />
          </SettingsField>
        ))}
      </SettingsSection>
    </div>
  )
}
