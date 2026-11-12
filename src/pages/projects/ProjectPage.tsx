/**
 * The middle pane for a project: dates and progress at the top, a
 * conference project's round, then either the list (each module or phase
 * with its tasks, the ungrouped tasks and an "add module" box) or the
 * board (To do / Doing / Done).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DownloadIcon,
  KanbanIcon,
  ListIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  useAddModule,
  useModules,
  useProjectTasks,
  useProjects,
} from '@/api/projects'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatMinutes } from '@/lib/duration'
import type { Project } from '@/lib/tauri-bindings'
import { useTodayLine } from '@/api/plans'
import { useUIStore } from '@/store/ui-store'
import { dateLabel } from '@/pages/tasks/dates'
import { ModuleSection } from './ModuleSection'
import { ProjectBoard } from './ProjectBoard'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ProjectHealthBadge } from '@/pages/plans/ProjectHealthBadge'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { ProjectDialog } from './ProjectDialog'
import { RoundBanner } from './RoundBanner'
import { ExportDialog } from '@/pages/export/ExportDialog'
import { isEnter } from '@/lib/keys'

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
  const view = useUIStore(state => state.projectView)
  const setView = useUIStore(state => state.setProjectView)
  const [editing, setEditing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moduleName, setModuleName] = useState('')

  const ungrouped = tasks.filter(task => task.moduleId === null)
  const todayLine = useTodayLine().data?.projects.find(
    p => p.projectId === project.id
  )
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
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <header className="flex items-start gap-3">
        <span
          className="mt-2 size-3 rounded-full"
          style={{ background: project.color }}
        />
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{dates.join(' · ')}</p>
          <p className="text-sm text-muted-foreground">
            {t('projects.progress', {
              done: project.doneCount,
              total: project.taskCount,
              doneTime: formatMinutes(project.doneEstimateMinutes),
              totalTime: formatMinutes(project.estimateMinutes),
            })}
          </p>
          {todayLine && (
            <p className="text-sm font-medium text-primary">
              {t('plans.projectToday', {
                minutes: formatMinutes(todayLine.minutes),
                done: formatMinutes(todayLine.doneMinutes),
              })}
            </p>
          )}
          <ProjectHealthBadge projectId={project.id} />
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={view}
          onValueChange={v => v && setView(v as 'list' | 'board')}
        >
          <ToggleGroupItem value="list" aria-label={t('projects.listView')}>
            <ListIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="board" aria-label={t('projects.boardView')}>
            <KanbanIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExporting(true)}
          aria-label={t('export.button')}
        >
          <DownloadIcon className="size-4" />
        </Button>
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

      <RoundBanner project={project} />

      {view === 'board' ? (
        <ProjectBoard projectId={project.id} modules={modules} tasks={tasks} />
      ) : (
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
                if (!isEnter(e) || moduleName.trim() === '') return
                addModule.mutate({ projectId: project.id, name: moduleName })
                setModuleName('')
              }}
              placeholder={t('projects.addModule')}
              className="h-8 rounded-md px-3 text-sm outline-none placeholder:text-muted-foreground hover:bg-accent/40"
            />
          </div>
        </ScrollArea>
      )}

      <ExportDialog
        scope={{ kind: 'Project', id: project.id }}
        open={exporting}
        onOpenChange={setExporting}
      />
      <ProjectDialog
        open={editing}
        onOpenChange={setEditing}
        project={project}
      />
      <DeleteProjectDialog
        project={confirmDelete ? project : null}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  )
}
