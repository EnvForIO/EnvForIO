/**
 * Exports (CSV, ICS) and saving the year-review card as PNG. Each asks where
 * to save with the system dialog, then Rust writes the file. Returns false
 * when the user cancels the dialog.
 */
import { useQuery } from '@tanstack/react-query'
import { save } from '@tauri-apps/plugin-dialog'
import { toPng } from 'html-to-image'
import { commands, unwrapResult, type ExportScope } from '@/lib/tauri-bindings'

export function useExport(scope: ExportScope, enabled: boolean) {
  return useQuery({
    queryKey: ['tasks', 'export', scope] as const,
    queryFn: async () => unwrapResult(await commands.getExport(scope)),
    enabled,
  })
}

/** A file name from the export title: "2026-11-16 – 2026-11-22" -> "envforio-2026-11-16-2026-11-22". */
const fileName = (title: string, ext: string) =>
  `envforio-${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}.${ext}`

async function ask(title: string, ext: string, label: string) {
  return save({
    defaultPath: fileName(title, ext),
    filters: [{ name: label, extensions: [ext] }],
  })
}

export async function exportCsv(scope: ExportScope, title: string) {
  const path = await ask(title, 'csv', 'CSV')
  if (!path) return false
  unwrapResult(await commands.exportCsv(scope, path))
  return true
}

export async function exportIcs(scope: ExportScope, title: string) {
  const path = await ask(title, 'ics', 'iCalendar')
  if (!path) return false
  unwrapResult(await commands.exportIcs(scope, path))
  return true
}

/** Render a DOM node to PNG and save it (the year-review share card). */
export async function exportPng(node: HTMLElement, title: string) {
  const path = await ask(title, 'png', 'PNG')
  if (!path) return false
  const dataUrl = await toPng(node, { pixelRatio: 2 })
  const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer())
  unwrapResult(await commands.saveImage(path, Array.from(bytes)))
  return true
}
