import { BugIcon, FolderOpenIcon } from 'lucide-react'
import type { AppCommand } from './types'
import { openLogFolder, reportProblem } from '@/lib/feedback'

export const helpCommands: AppCommand[] = [
  {
    id: 'help-report-problem',
    labelKey: 'commands.reportProblem.label',
    descriptionKey: 'commands.reportProblem.description',
    icon: BugIcon,
    group: 'help',
    keywords: ['bug', 'issue', 'feedback', 'github'],
    execute: () => reportProblem(),
  },
  {
    id: 'help-open-log-folder',
    labelKey: 'commands.openLogFolder.label',
    descriptionKey: 'commands.openLogFolder.description',
    icon: FolderOpenIcon,
    group: 'help',
    keywords: ['log', 'logs', 'debug'],
    execute: () => openLogFolder(),
  },
]
