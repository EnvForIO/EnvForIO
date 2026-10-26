/**
 * Papers attached to an idea, each with its relation (Inspiration, Baseline,
 * Competing work, Reference) and a note on why it matters. Attach by
 * searching the library, or paste a DOI or arXiv link to add and attach.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2Icon, PlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  errorText,
  NO_PAPER_FILTER,
  useAddPaper,
  useIdeaPapers,
  useLinkPaper,
  usePapers,
  useUnlinkPaper,
} from '@/api/papers'
import { NativeSelect } from '@/components/ui/native-select'
import type { IdeaPaper, PaperRelation } from '@/lib/tauri-bindings'
import { paperByline, RELATION_COLOR, RELATIONS } from '@/pages/papers/format'

function RelationSelect({
  value,
  onChange,
}: {
  value: PaperRelation
  onChange: (relation: PaperRelation) => void
}) {
  const { t } = useTranslation()
  return (
    <NativeSelect
      value={value}
      onChange={e => onChange(e.target.value as PaperRelation)}
      className="h-7 w-36 text-xs"
      style={{ color: RELATION_COLOR[value] }}
    >
      {RELATIONS.map(r => (
        <option key={r} value={r}>
          {t(`papers.relation.${r}`)}
        </option>
      ))}
    </NativeSelect>
  )
}

function Attached({ ideaId, item }: { ideaId: number; item: IdeaPaper }) {
  const { t } = useTranslation()
  const link = useLinkPaper()
  const unlink = useUnlinkPaper()
  const [note, setNote] = useState(item.note)
  const relink = (relation: PaperRelation) =>
    link.mutate({ ideaId, paperId: item.paper.id, relation, note })

  return (
    <div className="group flex flex-col gap-1 rounded-md border p-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.paper.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {paperByline(item.paper)}
          </p>
        </div>
        <RelationSelect value={item.relation} onChange={relink} />
        <button
          type="button"
          className="mt-1.5 opacity-0 group-hover:opacity-100"
          onClick={() => unlink.mutate({ ideaId, paperId: item.paper.id })}
          aria-label={t('papers.unlink')}
        >
          <XIcon className="size-3" />
        </button>
      </div>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={() => note !== item.note && relink(item.relation)}
        placeholder={t('papers.notePlaceholder')}
        className="bg-transparent text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

export function IdeaPapers({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const { data: attached = [] } = useIdeaPapers(ideaId)
  const { data: library = [] } = usePapers(NO_PAPER_FILTER)
  const addPaper = useAddPaper()
  const link = useLinkPaper()
  const [draft, setDraft] = useState('')
  const [relation, setRelation] = useState<PaperRelation>('Inspiration')

  const attachedIds = new Set(attached.map(a => a.paper.id))
  const query = draft.trim().toLowerCase()
  const matches =
    query.length < 2
      ? []
      : library
          .filter(
            p => !attachedIds.has(p.id) && p.title.toLowerCase().includes(query)
          )
          .slice(0, 5)

  const attach = (paperId: number) => {
    link.mutate({ ideaId, paperId, relation, note: '' })
    setDraft('')
  }
  // Enter: an exact library title attaches that paper; anything else is added first.
  const submit = () => {
    if (query === '' || addPaper.isPending) return
    const exact = matches.find(p => p.title.toLowerCase() === query)
    if (exact) return attach(exact.id)
    addPaper.mutate(draft, {
      onSuccess: paper => attach(paper.id),
      onError: error => toast.error(errorText(error)),
    })
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {addPaper.isPending && (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        )}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={t('ideas.addPaper')}
          className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <RelationSelect value={relation} onChange={setRelation} />
      </div>
      {matches.map(p => (
        <button
          key={p.id}
          type="button"
          onClick={() => attach(p.id)}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-start text-sm hover:bg-accent"
        >
          <PlusIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{p.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {paperByline(p)}
          </span>
        </button>
      ))}
      {attached.map(item => (
        <Attached
          key={`${item.paper.id}-${item.relation}-${item.note}`}
          ideaId={ideaId}
          item={item}
        />
      ))}
    </section>
  )
}
