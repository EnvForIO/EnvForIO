/**
 * The research overview (Seedbank's home, Research's first tab): four
 * numbers on top, ideas by status, then ideas being worked on, deadlines
 * (with ideas' target conferences), open todos and problems.
 * Every row jumps to its idea, project or task. Export JSON saves every
 * idea and paper in one file.
 */
import { useTranslation } from 'react-i18next'
import { FileJsonIcon } from 'lucide-react'
import { toast } from 'sonner'
import { errorText } from '@/api/papers'
import { exportResearchJson, useResearchOverview } from '@/api/research'
import { useToday } from '@/api/tasks'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Section, Summary } from '@/components/ui/ledger'
import { useUIStore } from '@/store/ui-store'
import {
  ActiveIdeas,
  DeadlineList,
  ProblemList,
  StatusBar,
  TodoList,
} from './ResearchSections'

export function ResearchPage() {
  const { t } = useTranslation()
  const today = useToday()
  const { data: o } = useResearchOverview()
  const openPage = useUIStore(state => state.openPage)

  const exportAll = () => {
    if (!today) return
    exportResearchJson(today).then(
      saved => saved && toast.success(t('research.exported')),
      (error: unknown) => toast.error(errorText(error))
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 px-8 pt-4">
      {o && (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-10 pe-3 pb-6">
            <Summary
              items={[
                {
                  value: String(o.unfinished),
                  label: t('research.sum.unfinished', { count: o.unfinished }),
                  onClick: () => openPage('ideas'),
                },
                {
                  value: String(o.openTodos),
                  label: t('research.sum.todos', { count: o.openTodos }),
                  onClick: () => openPage('ideas'),
                },
                {
                  value: String(o.openProblems),
                  label: t('research.sum.problems', {
                    count: o.openProblems,
                  }),
                  onClick: () => openPage('ideas'),
                },
                {
                  value: String(o.toRead),
                  label: t('research.sum.toRead', { count: o.toRead }),
                  onClick: () => openPage('papers'),
                },
              ]}
            />
            <Section
              title={t('research.pipeline')}
              action={
                <Button size="sm" variant="ghost" onClick={exportAll}>
                  <FileJsonIcon className="size-3.5" />
                  {t('research.exportJson')}
                </Button>
              }
            >
              <StatusBar byStatus={o.byStatus} />
            </Section>
            <div className="grid grid-cols-2 gap-x-10 gap-y-8">
              <Section title={t('research.active')}>
                <ActiveIdeas ideas={o.active} />
              </Section>
              <Section title={t('research.deadlines')}>
                <DeadlineList deadlines={o.deadlines} />
              </Section>
              <Section title={t('research.todos')}>
                <TodoList todos={o.todos} today={today} />
              </Section>
              <Section title={t('research.problems')}>
                <ProblemList problems={o.problems} />
              </Section>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
