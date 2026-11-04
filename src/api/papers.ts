/**
 * The paper library (Seedbank): the only place the frontend calls the paper
 * commands. Every write refetches everything under ['papers'] and ['ideas'],
 * since ideas show their attached papers.
 */
import { useQuery } from '@tanstack/react-query'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import {
  commands,
  unwrapResult,
  type PaperFilter,
  type PaperRelation,
  type PaperUpdate,
} from '@/lib/tauri-bindings'
import { useInvalidatingMutation } from './mutation'

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

// ---------------------------------------------------------------------------
// Writes

/** A DOI or arXiv id/link (looked up online), or a plain title. */
export const useAddPaper = () =>
  useInvalidatingMutation([paperKeys.all, ['ideas']], async (input: string) =>
    unwrapResult(await commands.addPaper(input))
  )

export const useUpdatePaper = () =>
  useInvalidatingMutation(
    [paperKeys.all, ['ideas']],
    async ({ id, update }: { id: number; update: PaperUpdate }) =>
      unwrapResult(await commands.updatePaper(id, update))
  )

export const useDeletePaper = () =>
  useInvalidatingMutation([paperKeys.all, ['ideas']], async (id: number) =>
    unwrapResult(await commands.deletePaper(id))
  )

export const useLinkPaper = () =>
  useInvalidatingMutation(
    [paperKeys.all, ['ideas']],
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
  useInvalidatingMutation(
    [paperKeys.all, ['ideas']],
    async ({ ideaId, paperId }: { ideaId: number; paperId: number }) =>
      unwrapResult(await commands.unlinkPaper(ideaId, paperId))
  )
