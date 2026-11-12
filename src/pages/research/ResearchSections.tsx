/**
 * The parts of the research overview. Rows open their idea (Ideas page),
 * project (project page) or task (details pane).
 */
import { useTranslation } from 'react-i18next'
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  FolderIcon,
  LightbulbIcon,
  ListTodoIcon,
  SquareCheckIcon,
  type LucideIcon,
} from 'lucide-react'
import type {
  Deadline,
  DeadlineKind,
  Idea,
  IdeaStatus,
  OpenProblem,
  OpenTodo,
} from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'
import { STATUS_COLOR } from '@/pages/ideas/status'
import { dateLabel, isOverdue } from '@/pages/tasks/dates'
import { useUIStore } from '@/store/ui-store'

function Empty({ text }: { text: string }) {
  return <p className="py-2 text-sm text-muted-foreground">{text}</p>
}

function Row({
  icon: Icon,
  onClick,
  children,
}: {
  icon: LucideIcon
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-1.5 py-1 text-start text-sm hover:bg-accent/60"
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {children}
    </button>
  )
}

/** One bar split by status, with a legend of the non-empty ones. */
export function StatusBar({ byStatus }: { byStatus: [IdeaStatus, number][] }) {
  const { t } = useTranslation()
  const shown = byStatus.filter(([, n]) => n > 0)
  if (shown.length === 0) return <Empty text={t('research.noIdeas')} />
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-3 overflow-hidden rounded-full">
        {shown.map(([status, n]) => (
          <div
            key={status}
            style={{ flexGrow: n, background: STATUS_COLOR[status] }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {shown.map(([status, n]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: STATUS_COLOR[status] }}
            />
            {t(`ideas.status.${status}`)}
            <span className="text-muted-foreground">{n}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function ActiveIdeas({ ideas }: { ideas: Idea[] }) {
  const { t } = useTranslation()
  const openIdea = useUIStore(state => state.openIdea)
  if (ideas.length === 0) return <Empty text={t('research.noActive')} />
  return (
    <div className="flex flex-col gap-2">
      {ideas.map(idea => {
        const pct =
          idea.stepCount === 0 ? 0 : (idea.stepsDone / idea.stepCount) * 100
        return (
          <button
            key={idea.id}
            type="button"
            onClick={() => openIdea(idea.id)}
            className="flex flex-col gap-1 rounded-md px-1.5 py-1 text-start hover:bg-accent/60"
          >
            <div className="flex items-center gap-2 text-sm">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: STATUS_COLOR[idea.status] }}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {idea.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('research.steps', {
                  done: idea.stepsDone,
                  total: idea.stepCount,
                })}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: STATUS_COLOR[idea.status],
                }}
              />
            </div>
            {idea.currentStep && (
              <span className="truncate text-xs text-muted-foreground">
                {idea.currentStep}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const KIND_ICON: Record<DeadlineKind, LucideIcon> = {
  Idea: LightbulbIcon,
  Project: FolderIcon,
  Task: SquareCheckIcon,
  Conference: CalendarClockIcon, // an idea's target conference
}

function DaysLeft({ days }: { days: number }) {
  const { t } = useTranslation()
  const text =
    days === 0
      ? t('research.dueToday')
      : days < 0
        ? t('research.overdue', { count: -days })
        : t('research.daysLeft', { count: days })
  return (
    <span
      className={cn(
        'shrink-0 text-xs',
        days < 0
          ? 'text-destructive'
          : days <= 7
            ? 'font-medium text-orange-500'
            : 'text-muted-foreground'
      )}
    >
      {text}
    </span>
  )
}

export function DeadlineList({ deadlines }: { deadlines: Deadline[] }) {
  const { t } = useTranslation()
  const openIdea = useUIStore(state => state.openIdea)
  const selectProject = useUIStore(state => state.selectProject)
  const selectTask = useUIStore(state => state.selectTask)
  if (deadlines.length === 0) return <Empty text={t('research.noDeadlines')} />
  const open = (d: Deadline) => {
    // A target conference's id is its idea's.
    if (d.kind === 'Idea' || d.kind === 'Conference') openIdea(d.id)
    else if (d.kind === 'Project') selectProject(d.id)
    else selectTask(d.id)
  }
  return (
    <div className="flex flex-col">
      {deadlines.map(d => (
        <Row
          key={`${d.kind}-${d.id}`}
          icon={KIND_ICON[d.kind]}
          onClick={() => open(d)}
        >
          <span className="min-w-0 flex-1 truncate">
            {d.title}
            {d.detail !== '' && (
              <span className="text-muted-foreground"> · {d.detail}</span>
            )}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {dateLabel(d.date)}
          </span>
          <DaysLeft days={d.daysLeft} />
        </Row>
      ))}
    </div>
  )
}

export function TodoList({
  todos,
  today,
}: {
  todos: OpenTodo[]
  today: string | undefined
}) {
  const { t } = useTranslation()
  const openIdea = useUIStore(state => state.openIdea)
  if (todos.length === 0) return <Empty text={t('research.noTodos')} />
  return (
    <div className="flex flex-col">
      {todos.map(todo => (
        <Row
          key={todo.id}
          icon={ListTodoIcon}
          onClick={() => openIdea(todo.ideaId)}
        >
          <span className="min-w-0 flex-1 truncate">
            {todo.title}
            <span className="text-muted-foreground"> · {todo.ideaTitle}</span>
          </span>
          {todo.dueDate && (
            <span
              className={cn(
                'shrink-0 text-xs',
                isOverdue(todo.dueDate, today)
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {dateLabel(todo.dueDate)}
            </span>
          )}
        </Row>
      ))}
    </div>
  )
}

export function ProblemList({ problems }: { problems: OpenProblem[] }) {
  const { t } = useTranslation()
  const openIdea = useUIStore(state => state.openIdea)
  if (problems.length === 0) return <Empty text={t('research.noProblems')} />
  return (
    <div className="flex flex-col">
      {problems.map(p => (
        <Row
          key={p.id}
          icon={AlertTriangleIcon}
          onClick={() => openIdea(p.ideaId)}
        >
          <span className="min-w-0 flex-1 truncate">
            {p.problem}
            <span className="text-muted-foreground"> · {p.ideaTitle}</span>
          </span>
        </Row>
      ))}
    </div>
  )
}
