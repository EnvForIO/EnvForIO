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
import { navCountClass, navItemClass } from './nav-item'
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
    <div className="flex flex-col gap-0.5 border-t border-sidebar-border px-2 pt-3 pb-2">
      <div className="flex items-center justify-between px-2.5 pb-1 text-xs text-muted-foreground">
        {t('projects.title')}
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label={t('projects.new')}
          className="rounded p-0.5 hover:bg-foreground/5 hover:text-foreground"
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
                className={navItemClass(selectedProjectId === project.id)}
              >
                <span
                  className="mx-[3px] size-2.5 shrink-0 rounded-full"
                  style={{ background: project.color }}
                />
                <span className="min-w-0 truncate text-start">
                  {project.name}
                </span>
                {project.taskCount > project.doneCount && (
                  <span className={navCountClass()}>
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
