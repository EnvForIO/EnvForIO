/**
 * The left sidebar's built-in lists, each with its count of open tasks.
 * Projects, Calendar, Stats and the rest join here in later phases.
 */
import { useTranslation } from 'react-i18next'
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChartColumnIcon,
  LibraryIcon,
  LightbulbIcon,
  ListChecksIcon,
  HouseIcon,
  StarIcon,
  SunIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTasks } from '@/api/tasks'
import type { TaskView } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { useUIStore, type MainPage } from '@/store/ui-store'

const VIEWS: { view: TaskView; icon: LucideIcon }[] = [
  { view: 'MyDay', icon: SunIcon },
  { view: 'Important', icon: StarIcon },
  { view: 'Planned', icon: CalendarDaysIcon },
  { view: 'Tasks', icon: HouseIcon },
]

function NavItem({ view, icon: Icon }: { view: TaskView; icon: LucideIcon }) {
  const { t } = useTranslation()
  const selected = useUIStore(
    state =>
      state.selectedProjectId === null &&
      state.page === null &&
      state.selectedView === view
  )
  const selectView = useUIStore(state => state.selectView)
  const { data: tasks = [] } = useTasks(view)
  const openCount = tasks.filter(task => task.doneAt === null).length

  return (
    <button
      type="button"
      onClick={() => selectView(view)}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm hover:bg-accent/60',
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

function PageItem({ page, icon: Icon }: { page: MainPage; icon: LucideIcon }) {
  const { t } = useTranslation()
  const open = useUIStore(state => state.page === page)
  const openPage = useUIStore(state => state.openPage)
  return (
    <button
      type="button"
      onClick={() => openPage(page)}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm hover:bg-accent/60',
        open && 'bg-accent font-medium'
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1 text-left">{t(`${page}.title`)}</span>
    </button>
  )
}

export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {VIEWS.map(item => (
        <NavItem key={item.view} {...item} />
      ))}
      <PageItem page="calendar" icon={CalendarRangeIcon} />
      <PageItem page="items" icon={ListChecksIcon} />
      <PageItem page="stats" icon={ChartColumnIcon} />
      <PageItem page="ideas" icon={LightbulbIcon} />
      <PageItem page="papers" icon={LibraryIcon} />
    </nav>
  )
}
