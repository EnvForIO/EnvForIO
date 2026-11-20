/**
 * The research overview and the JSON export of every idea and paper.
 * The overview lives under ['ideas'] so idea and paper writes refresh it;
 * task and project changes show the next time the page opens.
 */
import { useQuery } from '@tanstack/react-query'
import { save } from '@tauri-apps/plugin-dialog'
import { commands, unwrapResult } from '@/lib/tauri-bindings'

export const useResearchOverview = () =>
  useQuery({
    queryKey: ['ideas', 'overview'] as const,
    queryFn: async () => unwrapResult(await commands.getResearchOverview()),
  })

/** Ask where to save, then write the archive. False when the user cancels. */
export async function exportResearchJson(today: string) {
  const path = await save({
    defaultPath: `envforio-research-${today}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (!path) return false
  unwrapResult(await commands.exportResearchJson(path))
  return true
}
