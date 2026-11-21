# Commands

The actions shown in the command palette (Ctrl+K). Each file exports an `AppCommand[]` (`types.ts`): navigation, window and help commands. `index.ts` registers them; `registry.ts` stores and runs them.

How to add one, and how commands relate to shortcuts and menus: [docs/developer/command-system.md](../../../docs/developer/command-system.md).
