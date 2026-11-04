/**
 * A mutation that refetches the given query keys when it settles, the
 * write pattern of most api files. Tasks and ideas have their own (they
 * also tell other windows).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useInvalidatingMutation<Args, Out>(
  keys: readonly (readonly unknown[])[],
  run: (args: Args) => Promise<Out>
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      for (const queryKey of keys) {
        await queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}
