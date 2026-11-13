/**
 * The new-project dialog's phases: a name, when it ends and an optional
 * budget ("40h") per row, prefilled from the template and the deadline.
 */
import { useTranslation } from 'react-i18next'
import { PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import type { PhaseInput } from '@/lib/tauri-bindings'
import { formatDate, parseDate } from '@/pages/tasks/dates'

export function PhaseEditor({
  phases,
  onChange,
}: {
  phases: PhaseInput[]
  onChange: (phases: PhaseInput[]) => void
}) {
  const { t } = useTranslation()
  const set = (i: number, change: Partial<PhaseInput>) =>
    onChange(phases.map((p, j) => (j === i ? { ...p, ...change } : p)))

  return (
    <div className="grid gap-1.5">
      {phases.map((phase, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={phase.name}
            onChange={e => set(i, { name: e.target.value })}
            placeholder={t('projects.phaseName')}
            aria-label={t('projects.phaseName')}
            className="h-8 min-w-0 flex-1"
          />
          <DatePicker
            value={phase.endDate ? parseDate(phase.endDate) : undefined}
            onChange={d => set(i, { endDate: d ? formatDate(d) : null })}
            placeholder={t('projects.phaseNoEnd')}
            className="h-8 w-36"
          />
          <Input
            value={phase.budget ?? ''}
            onChange={e => set(i, { budget: e.target.value || null })}
            placeholder={t('projects.phaseBudgetPlaceholder')}
            aria-label={t('projects.phaseBudget')}
            title={t('projects.phaseBudgetHint')}
            className="h-8 w-28"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label={t('projects.removePhase')}
            onClick={() => onChange(phases.filter((_, j) => j !== i))}
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="justify-self-start"
        onClick={() =>
          onChange([...phases, { name: '', endDate: null, budget: null }])
        }
      >
        <PlusIcon className="size-3.5" />
        {t('projects.addPhase')}
      </Button>
    </div>
  )
}
