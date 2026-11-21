/**
 * Create or edit a project: name, colour, start date, deadline, and how many
 * days early to plan to finish. Creating also picks a template and edits
 * its phases (each with an end date and an optional budget); a conference
 * paper picks its round from ccfddl, which sets the name and the deadline.
 * Phases of an existing project are edited on its page.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateProject,
  useProjectTemplates,
  useUpdateProject,
} from '@/api/projects'
import { errorText } from '@/api/papers'
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
import type { PhaseInput, Project, ProjectInput } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { formatDate, parseDate } from '@/pages/tasks/dates'
import { ConferencePicker, type Picked } from './ConferencePicker'
import { PhaseEditor } from './PhaseEditor'
import { defaultPhases, localDay } from './phases'

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

/** A paper planned from an idea: its round and the idea to link. */
export interface FromIdea {
  picked: Picked | null
  ideaId: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project // edit this one; omit to create
  fromIdea?: FromIdea
}

/** What picking a round sets: the name and the paper deadline's day here. */
function fromRound({ conference, round }: Picked): Partial<ProjectInput> {
  const comment = round.stage.comment ? ` (${round.stage.comment})` : ''
  return {
    name: `${conference.title} ${round.edition.year}${comment}`,
    deadline: localDay(round.at),
  }
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  fromIdea,
}: Props) {
  const { t } = useTranslation()
  const { data: templates = [] } = useProjectTemplates()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const selectProject = useUIStore(state => state.selectProject)
  const [picked, setPicked] = useState<Picked | null>(fromIdea?.picked ?? null)
  const [form, setForm] = useState<ProjectInput>(() =>
    project
      ? project
      : fromIdea?.picked
        ? { ...blank, ...fromRound(fromIdea.picked) }
        : blank
  )
  const [template, setTemplate] = useState(fromIdea ? 'conference' : 'blank')
  // The template's phases follow the dates until the user edits them.
  const [edited, setEdited] = useState<PhaseInput[] | null>(null)
  const tpl = templates.find(x => x.id === template)
  const phases = edited ?? defaultPhases(tpl, form)
  const set = (change: Partial<ProjectInput>) => setForm({ ...form, ...change })
  const date = (value: string | null) => (value ? parseDate(value) : undefined)

  const pick = (next: Picked | null) => {
    setPicked(next)
    if (next) setForm({ ...form, ...fromRound(next) })
  }

  const submit = () => {
    const done = () => onOpenChange(false)
    if (project) {
      updateProject.mutate({ id: project.id, input: form }, { onSuccess: done })
      return
    }
    const round =
      template === 'conference' && picked
        ? {
            key: picked.conference.key,
            editionId: picked.round.edition.id,
            stage: picked.round.stageIndex,
          }
        : undefined
    createProject.mutate(
      { input: form, template, phases, round, ideaId: fromIdea?.ideaId },
      {
        onSuccess: created => {
          selectProject(created.id)
          setForm(blank)
          setPicked(null)
          setEdited(null)
          done()
        },
      }
    )
  }
  const error = (project ? updateProject : createProject).error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {project ? t('projects.edit') : t('projects.new')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
          {!project && (
            <div className="flex flex-wrap gap-2">
              {templates.map(x => (
                <Button
                  key={x.id}
                  type="button"
                  size="sm"
                  variant={x.id === template ? 'default' : 'outline'}
                  onClick={() => (setTemplate(x.id), setEdited(null))}
                >
                  {t(`projects.template.${x.id}`)}
                </Button>
              ))}
            </div>
          )}
          {!project && template === 'conference' && (
            <div className="grid gap-1.5">
              <Label>{t('projects.conference')}</Label>
              <ConferencePicker picked={picked} onPick={pick} />
            </div>
          )}
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
              {/* A conference round sets the deadline; ccfddl decides it. */}
              {picked && !project ? (
                <p className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
                  {form.deadline}
                </p>
              ) : (
                <DatePicker
                  value={date(form.deadline)}
                  onChange={d => set({ deadline: d ? formatDate(d) : null })}
                  placeholder={t('projects.noDeadline')}
                />
              )}
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
          {!project && (
            <div className="grid gap-1.5">
              <Label>{t('projects.phases')}</Label>
              <PhaseEditor phases={phases} onChange={setEdited} />
              <p className="text-xs text-muted-foreground">
                {t('projects.phasesHint')}
              </p>
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive">
              {t('projects.saveFailed')} {errorText(error)}
            </p>
          )}
        </div>
        <DialogFooter className="items-center">
          {/* A disabled button says why. */}
          {form.name.trim() === '' && (
            <p className="me-auto text-xs text-muted-foreground">
              {template === 'conference' && !picked && !project
                ? t('projects.needConferenceOrName')
                : t('projects.needName')}
            </p>
          )}
          <Button onClick={submit} disabled={form.name.trim() === ''}>
            {project ? t('projects.save') : t('projects.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
