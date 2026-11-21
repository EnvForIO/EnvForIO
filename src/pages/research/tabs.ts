/**
 * The pages behind the sidebar's one Research entry, shown as tabs: the overview, ideas and the paper library.
 */
import type { MainPage } from '@/store/ui-store'

export const RESEARCH_TABS = [
  'research',
  'ideas',
  'papers',
] as const satisfies readonly MainPage[]

export type ResearchTab = (typeof RESEARCH_TABS)[number]

export const isResearchTab = (page: MainPage | null): page is ResearchTab =>
  RESEARCH_TABS.some(tab => tab === page)
