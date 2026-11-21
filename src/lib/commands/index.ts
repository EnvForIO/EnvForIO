// Command system exports
export * from './registry'
export * from '../../hooks/use-command-context'
import { helpCommands } from './help-commands'
import { navigationCommands } from './navigation-commands'
import { windowCommands } from './window-commands'
import { registerCommands } from './registry'

/**
 * Initialize the command system by registering all commands.
 * This should be called once during app initialization.
 */
export function initializeCommandSystem(): void {
  registerCommands(navigationCommands)
  registerCommands(windowCommands)
  registerCommands(helpCommands)

  if (import.meta.env.DEV) {
    console.log('Command system initialized')
  }
}

export { helpCommands, navigationCommands, windowCommands }
