/**
 * Lets the frontend run in a plain browser during development (`npm run
 * dev` opened at localhost:1420), so design checks that drive a headless
 * browser can see real screens. Outside Tauri there is no backend: every
 * command is answered from `fixture.local.json` (answers recorded from a
 * running EnvIO; git-ignored, as it holds the owner's own data), matched
 * on the command and its arguments, else the command's first answer.
 * Writes answer nothing. Never part of a production build.
 */
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'

type Fixture = Record<string, Record<string, unknown>>

const files = import.meta.glob<Fixture>('./fixture.local.json', {
  eager: true,
  import: 'default',
})
const fixture: Fixture = Object.values(files)[0] ?? {}

function answer(cmd: string, args: unknown): unknown {
  if (cmd.startsWith('plugin:event|listen')) return 1 // an event id
  const byArgs = fixture[cmd]
  // Not recorded: an empty list for list commands, nothing for the rest.
  if (!byArgs) return cmd.startsWith('list_') ? [] : null
  const key = JSON.stringify(args ?? {})
  const found = key in byArgs ? byArgs[key] : Object.values(byArgs)[0]
  if (found && typeof found === 'object' && '__error' in found) {
    throw (found as { __error: unknown }).__error
  }
  return found ?? null
}

export function installBrowserMock(): void {
  mockWindows('main')
  mockIPC((cmd, args) => answer(cmd, args), { shouldMockEvents: true })
  console.info(
    `EnvIO browser preview: ${Object.keys(fixture).length} commands answered from fixture.local.json`
  )
}
