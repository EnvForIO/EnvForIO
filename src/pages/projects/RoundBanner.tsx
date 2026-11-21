/**
 * On a conference project's page: the round it is for, a countdown to the
 * paper deadline, the abstract and paper deadlines in local time (the
 * conference's own zone on hover), the website, and a notice when ccfddl
 * now gives a different deadline. It offers the new date and never changes
 * the project by itself.
 */
import { useTranslation } from 'react-i18next'
import { ExternalLinkIcon } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useProjectRound, useUpdateProject } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { useNow } from '@/hooks/useNow'
import type { Project } from '@/lib/tauri-bindings'
import {
  URGENCY_COLOR,
  countdown,
  urgency,
  when,
} from '@/pages/conferences/deadline'
import { dateLabel } from '@/pages/tasks/dates'
import { localDay } from './phases'

export function RoundBanner({ project }: { project: Project }) {
  const { t } = useTranslation()
  const now = useNow()
  const { data: round } = useProjectRound(project.id)
  const updateProject = useUpdateProject()
  const stage = round?.edition.stages[round.stage]
  if (!round || !stage) return null

  const paperAt = stage.deadlineAt
  const moved =
    paperAt !== null && localDay(paperAt) !== project.deadline
      ? localDay(paperAt)
      : null
  const takeNewDeadline = () =>
    moved &&
    updateProject.mutate({
      id: project.id,
      input: {
        name: project.name,
        color: project.color,
        startDate: project.startDate,
        deadline: moved,
        bufferDays: project.bufferDays,
        isArchived: project.isArchived,
      },
    })

  return (
    <div className="flex flex-col gap-1.5 rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-3">
        <span className="font-medium">
          {round.title} {round.edition.year}
          {stage.comment && (
            <span className="font-normal text-muted-foreground">
              {' '}
              {stage.comment}
            </span>
          )}
        </span>
        {paperAt !== null && paperAt > now && (
          <span
            className="font-semibold tabular-nums"
            style={{ color: URGENCY_COLOR[urgency(paperAt - now)] }}
          >
            {countdown(paperAt - now)} {t('conferences.left')}
          </span>
        )}
        <dl
          className="ms-auto flex gap-x-3 text-xs tabular-nums text-muted-foreground"
          title={t('conferences.localTime', { zone: round.edition.timezone })}
        >
          {stage.abstractAt !== null && (
            <div className="flex gap-1">
              <dt>{t('conferences.abstract')}</dt>
              <dd className="text-foreground">{when(stage.abstractAt, now)}</dd>
            </div>
          )}
          {paperAt !== null && (
            <div className="flex gap-1">
              <dt>{t('conferences.paper')}</dt>
              <dd className="text-foreground">{when(paperAt, now)}</dd>
            </div>
          )}
        </dl>
        {round.edition.link && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={t('conferences.website')}
            aria-label={t('conferences.website')}
            onClick={() => void openUrl(round.edition.link)}
          >
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        )}
      </div>
      {moved && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {t('projects.roundMoved', { date: dateLabel(moved) })}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs"
            disabled={updateProject.isPending}
            onClick={takeNewDeadline}
          >
            {t('projects.roundUseIt')}
          </Button>
        </div>
      )}
    </div>
  )
}
