/**
 * "Delete <project>?" with its task count. Used by the project page's
 * delete button and the sidebar's right-click menu. Deleting the project
 * that is open goes back to My Day, so the main pane is never left blank.
 */
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDeleteProject } from '@/api/projects'
import { errorText } from '@/api/papers'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Project } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'

interface Props {
  project: Project | null // null = closed
  onClose: () => void
}

export function DeleteProjectDialog({ project, onClose }: Props) {
  const { t } = useTranslation()
  const deleteProject = useDeleteProject()

  const confirm = () => {
    if (!project) return
    deleteProject.mutate(project.id, {
      onSuccess: () => {
        const { selectedProjectId, selectView } = useUIStore.getState()
        if (selectedProjectId === project.id) selectView('MyDay')
      },
      onError: error => toast.error(errorText(error)),
    })
  }

  return (
    <AlertDialog
      open={project !== null}
      onOpenChange={open => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('projects.deleteTitle', { name: project?.name ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('projects.deleteDescription', {
              count: project?.taskCount ?? 0,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('projects.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {t('projects.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
