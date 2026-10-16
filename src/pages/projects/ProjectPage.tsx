/**
 * The middle pane for a project: dates and progress at the top, then each
 * module with its tasks, then the ungrouped tasks and an "add module" box.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import {
  useAddModule,
  useDeleteProject,
  useModules,
  useProjectTasks,
  useProjects,
} from '@/api/projects'
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
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatMinutes } from '@/lib/duration'
import type { Project } from '@/lib/tauri-bindings'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from '@/pages/tasks/dates'
import { ModuleSection } from './ModuleSection'
import { ProjectDialog } from './ProjectDialog'

export function ProjectPage({ projectId }: { projectId: number }) {
  const project = useProjects().data?.find(p => p.id === projectId)
  if (!project) return null
  return <ProjectView key={project.id} project={project} />
}

function ProjectView({ project }: { project: Project }) {
  const { t } = useTranslation()
  const { data: modules = [] } = useModules(project.id)
  const { data: tasks = [] } = useProjectTasks(project.id)
  const addModule = useAddModule()
  const deleteProject = useDeleteProject()
  const selectView = useUIStore(state => state.selectView)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moduleName, setModuleName] = useState('')

  const ungrouped = tasks.filter(task => task.moduleId === null)
  const dates = [
    project.startDate &&
      t('projects.starts', { date: dateLabel(project.startDate) }),
    project.deadline &&
      t('projects.due', { date: dateLabel(project.deadline) }),
    project.planDate &&
      project.bufferDays > 0 &&
      t('projects.planTo', {
        date: dateLabel(project.planDate),
        days: project.bufferDays,
      }),
  ].filter(Boolean)

  return (
    <div className="flex h-full flex-col gap-3 p-6">
      <header className="flex items-start gap-3">
        <span
          className="mt-2 size-3 rounded-full"
          style={{ background: project.color }}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{dates.join(' · ')}</p>
          <p className="text-sm text-muted-foreground">
            {t('projects.progress', {
              done: project.doneCount,
              total: project.taskCount,
              doneTime: formatMinutes(project.doneEstimateMinutes),
              totalTime: formatMinutes(project.estimateMinutes),
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          aria-label={t('projects.edit')}
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmDelete(true)}
          aria-label={t('projects.delete')}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 pr-3">
          {modules.map(module => (
            <ModuleSection
              key={module.id}
              projectId={project.id}
              module={module}
              tasks={tasks.filter(task => task.moduleId === module.id)}
            />
          ))}
          <ModuleSection
            projectId={project.id}
            module={null}
            tasks={ungrouped}
          />
          <input
            value={moduleName}
            onChange={e => setModuleName(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || moduleName.trim() === '') return
              addModule.mutate({ projectId: project.id, name: moduleName })
              setModuleName('')
            }}
            placeholder={t('projects.addModule')}
            className="h-8 rounded-md px-3 text-sm outline-none placeholder:text-muted-foreground hover:bg-accent/40"
          />
        </div>
      </ScrollArea>

      <ProjectDialog
        open={editing}
        onOpenChange={setEditing}
        project={project}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('projects.deleteTitle', { name: project.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.deleteDescription', { count: project.taskCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('projects.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteProject.mutate(project.id, {
                  onSuccess: () => selectView('MyDay'),
                })
              }
            >
              {t('projects.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
