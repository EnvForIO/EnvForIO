/**
 * Where an idea meets the planner: the project it is
 * worked on in (its todos are that project's tasks, so they count toward
 * the safety line), and, when its venue is a conference on ccfddl's list,
 * that venue's next deadline with "Plan submission", which opens the
 * new-project dialog for that round, linked to this idea.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClockIcon, FolderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useConferences } from '@/api/conferences'
import { useSetIdeaProject } from '@/api/ideas'
import { errorText } from '@/api/papers'
import { useProjects } from '@/api/projects'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Idea } from '@/lib/tauri-bindings'
import {
  URGENCY_COLOR,
  countdown,
  findVenue,
  nextRound,
  urgency,
  when,
} from '@/pages/conferences/deadline'
import { useNow } from '@/hooks/useNow'
import { ProjectDialog } from '@/pages/projects/ProjectDialog'
import { useUIStore } from '@/store/ui-store'

const NONE = 'none'

export function IdeaPlan({ idea }: { idea: Idea }) {
  const { t } = useTranslation()
  const { data: projects = [] } = useProjects()
  const { data: conferences } = useConferences()
  const setProject = useSetIdeaProject()
  const [planning, setPlanning] = useState(false)
  const selectProject = useUIStore(state => state.selectProject)

  const project = projects.find(p => p.id === idea.projectId) ?? null
  const choices = projects.filter(p => !p.isArchived || p.id === idea.projectId)
  const venue = findVenue(conferences?.conferences ?? [], idea.venue)
  const now = useNow()
  const round = venue ? nextRound(venue, now) : null

  const link = (value: string) =>
    setProject.mutate(
      { id: idea.id, projectId: value === NONE ? null : Number(value) },
      { onError: e => toast.error(errorText(e)) }
    )

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2.5 text-sm">
      <div className="flex items-center gap-2">
        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
        <Select
          value={project ? String(project.id) : NONE}
          onValueChange={link}
        >
          <SelectTrigger size="sm" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t('ideas.noProject')}</SelectItem>
            {choices.map(p => (
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
        {project ? (
          <>
            <span className="truncate text-xs text-muted-foreground">
              {t('ideas.projectProgress', {
                done: project.doneCount,
                total: project.taskCount,
              })}
              {project.deadline &&
                `, ${t('ideas.projectDue', { date: project.deadline })}`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ms-auto"
              onClick={() => selectProject(project.id)}
            >
              {t('conferences.openProject')}
            </Button>
          </>
        ) : (
          <span className="truncate text-xs text-muted-foreground">
            {t('ideas.projectHint')}
          </span>
        )}
      </div>

      {venue && round && (
        <div className="flex items-center gap-2">
          <CalendarClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">
            <span className="font-medium">
              {venue.title} {round.edition.year}
            </span>
            <span className="text-muted-foreground">
              {', '}
              {t('conferences.paper')} {when(round.at, now)}
            </span>
          </span>
          <span
            className="shrink-0 text-xs font-medium tabular-nums"
            style={{ color: URGENCY_COLOR[urgency(round.at - now)] }}
          >
            {countdown(round.at - now)}
          </span>
          {round.edition.projectId === null ||
          round.edition.projectId !== idea.projectId ? (
            <Button
              size="sm"
              className="ms-auto"
              onClick={() => setPlanning(true)}
            >
              {t('conferences.plan')}
            </Button>
          ) : null}
        </div>
      )}
      {planning && venue && round && (
        <ProjectDialog
          open
          onOpenChange={open => !open && setPlanning(false)}
          fromIdea={{ picked: { conference: venue, round }, ideaId: idea.id }}
        />
      )}
    </div>
  )
}
