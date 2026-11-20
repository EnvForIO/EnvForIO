/**
 * "A line for today" at the top of My Day: today's day note, edited in place.
 * It is the same note the calendar shows for today.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDayNotes, useSetDayNote } from '@/api/calendar'
import { isEnter } from '@/lib/keys'

export function TodayNote({ today }: { today: string }) {
  const { data: notes } = useDayNotes(today, today)
  if (notes === undefined) return null
  // Keyed by the saved text so the draft resets when the note changes elsewhere.
  const saved = notes[0]?.text ?? ''
  return <NoteInput key={saved} today={today} saved={saved} />
}

function NoteInput({ today, saved }: { today: string; saved: string }) {
  const { t } = useTranslation()
  const setNote = useSetDayNote()
  const [text, setText] = useState(saved)

  return (
    <input
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={() => text !== saved && setNote.mutate({ date: today, text })}
      onKeyDown={e => isEnter(e) && e.currentTarget.blur()}
      placeholder={t('tasks.todayNotePlaceholder')}
      aria-label={t('tasks.todayNoteLabel')}
      className="w-full bg-transparent text-sm text-muted-foreground italic outline-none placeholder:text-muted-foreground"
    />
  )
}
