/**
 * Year in review: a share card for one year (tasks done, time tracked,
 * active days, completion rate, top project, busiest month, best weekday),
 * saved as a PNG. Built from the same numbers as the Stats page.
 */
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { exportPng } from '@/api/export'
import { useStats } from '@/api/stats'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMinutes } from '@/lib/duration'
import { parseDate } from '@/pages/tasks/dates'

interface Props {
  offset: number // 0 = this year, -1 = last year
  open: boolean
  onOpenChange: (open: boolean) => void
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs opacity-80">{label}</span>
    </div>
  )
}

export function YearReview({ offset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { data: stats } = useStats('Year', offset)
  const card = useRef<HTMLDivElement>(null)
  if (!stats) return null

  const year = stats.from.slice(0, 4)
  const top = stats.projects.find(p => p.projectId !== null && p.minutes > 0)
  const month = [...stats.trend].sort((a, b) => b.minutes - a.minutes)[0]
  const weekday = [...stats.weekdays].sort((a, b) => b.done - a.done)[0]
  const rate =
    stats.planned > 0
      ? `${Math.round((stats.plannedDone / stats.planned) * 100)}%`
      : '–'

  const saveCard = async () => {
    if (!card.current) return
    try {
      if (await exportPng(card.current, `year-${year}`))
        toast(t('export.saved'))
    } catch (error) {
      toast.error(t('export.failed'), { description: String(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('review.title', { year })}</DialogTitle>
        </DialogHeader>
        <div
          ref={card}
          className="flex flex-col gap-5 rounded-xl bg-primary p-6 text-primary-foreground"
        >
          <div>
            <p className="text-sm font-medium opacity-80">EnvForIO</p>
            <p className="text-3xl font-bold">
              {t('review.headline', { year })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Fact label={t('stats.done')} value={String(stats.done)} />
            <Fact
              label={t('stats.time')}
              value={formatMinutes(stats.minutes)}
            />
            <Fact
              label={t('stats.activeDays')}
              value={String(stats.activeDays)}
            />
            <Fact label={t('stats.rate')} value={rate} />
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {top && (
              <p>
                {t('review.topProject', {
                  name: top.name,
                  time: formatMinutes(top.minutes),
                })}
              </p>
            )}
            {month && month.minutes > 0 && (
              <p>
                {t('review.busiestMonth', {
                  month: parseDate(`${month.key}-01`).toLocaleDateString('en', {
                    month: 'long',
                  }),
                })}
              </p>
            )}
            {weekday && weekday.done > 0 && (
              <p>
                {t('review.bestWeekday', {
                  day: t(`review.weekday.${weekday.key}`),
                })}
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => void saveCard()}>{t('review.save')}</Button>
      </DialogContent>
    </Dialog>
  )
}
