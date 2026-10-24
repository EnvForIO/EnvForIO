/**
 * Ideas (Seedbank): the only place the frontend calls the idea commands.
 * Every write refetches everything under ['ideas'] (list, counts, detail).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commands,
  unwrapResult,
  type IdeaFilter,
  type IdeaUpdate,
} from '@/lib/tauri-bindings'

export const ideaKeys = {
  all: ['ideas'] as const,
  list: (filter: IdeaFilter) => ['ideas', 'list', filter] as const,
  one: (id: number) => ['ideas', 'one', id] as const,
  counts: ['ideas', 'counts'] as const,
  tags: ['ideas', 'tags'] as const,
  steps: (id: number) => ['ideas', 'steps', id] as const,
  links: (id: number) => ['ideas', 'links', id] as const,
}

export const useIdeas = (filter: IdeaFilter) =>
  useQuery({
    queryKey: ideaKeys.list(filter),
    queryFn: async () => unwrapResult(await commands.listIdeas(filter)),
  })

export const useIdea = (id: number | null) =>
  useQuery({
    queryKey: ideaKeys.one(id ?? -1),
    queryFn: async () => unwrapResult(await commands.getIdea(id ?? -1)),
    enabled: id !== null,
  })

export const useIdeaCounts = () =>
  useQuery({
    queryKey: ideaKeys.counts,
    queryFn: async () => unwrapResult(await commands.getIdeaCounts()),
  })

export const useTags = () =>
  useQuery({
    queryKey: ideaKeys.tags,
    queryFn: async () => unwrapResult(await commands.listTags()),
  })

export const useIdeaSteps = (id: number) =>
  useQuery({
    queryKey: ideaKeys.steps(id),
    queryFn: async () => unwrapResult(await commands.listIdeaSteps(id)),
  })

export const useIdeaLinks = (id: number) =>
  useQuery({
    queryKey: ideaKeys.links(id),
    queryFn: async () => unwrapResult(await commands.listIdeaLinks(id)),
  })

// ---------------------------------------------------------------------------
// Writes

function useIdeaMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ideaKeys.all }),
  })
}

export const useCreateIdea = () =>
  useIdeaMutation(async (title: string) =>
    unwrapResult(await commands.createIdea(title))
  )

export const useUpdateIdea = () =>
  useIdeaMutation(async ({ id, update }: { id: number; update: IdeaUpdate }) =>
    unwrapResult(await commands.updateIdea(id, update))
  )

export const useDeleteIdea = () =>
  useIdeaMutation(async (id: number) =>
    unwrapResult(await commands.deleteIdea(id))
  )

export const useCreateTag = () =>
  useIdeaMutation(async ({ name, color }: { name: string; color: string }) =>
    unwrapResult(await commands.createTag(name, color))
  )

export const useDeleteTag = () =>
  useIdeaMutation(async (id: number) =>
    unwrapResult(await commands.deleteTag(id))
  )

export const useAddIdeaStep = () =>
  useIdeaMutation(
    async ({ ideaId, title }: { ideaId: number; title: string }) =>
      unwrapResult(await commands.addIdeaStep(ideaId, title))
  )

export const useSetIdeaStepDone = () =>
  useIdeaMutation(async ({ id, done }: { id: number; done: boolean }) =>
    unwrapResult(await commands.setIdeaStepDone(id, done))
  )

export const useDeleteIdeaStep = () =>
  useIdeaMutation(async (id: number) =>
    unwrapResult(await commands.deleteIdeaStep(id))
  )

export const useAddIdeaLink = () =>
  useIdeaMutation(
    async ({
      ideaId,
      label,
      url,
    }: {
      ideaId: number
      label: string
      url: string
    }) => unwrapResult(await commands.addIdeaLink(ideaId, label, url))
  )

export const useDeleteIdeaLink = () =>
  useIdeaMutation(async (id: number) =>
    unwrapResult(await commands.deleteIdeaLink(id))
  )
