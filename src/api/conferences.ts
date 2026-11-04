/**
 * Conference deadlines: the only place the frontend calls their commands.
 * The list lives under ['tasks', ...] like projects, so deleting a planned
 * project (a task write) also refreshes which editions have a project.
 * ccfddl's list is downloaded only when the user presses refresh.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  commands,
  unwrapResult,
  type ConferenceList,
} from '@/lib/tauri-bindings'
import { monthKey } from './month'
import { useTaskMutation } from './tasks'

const KEY = ['tasks', 'conferences'] as const

export const useConferences = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async () => unwrapResult(await commands.listConferences()),
  })

export function useRefreshConferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrapResult(await commands.refreshConferences()),
    onSuccess: list => queryClient.setQueryData(KEY, list),
  })
}

export function useFollowConference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, on }: { key: string; on: boolean }) =>
      unwrapResult(await commands.followConference(key, on)),
    // The star turns at once; the list is read again afterwards.
    onMutate: ({ key, on }) =>
      queryClient.setQueryData<ConferenceList>(
        KEY,
        list =>
          list && {
            ...list,
            conferences: list.conferences.map(c =>
              c.key === key ? { ...c, followed: on } : c
            ),
          }
      ),
    // The Duo card's Month tab shows followed conferences' deadlines.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY })
      await queryClient.invalidateQueries({ queryKey: monthKey })
    },
  })
}

export const usePlanConference = () =>
  useTaskMutation(
    async (args: {
      key: string
      editionId: string
      stage: number
      ideaId?: number
    }) =>
      unwrapResult(
        await commands.planConference(
          args.key,
          args.editionId,
          args.stage,
          args.ideaId ?? null
        )
      )
  )
