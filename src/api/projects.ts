/**
 * Projects: the only place the frontend calls the project commands.
 * Keys live under ['tasks', ...] so every task write (and the cross-window
 * `tasks-changed` sync) also refreshes project totals.
 */
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult, type ProjectInput } from '@/lib/tauri-bindings'
import { useTaskMutation } from './tasks'

export const projectKeys = {
  all: ['tasks', 'projects'] as const,
  modules: (projectId: number) =>
    ['tasks', 'projects', projectId, 'modules'] as const,
  tasks: (projectId: number) =>
    ['tasks', 'projects', projectId, 'tasks'] as const,
  templates: ['project-templates'] as const,
}

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.all,
    queryFn: async () => unwrapResult(await commands.listProjects()),
  })
}

export function useProjectTemplates() {
  return useQuery({
    queryKey: projectKeys.templates,
    queryFn: () => commands.listProjectTemplates(),
    staleTime: Infinity, // built into the app
  })
}

export function useModules(projectId: number) {
  return useQuery({
    queryKey: projectKeys.modules(projectId),
    queryFn: async () => unwrapResult(await commands.listModules(projectId)),
  })
}

export function useProjectTasks(projectId: number | null) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId ?? -1),
    queryFn: async () =>
      unwrapResult(await commands.listProjectTasks(projectId ?? -1)),
    enabled: projectId !== null,
  })
}

export const useCreateProject = () =>
  useTaskMutation(
    async ({ input, template }: { input: ProjectInput; template: string }) =>
      unwrapResult(await commands.createProject(input, template))
  )

export const useUpdateProject = () =>
  useTaskMutation(async ({ id, input }: { id: number; input: ProjectInput }) =>
    unwrapResult(await commands.updateProject(id, input))
  )

export const useDeleteProject = () =>
  useTaskMutation(async (id: number) =>
    unwrapResult(await commands.deleteProject(id))
  )

export const useAddModule = () =>
  useTaskMutation(
    async ({ projectId, name }: { projectId: number; name: string }) =>
      unwrapResult(await commands.addModule(projectId, name))
  )

export const useRenameModule = () =>
  useTaskMutation(async ({ id, name }: { id: number; name: string }) =>
    unwrapResult(await commands.renameModule(id, name))
  )

export const useDeleteModule = () =>
  useTaskMutation(async (id: number) =>
    unwrapResult(await commands.deleteModule(id))
  )

interface NewProjectTask {
  projectId: number
  moduleId: number | null
  title: string
  estimate: string | null
}

export const useAddProjectTask = () =>
  useTaskMutation(
    async ({ projectId, moduleId, title, estimate }: NewProjectTask) =>
      unwrapResult(
        await commands.addProjectTask(projectId, moduleId, title, estimate)
      )
  )
