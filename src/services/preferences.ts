import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emit, listen } from '@tauri-apps/api/event'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { commands, type AppPreferences } from '@/lib/tauri-bindings'

// Query keys for preferences
export const preferencesQueryKeys = {
  all: ['preferences'] as const,
  preferences: () => [...preferencesQueryKeys.all] as const,
}

const PREFERENCES_CHANGED = 'preferences-changed'

/** Reload preferences when another window saves them. Used by the widget windows. */
export function usePreferencesSync(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    const unlisten = listen(PREFERENCES_CHANGED, () => {
      void queryClient.invalidateQueries({ queryKey: preferencesQueryKeys.all })
    })
    return () => {
      void unlisten.then(stop => stop())
    }
  }, [queryClient])
}

// TanStack Query hooks following the architectural patterns
export function usePreferences() {
  return useQuery({
    queryKey: preferencesQueryKeys.preferences(),
    queryFn: async (): Promise<AppPreferences> => {
      logger.debug('Loading preferences from backend')
      const result = await commands.loadPreferences()

      if (result.status === 'error') {
        // Return defaults if preferences file doesn't exist yet
        logger.warn('Failed to load preferences, using defaults', {
          error: result.error,
        })
        return {
          theme: 'system',
          quick_pane_shortcut: null,
          language: null,
          duo_style: {
            material: 'translucent',
            font: 'system',
            text_size: 'medium',
          },
          monitor_panel: {
            openOnPush: true,
            edge: 'right',
            push: 'medium',
            width: 340,
            shortcut: null,
          },
        }
      }

      logger.info('Preferences loaded successfully', {
        preferences: result.data,
      })
      return result.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useSavePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (preferences: AppPreferences) => {
      logger.debug('Saving preferences to backend', { preferences })
      const result = await commands.savePreferences(preferences)

      if (result.status === 'error') {
        logger.error('Failed to save preferences', {
          error: result.error,
          preferences,
        })
        toast.error('Failed to save preferences', { description: result.error })
        throw new Error(result.error)
      }

      logger.info('Preferences saved successfully')
    },
    onSuccess: (_, preferences) => {
      // Update the cache with the new preferences
      queryClient.setQueryData(preferencesQueryKeys.preferences(), preferences)
      // Other windows (the Todo Duo widgets) have their own cache.
      void emit(PREFERENCES_CHANGED)
      logger.info('Preferences cache updated')
      toast.success('Preferences saved')
    },
  })
}
