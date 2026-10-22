/**
 * Ctrl+Z (Cmd+Z on macOS) undoes the last task change, unless the cursor is
 * in a text field, where it keeps undoing typing as usual.
 */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useUndo } from '@/api/tasks'

export function useUndoShortcut(): void {
  const { t } = useTranslation()
  const undo = useUndo()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== 'z' ||
        !(e.ctrlKey || e.metaKey) ||
        e.shiftKey
      )
        return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable="true"]')) return
      e.preventDefault()
      undo.mutate(undefined, {
        onSuccess: label => toast(t('undo.done', { what: label })),
        onError: () => toast(t('undo.nothing')),
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, t])
}
