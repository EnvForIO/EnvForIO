/**
 * A followed conference: its next open round with a countdown coloured by
 * urgency, the abstract and paper deadlines in local time, where and when
 * it is held, and "Plan submission" (a project and an abstract task), or
 * "Open project" once planned.
 */
import { useTranslation } from 'react-i18next'
import { ExternalLinkIcon } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import { usePlanConference } from '@/api/conferences'
import { errorText } from '@/api/papers'
import { Button } from '@/components/ui/button'
import type { Conference } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'
import {
  URGENCY_COLOR,
  countdown,
  latestEdition,
  nextRound,
  urgency,
  when,
} from './deadline'
import { FollowStar, RankBadge } from './parts'

export function DeadlineCard({
  conference: c,
  now,
}: {
  conference: Conference
  now: number
}) {
  const { t } = useTranslation()
  const plan = usePlanConference()
  const selectProject = useUIStore(state => state.selectProject)
  const round = nextRound(c, now)
  const edition = round?.edition ?? latestEdition(c)
  const abstractAt = round?.stage.abstractAt ?? null
  const projectId = round?.edition.projectId ?? null

  const planIt = () => {
    if (!round) return
    plan.mutate(
      { key: c.key, editionId: round.edition.id, stage: round.stageIndex },
      {
        onSuccess: project => {
          toast.success(t('conferences.planned', { name: project.name }))
          selectProject(project.id)
        },
        onError: e => toast.error(errorText(e)),
      }
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">
              {c.title} {edition?.year}
            </span>
            <RankBadge ccf={c.ccf} />
          </div>
          <p
            className="truncate text-xs text-muted-foreground"
            title={c.description}
          >
            {c.description}
          </p>
        </div>
        <FollowStar conference={c} />
      </div>

      {round ? (
        <>
          <p className="flex items-baseline gap-1.5">
            <span
              className="text-2xl font-semibold tracking-tight tabular-nums"
              style={{ color: URGENCY_COLOR[urgency(round.at - now)] }}
            >
              {countdown(round.at - now)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('conferences.left')}
            </span>
            {round.stage.comment && (
              <span className="ms-auto truncate text-xs text-muted-foreground">
                {round.stage.comment}
              </span>
            )}
          </p>
          <dl
            className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs tabular-nums"
            title={t('conferences.localTime', { zone: round.edition.timezone })}
          >
            {abstractAt !== null && abstractAt > now && (
              <>
                <dt className="text-muted-foreground">
                  {t('conferences.abstract')}
                </dt>
                <dd>{when(abstractAt, now)}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{t('conferences.paper')}</dt>
            <dd>{when(round.at, now)}</dd>
          </dl>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('conferences.notAnnounced')}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 truncate">
          {[edition?.place, edition?.date].filter(Boolean).join(' · ')}
        </span>
        {edition?.link && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={t('conferences.website')}
            onClick={() => void openUrl(edition.link)}
          >
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        )}
        {round &&
          (projectId !== null ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectProject(projectId)}
            >
              {t('conferences.openProject')}
            </Button>
          ) : (
            <Button size="sm" disabled={plan.isPending} onClick={planIt}>
              {t('conferences.plan')}
            </Button>
          ))}
      </div>
    </div>
  )
}
