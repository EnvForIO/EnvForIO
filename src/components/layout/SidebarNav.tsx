/**
 * The left sidebar's built-in lists, each with its count of open tasks,
 * then the full pages. Projects follow in `SidebarProjects`.
 */
import { useTranslation } from 'react-i18next'
import {
  ActivityIcon,
  CalendarRangeIcon,
  ChartColumnIcon,
  LightbulbIcon,
  RssIcon,
  HouseIcon,
  StarIcon,
  SunIcon,
  type LucideIcon,
} from 'lucide-react'
import { useTasks } from '@/api/tasks'
import type { TaskView } from '@/lib/tauri-bindings'
import { navCountClass, navItemClass } from './nav-item'
import { isResearchTab } from '@/pages/research/tabs'
import { useUIStore, type MainPage } from '@/store/ui-store'

const VIEWS: { view: TaskView; icon: LucideIcon }[] = [
  { view: 'MyDay', icon: SunIcon },
  { view: 'Important', icon: StarIcon },
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
      className={navItemClass(selected)}
    >
      <Icon className="size-4" />
      <span className="text-start">{t(`tasks.view.${view}`)}</span>
      {openCount > 0 && <span className={navCountClass()}>{openCount}</span>}
    </button>
  )
}

function PageItem({ page, icon: Icon }: { page: MainPage; icon: LucideIcon }) {
  const { t } = useTranslation()
  // Research stays lit on any of its tabs.
  const open = useUIStore(
    state =>
      state.page === page || (page === 'research' && isResearchTab(state.page))
  )
  const openPage = useUIStore(state => state.openPage)
  return (
    <button
      type="button"
      onClick={() => openPage(page)}
      className={navItemClass(open)}
    >
      <Icon className="size-4" />
      <span className="text-start">{t(`${page}.title`)}</span>
    </button>
  )
}

export function SidebarNav() {
  return (
    <nav className="flex flex-col gap-0.5 px-2 pt-3 pb-2">
      {VIEWS.map(item => (
        <NavItem key={item.view} {...item} />
      ))}
      <PageItem page="calendar" icon={CalendarRangeIcon} />
      <div className="mx-2.5 my-2 border-t border-sidebar-border" />
      <PageItem page="research" icon={LightbulbIcon} />
      <div className="mx-2.5 my-2 border-t border-sidebar-border" />
      <PageItem page="reader" icon={RssIcon} />
      <PageItem page="monitor" icon={ActivityIcon} />
      <PageItem page="stats" icon={ChartColumnIcon} />
    </nav>
  )
}
