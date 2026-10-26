/**
 * The right column of the Library: reading status and BibTeX, then the
 * editable title, authors, year and venue, links, abstract, reading notes
 * and the ideas that use the paper. Text saves when it loses focus.
 * PDFs stay in Zotero; the DOI and arXiv links open the paper.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ClipboardCopyIcon,
  ExternalLinkIcon,
  LightbulbIcon,
  Trash2Icon,
} from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { toast } from 'sonner'
import {
  copyBibtex,
  errorText,
  useDeletePaper,
  usePaper,
  usePaperIdeas,
  useUpdatePaper,
} from '@/api/papers'
import { MarkdownNotes } from '@/components/MarkdownNotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Paper, PaperUpdate, ReadingStatus } from '@/lib/tauri-bindings'
import { READING_COLOR, READING_STATUSES, RELATION_COLOR } from './format'

const toUpdate = (paper: Paper): PaperUpdate => ({
  title: paper.title,
  authors: paper.authors,
  year: paper.year,
  venue: paper.venue,
  status: paper.status,
  notes: paper.notes,
})

const fail = (error: unknown) => toast.error(errorText(error))

export function PaperDetail({
  id,
  onDeleted,
}: {
  id: number
  onDeleted: () => void
}) {
  const { data: paper } = usePaper(id)
  if (!paper) return null
  return <Form key={paper.id} paper={paper} onDeleted={onDeleted} />
}

function Form({ paper, onDeleted }: { paper: Paper; onDeleted: () => void }) {
  const { t } = useTranslation()
  const updatePaper = useUpdatePaper()
  const deletePaper = useDeletePaper()
  const [title, setTitle] = useState(paper.title)
  const [authors, setAuthors] = useState(paper.authors.join('; '))
  const [year, setYear] = useState(paper.year?.toString() ?? '')
  const [venue, setVenue] = useState(paper.venue)

  const save = (change: Partial<PaperUpdate>) => {
    const typedYear = Number.parseInt(year, 10)
    updatePaper.mutate(
      {
        id: paper.id,
        update: {
          ...toUpdate(paper),
          title,
          authors: authors.split(';').map(a => a.trim()),
          year: Number.isNaN(typedYear) ? null : typedYear,
          venue,
          ...change,
        },
      },
      { onError: fail }
    )
  }

  const links: { label: string; url: string }[] = []
  if (paper.doi)
    links.push({
      label: `DOI ${paper.doi}`,
      url: `https://doi.org/${paper.doi}`,
    })
  if (paper.arxivId)
    links.push({
      label: `arXiv ${paper.arxivId}`,
      url: `https://arxiv.org/abs/${paper.arxivId}`,
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={paper.status}
          onValueChange={v => save({ status: v as ReadingStatus })}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {READING_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                <span
                  className="mr-2 inline-block size-2 rounded-full"
                  style={{ background: READING_COLOR[s] }}
                />
                {t(`papers.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            copyBibtex(paper.id).then(
              () => toast.success(t('papers.copied')),
              fail
            )
          }
        >
          <ClipboardCopyIcon className="size-3.5" />
          {t('papers.copyBibtex')}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="ml-auto"
          aria-label={t('papers.delete')}
          onClick={() =>
            deletePaper.mutate(paper.id, {
              onSuccess: onDeleted,
              onError: fail,
            })
          }
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={() => title.trim() !== '' && title !== paper.title && save({})}
        className="text-lg font-semibold"
        aria-label={t('papers.titleLabel')}
      />
      <Input
        value={authors}
        onChange={e => setAuthors(e.target.value)}
        onBlur={() => authors !== paper.authors.join('; ') && save({})}
        placeholder={t('papers.authors')}
      />
      <div className="grid grid-cols-[6rem_1fr] gap-3">
        <Input
          value={year}
          inputMode="numeric"
          onChange={e => setYear(e.target.value)}
          onBlur={() => year !== (paper.year?.toString() ?? '') && save({})}
          placeholder={t('papers.year')}
        />
        <Input
          value={venue}
          onChange={e => setVenue(e.target.value)}
          onBlur={() => venue !== paper.venue && save({})}
          placeholder={t('papers.venue')}
        />
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {links.map(link => (
            <button
              key={link.url}
              type="button"
              onClick={() => void openUrl(link.url)}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLinkIcon className="size-3" />
              {link.label}
            </button>
          ))}
        </div>
      )}

      {paper.summary !== '' && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{t('papers.abstract')}</h3>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {paper.summary}
          </p>
        </section>
      )}
      <section className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{t('papers.notes')}</h3>
        <MarkdownNotes
          saved={paper.notes}
          onSave={notes => save({ notes })}
          placeholder={t('ideas.notesPlaceholder')}
          emptyText={t('papers.notesEmpty')}
        />
      </section>
      <UsedIn paperId={paper.id} />
    </div>
  )
}

function UsedIn({ paperId }: { paperId: number }) {
  const { t } = useTranslation()
  const { data: ideas = [] } = usePaperIdeas(paperId)
  if (ideas.length === 0) return null
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold">{t('papers.usedIn')}</h3>
      {ideas.map(idea => (
        <div key={idea.ideaId} className="flex items-center gap-2 text-sm">
          <LightbulbIcon className="size-3.5 text-muted-foreground" />
          <span className="flex-1">{idea.title}</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs text-white"
            style={{ background: RELATION_COLOR[idea.relation] }}
          >
            {t(`papers.relation.${idea.relation}`)}
          </span>
        </div>
      ))}
    </section>
  )
}
