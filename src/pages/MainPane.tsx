/**
 * The middle pane: the calendar, the item list, a project page, or the selected built-in list.
 */
import { useUIStore } from '@/store/ui-store'
import { ProjectPage } from './projects/ProjectPage'
import { TaskListPage } from './tasks/TaskListPage'
import { CalendarPage } from './calendar/CalendarPage'
import { ItemsPage } from './items/ItemsPage'

export function MainPane() {
  const projectId = useUIStore(state => state.selectedProjectId)
  const page = useUIStore(state => state.page)
  if (page === 'calendar') return <CalendarPage />
  if (page === 'items') return <ItemsPage />
  return projectId === null ? (
    <TaskListPage />
  ) : (
    <ProjectPage projectId={projectId} />
  )
}
