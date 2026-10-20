/**
 * Every task in one list, filtered by status (open / with deadline / done /
 * all) and by project. Rows open the details pane like everywhere else.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjects } from '@/api/projects'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ItemStatus } from '@/lib/tauri-bindings'
import { useItems } from '@/api/tasks'
import { TaskRow } from '@/pages/tasks/TaskRow'

const STATUSES: ItemStatus[] = ['Open', 'WithDeadline', 'Done', 'All']
const ANY = 'any'
const NONE = '0' // tasks outside projects

export function ItemsPage() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ItemStatus>('Open')
  const [project, setProject] = useState(ANY)
  const { data: projects = [] } = useProjects()
  const projectArg = project === ANY ? null : Number(project)
  const { data: tasks = [] } = useItems(status, projectArg)

  return (
    <div className="flex h-full flex-col gap-3 px-5 py-4">
      <h1 className="text-xl font-semibold">{t('items.title')}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map(s => (
          <Button
            key={s}
            size="sm"
            variant={s === status ? 'default' : 'outline'}
            onClick={() => setStatus(s)}
          >
            {t(`items.status.${s}`)}
          </Button>
        ))}
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="ml-auto w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('items.anyProject')}</SelectItem>
            <SelectItem value={NONE}>{t('items.noProject')}</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 pr-3">
          {tasks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('items.empty')}
            </p>
          )}
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} view="Tasks" />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
