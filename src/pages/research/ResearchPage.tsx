/**
 * The research overview (Seedbank's home): four numbers on top, ideas by
 * status, then ideas being worked on, deadlines, open todos and problems.
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
import { Section } from '@/pages/stats/StatsSections'
import { useUIStore } from '@/store/ui-store'
import {
  ActiveIdeas,
  DeadlineList,
  ProblemList,
  StatusBar,
  TodoList,
} from './ResearchSections'

function Tile({
  label,
  value,
  onClick,
}: {
  label: string
  value: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col rounded-md border p-3 text-start hover:bg-accent/60"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </button>
  )
}

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
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex items-center gap-2">
        <h1 className="flex-1 text-xl font-semibold">
          {t('research.pageTitle')}
        </h1>
        <Button size="sm" variant="outline" onClick={exportAll}>
          <FileJsonIcon className="size-3.5" />
          {t('research.exportJson')}
        </Button>
      </header>
      {o && (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 pr-3 pb-4">
            <div className="grid grid-cols-4 gap-3">
              <Tile
                label={t('research.unfinished')}
                value={o.unfinished}
                onClick={() => openPage('ideas')}
              />
              <Tile
                label={t('research.openTodos')}
                value={o.openTodos}
                onClick={() => openPage('ideas')}
              />
              <Tile
                label={t('research.openProblems')}
                value={o.openProblems}
                onClick={() => openPage('ideas')}
              />
              <Tile
                label={t('research.toRead')}
                value={o.toRead}
                onClick={() => openPage('papers')}
              />
            </div>
            <Section title={t('research.pipeline')}>
              <StatusBar byStatus={o.byStatus} />
            </Section>
            <div className="grid grid-cols-2 gap-3">
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
