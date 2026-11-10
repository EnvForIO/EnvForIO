/**
 * Todos inside an idea: tick, remove, and add with an optional due date.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from 'lucide-react'
import {
  useAddIdeaTodo,
  useDeleteIdeaTodo,
  useIdeaTodos,
  useSetIdeaTodoDone,
} from '@/api/ideas'
import { useToday } from '@/api/tasks'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'
import { dateLabel, formatDate, isOverdue } from '@/pages/tasks/dates'
import { isEnter } from '@/lib/keys'

export function IdeaTodos({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const today = useToday()
  const { data: todos = [] } = useIdeaTodos(ideaId)
  const addTodo = useAddIdeaTodo()
  const setDone = useSetIdeaTodoDone()
  const deleteTodo = useDeleteIdeaTodo()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState<Date | undefined>()

  const add = () => {
    if (title.trim() === '') return
    addTodo.mutate({ ideaId, title, dueDate: due ? formatDate(due) : null })
    setTitle('')
    setDue(undefined)
  }

  return (
    <section className="flex flex-col gap-1">
      {todos.map(todo => (
        <div
          key={todo.id}
          className="group flex items-center gap-2 px-1 py-0.5"
        >
          <Checkbox
            checked={todo.done}
            onCheckedChange={c =>
              setDone.mutate({ id: todo.id, done: c === true })
            }
            aria-label={todo.title}
          />
          <span
            className={cn(
              'flex-1 text-sm',
              todo.done && 'text-muted-foreground line-through'
            )}
          >
            {todo.title}
          </span>
          {todo.dueDate && (
            <span
              className={cn(
                'text-xs text-muted-foreground',
                !todo.done &&
                  isOverdue(todo.dueDate, today) &&
                  'text-destructive'
              )}
            >
              {dateLabel(todo.dueDate)}
            </span>
          )}
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => deleteTodo.mutate(todo.id)}
            aria-label={t('ideas.deleteTodo')}
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => isEnter(e) && add()}
          placeholder={t('ideas.addTodo')}
          className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
        <DatePicker
          value={due}
          onChange={setDue}
          placeholder={t('ideas.due')}
          className="h-8 w-36"
        />
      </div>
    </section>
  )
}
