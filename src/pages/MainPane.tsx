/**
 * The middle pane: a project page when a project is selected, otherwise the
 * selected built-in list.
 */
import { useUIStore } from '@/store/ui-store'
import { ProjectPage } from './projects/ProjectPage'
import { TaskListPage } from './tasks/TaskListPage'

export function MainPane() {
  const projectId = useUIStore(state => state.selectedProjectId)
  return projectId === null ? (
    <TaskListPage />
  ) : (
    <ProjectPage projectId={projectId} />
  )
}
