/**
 * The paper library (Seedbank): the only place the frontend calls the paper
 * commands. Every write refetches everything under ['papers'] and ['ideas'],
 * since ideas show their attached papers.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import {
  commands,
  unwrapResult,
  type PaperFilter,
  type PaperRelation,
  type PaperUpdate,
} from '@/lib/tauri-bindings'

export const paperKeys = {
  all: ['papers'] as const,
  list: (filter: PaperFilter) => ['papers', 'list', filter] as const,
  one: (id: number) => ['papers', 'one', id] as const,
  counts: ['papers', 'counts'] as const,
  ideas: (id: number) => ['papers', 'ideas', id] as const,
}

export const NO_PAPER_FILTER: PaperFilter = { status: null, search: null }

/** What to show for a failed command: its message, if it has one. */
export function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return String(error)
}

export const usePapers = (filter: PaperFilter) =>
  useQuery({
    queryKey: paperKeys.list(filter),
    queryFn: async () => unwrapResult(await commands.listPapers(filter)),
  })

export const usePaper = (id: number) =>
  useQuery({
    queryKey: paperKeys.one(id),
    queryFn: async () => unwrapResult(await commands.getPaper(id)),
  })

export const usePaperCounts = () =>
  useQuery({
    queryKey: paperKeys.counts,
    queryFn: async () => unwrapResult(await commands.getPaperCounts()),
  })

export const usePaperIdeas = (paperId: number) =>
  useQuery({
    queryKey: paperKeys.ideas(paperId),
    queryFn: async () => unwrapResult(await commands.listPaperIdeas(paperId)),
  })

export const useIdeaPapers = (ideaId: number) =>
  useQuery({
    queryKey: ['ideas', 'papers', ideaId] as const,
    queryFn: async () => unwrapResult(await commands.listIdeaPapers(ideaId)),
  })

export async function copyBibtex(id: number) {
  await writeText(unwrapResult(await commands.paperBibtex(id)))
}

export async function openPaperPdf(id: number) {
  unwrapResult(await commands.openPaperPdf(id))
}

// ---------------------------------------------------------------------------
// Writes

function usePaperMutation<Args, Out>(run: (args: Args) => Promise<Out>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: paperKeys.all })
      await queryClient.invalidateQueries({ queryKey: ['ideas'] })
    },
  })
}

/** A DOI or arXiv id/link (looked up online), or a plain title. */
export const useAddPaper = () =>
  usePaperMutation(async (input: string) =>
    unwrapResult(await commands.addPaper(input))
  )

export const useUpdatePaper = () =>
  usePaperMutation(
    async ({ id, update }: { id: number; update: PaperUpdate }) =>
      unwrapResult(await commands.updatePaper(id, update))
  )

export const useDeletePaper = () =>
  usePaperMutation(async (id: number) =>
    unwrapResult(await commands.deletePaper(id))
  )

export const useDownloadPaperPdf = () =>
  usePaperMutation(async (id: number) =>
    unwrapResult(await commands.downloadPaperPdf(id))
  )

export const useImportPaperPdf = () =>
  usePaperMutation(async ({ id, path }: { id: number; path: string }) =>
    unwrapResult(await commands.importPaperPdf(id, path))
  )

export const useLinkPaper = () =>
  usePaperMutation(
    async (a: {
      ideaId: number
      paperId: number
      relation: PaperRelation
      note: string
    }) =>
      unwrapResult(
        await commands.linkPaper(a.ideaId, a.paperId, a.relation, a.note)
      )
  )

export const useUnlinkPaper = () =>
  usePaperMutation(
    async ({ ideaId, paperId }: { ideaId: number; paperId: number }) =>
      unwrapResult(await commands.unlinkPaper(ideaId, paperId))
  )
