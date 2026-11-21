/**
 * The look of the app's right-click menus, shared by the task, project and
 * other menus (`context-menu.tsx`) and the text edit menu (`edit-menu.tsx`).
 */
export const menuSurfaceClass =
  'bg-popover/95 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 min-w-48 overflow-x-hidden overflow-y-auto rounded-xl border border-border/70 p-1.5 shadow-[0_10px_30px_-8px_rgb(0_0_0/0.22),0_2px_6px_-2px_rgb(0_0_0/0.12)] backdrop-blur-md'

export const menuItemClass =
  "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:[&_svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex h-8 cursor-default items-center gap-2.5 rounded-md px-2.5 text-[13px] outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

export const menuSeparatorClass = 'bg-border/70 mx-1 my-1.5 h-px'
