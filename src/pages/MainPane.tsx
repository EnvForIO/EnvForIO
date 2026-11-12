/**
 * The middle pane: a full page (calendar, stats, research…), a project page, or the selected built-in list.
 */
import { useUIStore } from '@/store/ui-store'
import { ProjectPage } from './projects/ProjectPage'
import { TaskListPage } from './tasks/TaskListPage'
import { CalendarPage } from './calendar/CalendarPage'
import { StatsPage } from './stats/StatsPage'
import { IdeasPage } from './ideas/IdeasPage'
import { PapersPage } from './papers/PapersPage'
import { MonitorPage } from './monitor/MonitorPage'
import { ResearchLayout } from './research/ResearchLayout'
import { ResearchPage } from './research/ResearchPage'
import { isResearchTab } from './research/tabs'
import { ReaderPage } from './reader/ReaderPage'

export function MainPane() {
  const projectId = useUIStore(state => state.selectedProjectId)
  const page = useUIStore(state => state.page)
  if (isResearchTab(page)) {
    return (
      <ResearchLayout tab={page}>
        {page === 'research' && <ResearchPage />}
        {page === 'ideas' && <IdeasPage />}
        {page === 'papers' && <PapersPage />}
      </ResearchLayout>
    )
  }
  if (page === 'calendar') return <CalendarPage />
  if (page === 'stats') return <StatsPage />
  if (page === 'monitor') return <MonitorPage />
  if (page === 'reader') return <ReaderPage />
  return projectId === null ? (
    <TaskListPage />
  ) : (
    <ProjectPage projectId={projectId} />
  )
}
