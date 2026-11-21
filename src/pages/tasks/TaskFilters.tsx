/**
 * The Tasks page's filter row: status chips (all / with deadline / done)
 * and a project picker.
 */
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/api/projects'
import { Segmented } from '@/components/ui/segmented'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ItemStatus } from '@/lib/tauri-bindings'
import type { TaskFilter } from './filter'

const STATUSES: ItemStatus[] = ['All', 'WithDeadline', 'Done']
const ANY = 'any'
const NONE = '0' // tasks outside projects, as `listItems` takes it

export function TaskFilters({
  filter,
  onChange,
}: {
  filter: TaskFilter
  onChange: (filter: TaskFilter) => void
}) {
  const { t } = useTranslation()
  const { data: projects = [] } = useProjects()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented
        value={filter.status}
        options={STATUSES.map(status => ({
          value: status,
          label: t(`tasks.filter.${status}`),
        }))}
        onChange={status => onChange({ ...filter, status })}
        label={t('tasks.filter.status')}
      />
      <Select
        value={filter.project === null ? ANY : String(filter.project)}
        onValueChange={v =>
          onChange({ ...filter, project: v === ANY ? null : Number(v) })
        }
      >
        <SelectTrigger size="sm" className="ml-auto w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('tasks.filter.noProject')}</SelectItem>
          <SelectItem value={ANY}>{t('tasks.filter.anyProject')}</SelectItem>
          {projects
            .filter(p => !p.isArchived)
            .map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ background: p.color }}
                />
                {p.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}
