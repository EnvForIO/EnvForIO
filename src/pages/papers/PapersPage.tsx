/**
 * The paper library (Seedbank): paste a DOI or arXiv link (or type a title)
 * on top, filter by reading status or search, then the list on the left and
 * the selected paper on the right.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookPlusIcon, Loader2Icon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { errorText, useAddPaper, usePaperCounts, usePapers } from '@/api/papers'
import { FilterChip } from '@/components/FilterChip'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ReadingStatus } from '@/lib/tauri-bindings'
import { PaperDetail } from './PaperDetail'
import { PaperRow } from './PaperRow'
import { READING_COLOR, READING_STATUSES } from './format'

export function PapersPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ReadingStatus | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const { data: papers = [] } = usePapers({
    status,
    search: search.trim() === '' ? null : search.trim(),
  })
  const { data: counts } = usePaperCounts()
  const addPaper = useAddPaper()

  const add = () => {
    if (draft.trim() === '' || addPaper.isPending) return
    addPaper.mutate(draft, {
      onSuccess: paper => {
        setSelected(paper.id)
        setDraft('')
      },
      onError: error => toast.error(errorText(error)),
    })
  }
  const statusCount = new Map(counts?.byStatus ?? [])

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <h1 className="text-xl font-semibold">{t('papers.pageTitle')}</h1>
      <div className="flex items-center gap-2 rounded-md border px-3">
        {addPaper.isPending ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <BookPlusIcon className="size-4 text-muted-foreground" />
        )}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={
            addPaper.isPending ? t('papers.adding') : t('papers.addPlaceholder')
          }
          className="h-9 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterChip
          active={status === null}
          onClick={() => setStatus(null)}
          label={t('papers.all')}
          count={counts?.all ?? 0}
        />
        {READING_STATUSES.map(s => (
          <FilterChip
            key={s}
            active={status === s}
            onClick={() => setStatus(s)}
            color={READING_COLOR[s]}
            label={t(`papers.status.${s}`)}
            count={statusCount.get(s) ?? 0}
          />
        ))}
        <div className="ml-auto flex items-center gap-1.5 rounded-md border px-2">
          <SearchIcon className="size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('papers.search')}
            className="h-7 w-52 bg-transparent text-xs outline-none"
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <ScrollArea className="w-96 shrink-0">
          <div className="flex flex-col gap-2 pr-3">
            {papers.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('papers.empty')}
              </p>
            )}
            {papers.map(paper => (
              <PaperRow
                key={paper.id}
                paper={paper}
                selected={paper.id === selected}
                onSelect={() => setSelected(paper.id)}
              />
            ))}
          </div>
        </ScrollArea>
        <ScrollArea className="min-w-0 flex-1">
          <div className="pr-3">
            {selected === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('papers.pickOne')}
              </p>
            ) : (
              <PaperDetail id={selected} onDeleted={() => setSelected(null)} />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
