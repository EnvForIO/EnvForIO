/**
 * The tray's right-click menu (`src-tauri/src/desktop/tray_menu.rs` makes
 * the window). From the top: the running timer with a stop button, My Day
 * with its open tasks, quick add, then the window, mini mode and Quit.
 *
 * The window is transparent; the panel is drawn here with the same surface
 * as the app's right-click menus, with a margin for its shadow. The page
 * reports its height so the window fits it, refetches each time the menu
 * opens, and hides on Escape or after any choice (Rust also hides it when
 * it loses focus).
 */
import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AppWindowIcon,
  PictureInPicture2Icon,
  PlusIcon,
  PowerIcon,
  SquareIcon,
  SunIcon,
} from 'lucide-react'
import { taskKeys, useTaskSync, useTasks } from '@/api/tasks'
import { useRunningTimer, useStopTimer } from '@/api/timer'
import {
  menuItemClass,
  menuSeparatorClass,
  menuSurfaceClass,
} from '@/components/ui/menu-styles'
import { commands } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { Elapsed } from '@/pages/timer/Elapsed'
import { usePreferencesSync } from '@/services/preferences'

const OPENED_EVENT = 'tray-menu-opened' // tray_menu.rs OPENED_EVENT

const hide = () => void getCurrentWindow().hide()

/** Run a choice, then close the menu. */
const choose = (action: () => unknown) => () => {
  hide()
  void action()
}

function Item({
  icon: Icon,
  label,
  detail,
  onClick,
}: {
  icon: typeof SunIcon
  label: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(menuItemClass, 'w-full hover:bg-accent')}
    >
      <Icon />
      <span className="flex-1 truncate text-start">{label}</span>
      {detail && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {detail}
        </span>
      )}
    </button>
  )
}

function RunningTimer() {
  const { t } = useTranslation()
  const { data: timer } = useRunningTimer()
  const stop = useStopTimer()
  if (!timer) return null
  return (
    <>
      <div className="flex items-center gap-2.5 px-2.5 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{timer.title}</p>
          <p className="text-xs text-muted-foreground">
            <Elapsed startedAt={timer.startedAt} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => stop.mutate()}
          aria-label={t('timer.stop')}
          title={t('timer.stop')}
          className="flex size-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
        >
          <SquareIcon className="size-3.5 fill-current" />
        </button>
      </div>
      <div className={menuSeparatorClass} />
    </>
  )
}

export function TrayMenu() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  useTaskSync() // other windows' changes
  usePreferencesSync() // the theme
  const panel = useRef<HTMLDivElement>(null)
  const { data: myDay = [] } = useTasks('MyDay')
  const open = myDay.filter(task => task.doneAt === null).length

  // Fit the window to the panel, plus the margin around it.
  useEffect(() => {
    const node = panel.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      void commands.fitTrayMenu(document.documentElement.offsetHeight)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Fresh rows each time the menu opens; Escape closes it.
  useEffect(() => {
    const stop = listen(OPENED_EVENT, () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all })
      panel.current?.querySelector('button')?.focus()
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      void stop.then(unlisten => unlisten())
      window.removeEventListener('keydown', onKey)
    }
  }, [queryClient])

  return (
    <div className="p-4">
      <div ref={panel} className={cn(menuSurfaceClass, 'w-full')}>
        <RunningTimer />
        <Item
          icon={SunIcon}
          label={t('tasks.view.MyDay')}
          detail={open > 0 ? t('trayMenu.open', { count: open }) : undefined}
          onClick={choose(commands.openMyDay)}
        />
        <Item
          icon={PlusIcon}
          label={t('trayMenu.quickAdd')}
          onClick={choose(commands.showQuickPane)}
        />
        <div className={menuSeparatorClass} />
        <Item
          icon={AppWindowIcon}
          label={t('trayMenu.show')}
          onClick={choose(commands.leaveMiniMode)}
        />
        <Item
          icon={PictureInPicture2Icon}
          label={t('trayMenu.mini')}
          onClick={choose(commands.enterMiniMode)}
        />
        <div className={menuSeparatorClass} />
        <Item
          icon={PowerIcon}
          label={t('trayMenu.quit')}
          onClick={choose(commands.quitApp)}
        />
      </div>
    </div>
  )
}
