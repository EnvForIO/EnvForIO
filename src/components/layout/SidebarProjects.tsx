/**
 * The sidebar's Projects section: one entry per open project with its count
 * of open tasks, and a + button for a new project. Right-click a project to
 * open, edit or delete it.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpenIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useProjects } from '@/api/projects'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
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
          // Not modal: its items open dialogs, which a modal menu would
          // leave the page unclickable behind.
          <ContextMenu key={project.id} modal={false}>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                onClick={() => selectProject(project.id)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm hover:bg-accent/60 data-[state=open]:bg-accent/60',
                  selectedProjectId === project.id && 'bg-accent font-medium'
                )}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: project.color }}
                />
                <span className="flex-1 truncate text-left">
                  {project.name}
                </span>
                {project.taskCount > project.doneCount && (
                  <span className="text-xs text-muted-foreground">
                    {project.taskCount - project.doneCount}
                  </span>
                )}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => selectProject(project.id)}>
                <FolderOpenIcon />
                {t('projects.open')}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => setEditing(project)}>
                <PencilIcon />
                {t('projects.edit')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onSelect={() => setDeleting(project)}
              >
                <Trash2Icon />
                {t('projects.delete')}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
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
