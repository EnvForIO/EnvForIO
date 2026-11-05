/**
 * Create or edit a project: name, colour, template (create only), start
 * date, deadline, and how many days early to plan to finish.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateProject,
  useProjectTemplates,
  useUpdateProject,
} from '@/api/projects'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type {
  Project,
  ProjectInput,
  ProjectTemplate,
} from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { formatDate, parseDate } from '@/pages/tasks/dates'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
]

const blank: ProjectInput = {
  name: '',
  color: COLORS[0] ?? '#3b82f6',
  startDate: null,
  deadline: null,
  bufferDays: 0,
  isArchived: false,
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project // edit this one; omit to create
}

export function ProjectDialog({ open, onOpenChange, project }: Props) {
  const { t } = useTranslation()
  const { data: templates = [] } = useProjectTemplates()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const selectProject = useUIStore(state => state.selectProject)
  const [form, setForm] = useState<ProjectInput>(project ?? blank)
  const [template, setTemplate] = useState('blank')
  const set = (change: Partial<ProjectInput>) => setForm({ ...form, ...change })
  const date = (value: string | null) => (value ? parseDate(value) : undefined)

  const submit = () => {
    const done = () => onOpenChange(false)
    if (project) {
      updateProject.mutate({ id: project.id, input: form }, { onSuccess: done })
    } else {
      createProject.mutate(
        { input: form, template },
        {
          onSuccess: created => (
            selectProject(created.id),
            setForm(blank),
            done()
          ),
        }
      )
    }
  }
  const error = (project ? updateProject : createProject).error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {project ? t('projects.edit') : t('projects.new')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>{t('projects.name')}</Label>
            <Input
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => set({ color })}
                style={{ background: color }}
                className={cn(
                  'size-6 rounded-full',
                  form.color === color && 'ring-2 ring-foreground ring-offset-2'
                )}
              />
            ))}
          </div>
          {!project && (
            <div className="flex flex-wrap gap-2">
              {templates.map(tpl => (
                <Button
                  key={tpl.id}
                  type="button"
                  size="sm"
                  variant={tpl.id === template ? 'default' : 'outline'}
                  onClick={() => setTemplate(tpl.id)}
                >
                  {t(`projects.template.${tpl.id}`)}
                </Button>
              ))}
            </div>
          )}
          {!project && <MilestonesHint id={template} templates={templates} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>{t('projects.startDate')}</Label>
              <DatePicker
                value={date(form.startDate)}
                onChange={d => set({ startDate: d ? formatDate(d) : null })}
                placeholder={t('projects.fromToday')}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{t('projects.deadline')}</Label>
              <DatePicker
                value={date(form.deadline)}
                onChange={d => set({ deadline: d ? formatDate(d) : null })}
                placeholder={t('projects.noDeadline')}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>{t('projects.bufferDays')}</Label>
            <Input
              type="number"
              min={0}
              value={form.bufferDays}
              onChange={e =>
                set({ bufferDays: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('projects.bufferDaysHint')}
            </p>
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {t('projects.saveFailed')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={form.name.trim() === ''}>
            {project ? t('projects.save') : t('projects.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What a deadline template adds: "−21 d Experiments done, …". */
function MilestonesHint({
  id,
  templates,
}: {
  id: string
  templates: ProjectTemplate[]
}) {
  const { t } = useTranslation()
  const milestones = templates.find(tpl => tpl.id === id)?.milestones ?? []
  if (milestones.length === 0) return null
  const list = milestones.map(m => `−${m.daysBefore} d ${m.title}`).join(', ')
  return (
    <p className="text-xs text-muted-foreground">
      {t('projects.milestonesHint', { count: milestones.length, list })}
    </p>
  )
}
