/**
 * The right-click menu for text: undo, cut, copy, paste and select all in a
 * text field, copy on selected page text. It replaces the WebView's own menu
 * (`lib/browser-menu.ts`), drawn like the app's other menus. Mount one per
 * window.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import {
  ClipboardPasteIcon,
  CopyIcon,
  ScissorsIcon,
  TextSelectIcon,
  Undo2Icon,
  type LucideIcon,
} from 'lucide-react'
import { onEditMenu, type EditTarget } from '@/lib/browser-menu'
import { cn } from '@/lib/utils'
import {
  menuItemClass,
  menuSeparatorClass,
  menuSurfaceClass,
} from './menu-styles'

type TextField = HTMLInputElement | HTMLTextAreaElement

interface Opened {
  x: number
  y: number
  field: HTMLElement | null
  /** Where the selection was when the menu opened, put back before acting. */
  restore: () => void
  selected: string
  writable: boolean
}

function isTextField(el: HTMLElement | null): el is TextField {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

/** Reads the selection now, while the field still has focus. */
function capture({ x, y, field }: EditTarget): Opened {
  if (isTextField(field)) {
    let start: number | null = null
    let end: number | null = null
    try {
      start = field.selectionStart
      end = field.selectionEnd
    } catch {
      // Inputs like type=number have no selection.
    }
    return {
      x,
      y,
      field,
      selected:
        start !== null && end !== null ? field.value.slice(start, end) : '',
      writable: !field.readOnly && !field.disabled,
      restore: () => {
        field.focus({ preventScroll: true })
        if (start !== null && end !== null) {
          try {
            field.setSelectionRange(start, end)
          } catch {
            // As above.
          }
        }
      },
    }
  }
  const selection = window.getSelection()
  const range =
    selection !== null && selection.rangeCount > 0
      ? selection.getRangeAt(0).cloneRange()
      : null
  return {
    x,
    y,
    field,
    selected: selection?.toString() ?? '',
    writable: field !== null,
    restore: () => {
      field?.focus({ preventScroll: true })
      if (range !== null) {
        const now = window.getSelection()
        now?.removeAllRanges()
        now?.addRange(range)
      }
    },
  }
}

function run(command: string, value?: string): boolean {
  // execCommand is deprecated but still the only way to cut, undo and insert
  // text in a field while keeping the field's own undo history.
  return document.execCommand(command, false, value)
}

interface Action {
  key: 'undo' | 'cut' | 'copy' | 'paste' | 'selectAll'
  icon: LucideIcon
  keys: string
  disabled: boolean
  act: () => void
}
type Entry = Action | { key: 'separator' | 'separator2' }

export function EditMenu() {
  const { t } = useTranslation()
  const [opened, setOpened] = useState<Opened | null>(null)
  const [open, setOpen] = useState(false)
  // A new right-click remounts the menu, so it opens at the new spot.
  const [seq, setSeq] = useState(0)

  useEffect(() => {
    onEditMenu(target => {
      setOpened(capture(target))
      setSeq(n => n + 1)
      setOpen(true)
    })
    return () => onEditMenu(null)
  }, [])

  if (opened === null) return null
  const { field, selected, writable, restore } = opened
  const inField = field !== null
  const hasSelection = selected !== ''

  const copy = () => {
    restore()
    if (!run('copy')) void writeText(selected).catch(() => undefined)
  }
  const paste = async () => {
    const text = await readText().catch(() => '')
    restore()
    if (text !== '') run('insertText', text)
  }
  const selectAll = () => {
    restore()
    if (isTextField(field)) field.select()
    else run('selectAll')
  }

  const entries: (Entry | false)[] = [
    inField && {
      key: 'undo',
      icon: Undo2Icon,
      keys: 'Ctrl+Z',
      disabled: !writable,
      act: () => {
        restore()
        run('undo')
      },
    },
    inField && { key: 'separator' },
    inField && {
      key: 'cut',
      icon: ScissorsIcon,
      keys: 'Ctrl+X',
      disabled: !writable || !hasSelection,
      act: () => {
        restore()
        run('cut')
      },
    },
    {
      key: 'copy',
      icon: CopyIcon,
      keys: 'Ctrl+C',
      disabled: !hasSelection,
      act: copy,
    },
    inField && {
      key: 'paste',
      icon: ClipboardPasteIcon,
      keys: 'Ctrl+V',
      disabled: !writable,
      act: () => void paste(),
    },
    inField && { key: 'separator2' },
    inField && {
      key: 'selectAll',
      icon: TextSelectIcon,
      keys: 'Ctrl+A',
      disabled: false,
      act: selectAll,
    },
  ]
  const items = entries.filter(item => item !== false)

  return (
    <DropdownMenuPrimitive.Root
      key={seq}
      open={open}
      onOpenChange={setOpen}
      modal={false}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed size-0"
          style={{ left: opened.x, top: opened.y }}
        />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          data-slot="edit-menu"
          side="bottom"
          align="start"
          sideOffset={2}
          collisionPadding={8}
          // Focus stays in the field (restore() put it there), not on the anchor.
          onCloseAutoFocus={e => e.preventDefault()}
          className={cn(
            menuSurfaceClass,
            'max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin)'
          )}
        >
          {items.map(item =>
            'act' in item ? (
              <DropdownMenuPrimitive.Item
                key={item.key}
                disabled={item.disabled}
                onSelect={item.act}
                className={menuItemClass}
              >
                <item.icon />
                {t(`editMenu.${item.key}`)}
                <span className="ml-auto pl-6 text-xs text-muted-foreground">
                  {item.keys}
                </span>
              </DropdownMenuPrimitive.Item>
            ) : (
              <DropdownMenuPrimitive.Separator
                key={item.key}
                className={menuSeparatorClass}
              />
            )
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}
