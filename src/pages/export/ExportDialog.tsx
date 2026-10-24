/**
 * Export a week, month or project: a preview of the list, and buttons for a
 * spreadsheet (CSV) and a calendar file (ICS).
 */
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { exportCsv, exportIcs, useExport } from '@/api/export'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMinutes } from '@/lib/duration'
import type { ExportScope } from '@/lib/tauri-bindings'
import { cn } from '@/lib/utils'

interface Props {
  scope: ExportScope
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExportDialog({ scope, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { data } = useExport(scope, open)

  const run = async (make: () => Promise<boolean>) => {
    try {
      if (await make()) toast(t('export.saved'))
    } catch (error) {
      toast.error(t('export.failed'), { description: String(error) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
        </DialogHeader>
        {data && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void run(() => exportCsv(scope, data.title))}
              >
                {t('export.csv')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void run(() => exportIcs(scope, data.title))}
              >
                {t('export.ics')}
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <div className="p-4 text-sm text-foreground">
                <h2 className="mb-2 text-base font-semibold">{data.title}</h2>
                {data.rows.length === 0 && (
                  <p className="text-muted-foreground">{t('export.empty')}</p>
                )}
                <table className="w-full border-collapse">
                  <tbody>
                    {data.rows.map(row => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-1 pr-3 whitespace-nowrap text-muted-foreground">
                          {row.date ?? ''} {row.startTime ?? ''}
                        </td>
                        <td
                          className={cn(
                            'py-1 pr-3',
                            row.done && 'text-muted-foreground line-through'
                          )}
                        >
                          {row.title}
                        </td>
                        <td className="py-1 pr-3 text-muted-foreground">
                          {row.project ?? ''}
                        </td>
                        <td className="py-1 text-right whitespace-nowrap text-muted-foreground">
                          {row.estimateMinutes !== null
                            ? formatMinutes(row.estimateMinutes)
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
