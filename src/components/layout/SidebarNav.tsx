/**
 * The left sidebar's built-in lists, each with its count of open tasks.
 * Projects, Calendar, Stats and the rest join here in later phases.
 */
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon,
  HouseIcon,
  StarIcon,
  SunIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTasks } from '@/api/tasks'
import type { TaskView } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

const VIEWS: { view: TaskView; icon: LucideIcon }[] = [
  { view: 'MyDay', icon: SunIcon },
  { view: 'Important', icon: StarIcon },
  { view: 'Planned', icon: CalendarDaysIcon },
  { view: 'Tasks', icon: HouseIcon },
]

function NavItem({ view, icon: Icon }: { view: TaskView; icon: LucideIcon }) {
  const { t } = useTranslation()
  const selected = useUIStore(state => state.selectedView) === view
  const selectView = useUIStore(state => state.selectView)
  const { data: tasks = [] } = useTasks(view)
  const openCount = tasks.filter(task => task.doneAt === null).length

  return (
    <button
      type="button"
      onClick={() => selectView(view)}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent/60',
        selected && 'bg-accent font-medium'
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{t(`tasks.view.${view}`)}</span>
      {openCount > 0 && (
        <span className="text-xs text-muted-foreground">{openCount}</span>
      )}
    </button>
  )
}

export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {VIEWS.map(item => (
        <NavItem key={item.view} {...item} />
      ))}
    </nav>
  )
}
