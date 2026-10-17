/**
 * The middle pane: the calendar, a project page, or the selected built-in list.
 */
import { useUIStore } from '@/store/ui-store'
import { ProjectPage } from './projects/ProjectPage'
import { TaskListPage } from './tasks/TaskListPage'
import { CalendarPage } from './calendar/CalendarPage'

export function MainPane() {
  const projectId = useUIStore(state => state.selectedProjectId)
  const calendarOpen = useUIStore(state => state.calendarOpen)
  if (calendarOpen) return <CalendarPage />
  return projectId === null ? (
    <TaskListPage />
  ) : (
    <ProjectPage projectId={projectId} />
  )
}
