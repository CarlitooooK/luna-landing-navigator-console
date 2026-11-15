// Atajos de teclado de la consola (spec de onboarding, design.md §2.6, tarea D1).
// Una sola fuente: el panel Help los lista y `hotkeyFor` decide los globales, así no se anuncia un atajo que no existe.

export type Hotkey = 'fullscreen' | 'help'

/**
 * Qué atajo global toca para una tecla. Nada dentro de un campo de texto (escribir "f" no debe abrir la pantalla
 * completa) ni con un `<dialog>` abierto, como el tour (design.md §1.5).
 */
export function hotkeyFor(e: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean },
  ctx: { inField: boolean; dialogOpen: boolean }): Hotkey | null {
  if (e.metaKey || e.ctrlKey || e.altKey || ctx.inField || ctx.dialogOpen) return null
  if (e.key.toLowerCase() === 'f') return 'fullscreen'
  if (e.key === '?') return 'help'
  return null
}

export interface Shortcut { keys: string[]; what: string; scope?: string }

/** Los atajos del panel Help. Los del timeline los resuelve `sliderStep` con el scrubber enfocado. */
export const SHORTCUTS: Shortcut[] = [
  { keys: ['F'], what: 'Full screen' },
  { keys: ['?'], what: 'Help' },
  { keys: ['←', '→'], what: 'Move the timeline one step', scope: 'timeline focused' },
  { keys: ['PgUp', 'PgDn'], what: 'Move the timeline one day', scope: 'timeline focused' },
  { keys: ['Esc'], what: 'Close a popup or the tour' },
]
