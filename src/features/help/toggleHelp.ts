/** Selector del botón Help montado (solo hay uno: TopBar o FullscreenBar). */
export const HELP_BUTTON = '[data-help-button]'

/** Abre o cierra el menú Help, como si se pulsara su botón. Lo usa la tecla "?" (ConsoleShell). */
export function toggleHelp() {
  document.querySelector<HTMLButtonElement>(HELP_BUTTON)?.click()
}
