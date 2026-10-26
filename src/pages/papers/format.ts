/**
 * Paper constants and labels shared by the Library page and the idea Papers tab.
 */
import type { Paper, PaperRelation, ReadingStatus } from '@/lib/tauri-bindings'

export const READING_STATUSES: ReadingStatus[] = ['ToRead', 'Reading', 'Read']

export const READING_COLOR: Record<ReadingStatus, string> = {
  ToRead: '#f59e0b',
  Reading: '#3b82f6',
  Read: '#10b981',
}

export const RELATIONS: PaperRelation[] = [
  'Inspiration',
  'Baseline',
  'Competing',
  'Reference',
]

export const RELATION_COLOR: Record<PaperRelation, string> = {
  Inspiration: '#a855f7',
  Baseline: '#3b82f6',
  Competing: '#ef4444',
  Reference: '#64748b',
}

const family = (name: string) => name.trim().split(/\s+/).pop() ?? name

/** "Vaswani", "Vaswani & Shazeer", "Vaswani et al." */
export function authorsShort(authors: string[]): string {
  if (authors.length === 0) return ''
  if (authors.length === 1) return family(authors[0] ?? '')
  if (authors.length === 2)
    return `${family(authors[0] ?? '')} & ${family(authors[1] ?? '')}`
  return `${family(authors[0] ?? '')} et al.`
}

/** "Vaswani et al. · 2017 · NeurIPS", skipping what is missing. */
export function paperByline(paper: Paper): string {
  return [authorsShort(paper.authors), paper.year, paper.venue]
    .filter(part => part !== '' && part !== null)
    .join(' · ')
}
