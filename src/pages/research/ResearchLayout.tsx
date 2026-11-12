/**
 * Research as one page with tabs (user decision 2026-11-20): Overview,
 * Ideas and Library. Each tab is its own page underneath, so jumping to an
 * idea or the library from elsewhere opens the right tab.
 */
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { RESEARCH_TABS, type ResearchTab } from './tabs'

const LABEL: Record<ResearchTab, string> = {
  research: 'research.tab.overview',
  ideas: 'ideas.title',
  papers: 'papers.title',
}

export function ResearchLayout({
  tab,
  children,
}: {
  tab: ResearchTab
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const openPage = useUIStore(state => state.openPage)

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pt-4">
        <h1 className="text-xl font-semibold">{t('research.title')}</h1>
        <div role="tablist" className="mt-2 flex gap-1 border-b">
          {RESEARCH_TABS.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === tab}
              onClick={() => openPage(id)}
              className={cn(
                '-mb-px border-b-2 px-3 py-1.5 text-sm',
                id === tab
                  ? 'border-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t(LABEL[id])}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
