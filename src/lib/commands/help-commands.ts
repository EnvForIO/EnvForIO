import { BugIcon, DownloadIcon, FolderOpenIcon } from 'lucide-react'
import type { AppCommand } from './types'
import { openLogFolder, reportProblem } from '@/lib/feedback'
import { checkForUpdates } from '@/lib/updates'

export const helpCommands: AppCommand[] = [
  {
    id: 'help-check-for-updates',
    labelKey: 'commands.checkForUpdates.label',
    descriptionKey: 'commands.checkForUpdates.description',
    icon: DownloadIcon,
    group: 'help',
    keywords: ['update', 'version', 'release', 'new'],
    execute: () => checkForUpdates(),
  },
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
