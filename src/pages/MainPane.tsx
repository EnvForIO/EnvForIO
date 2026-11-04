/**
 * The middle pane: the calendar, the item list, a project page, or the selected built-in list.
 */
import { useUIStore } from '@/store/ui-store'
import { ProjectPage } from './projects/ProjectPage'
import { TaskListPage } from './tasks/TaskListPage'
import { CalendarPage } from './calendar/CalendarPage'
import { ItemsPage } from './items/ItemsPage'
import { StatsPage } from './stats/StatsPage'
import { IdeasPage } from './ideas/IdeasPage'
import { PapersPage } from './papers/PapersPage'
import { MonitorPage } from './monitor/MonitorPage'
import { ResearchPage } from './research/ResearchPage'
import { ConferencesPage } from './conferences/ConferencesPage'
import { ReaderPage } from './reader/ReaderPage'

export function MainPane() {
  const projectId = useUIStore(state => state.selectedProjectId)
  const page = useUIStore(state => state.page)
  if (page === 'calendar') return <CalendarPage />
  if (page === 'items') return <ItemsPage />
  if (page === 'stats') return <StatsPage />
  if (page === 'research') return <ResearchPage />
  if (page === 'conferences') return <ConferencesPage />
  if (page === 'ideas') return <IdeasPage />
  if (page === 'papers') return <PapersPage />
  if (page === 'monitor') return <MonitorPage />
  if (page === 'reader') return <ReaderPage />
  return projectId === null ? (
    <TaskListPage />
  ) : (
    <ProjectPage projectId={projectId} />
  )
}
