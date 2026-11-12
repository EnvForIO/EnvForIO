/**
 * The sidebar's Projects section: one entry per open project with its count
 * of open tasks, and a + button for a new project. Right-click a project to
 * open, edit or delete it.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlusIcon } from 'lucide-react'
import { useProjects } from '@/api/projects'
import { showContextMenu } from '@/lib/context-menu'
import type { Project } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { DeleteProjectDialog } from '@/pages/projects/DeleteProjectDialog'
import { ProjectDialog } from '@/pages/projects/ProjectDialog'
import { useUIStore } from '@/store/ui-store'

export function SidebarProjects() {
  const { t } = useTranslation()
  const { data: projects = [] } = useProjects()
  const selectedProjectId = useUIStore(state => state.selectedProjectId)
  const selectProject = useUIStore(state => state.selectProject)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState<Project | null>(null)

  const openMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault()
    void showContextMenu([
      {
        id: 'open',
        label: t('projects.open'),
        action: () => selectProject(project.id),
      },
      {
        id: 'edit',
        label: t('projects.edit'),
        action: () => setEditing(project),
      },
      { type: 'separator' },
      {
        id: 'delete',
        label: t('projects.delete'),
        action: () => setDeleting(project),
      },
    ])
  }

  return (
    <div className="flex flex-col gap-1 border-t p-2">
      <div className="flex items-center justify-between px-3 pb-1 text-xs font-medium text-muted-foreground">
        {t('projects.title')}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t('projects.new')}
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
      {projects
        .filter(p => !p.isArchived)
        .map(project => (
          <button
            key={project.id}
            type="button"
            onClick={() => selectProject(project.id)}
            onContextMenu={e => openMenu(e, project)}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm hover:bg-accent/60',
              selectedProjectId === project.id && 'bg-accent font-medium'
            )}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: project.color }}
            />
            <span className="flex-1 truncate text-left">{project.name}</span>
            {project.taskCount > project.doneCount && (
              <span className="text-xs text-muted-foreground">
                {project.taskCount - project.doneCount}
              </span>
            )}
          </button>
        ))}
      <ProjectDialog open={creating} onOpenChange={setCreating} />
      {editing && (
        <ProjectDialog
          open
          onOpenChange={open => !open && setEditing(null)}
          project={editing}
        />
      )}
      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
