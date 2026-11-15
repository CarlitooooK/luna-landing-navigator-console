// Abrir el tour desde cualquier lado (autoarranque, Help) y recordar a dónde vuelve el foco (design.md §1.5).
import { useMissionStore } from '@/core/store/useMissionStore'
import { useOnboardingStore } from '@/core/store/useOnboardingStore'
import { HELP_BUTTON } from '@/features/help/toggleHelp'

let returnFocus: HTMLElement | null = null

/** Abre el tour en `step`. Pasa a Simulate y sale de pantalla completa: plegados, los paneles medirían 52 px (§1.6). */
export function startTour(step: number, returnTo?: HTMLElement | null) {
  returnFocus = returnTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const m = useMissionStore.getState()
  if (m.workspace !== 'simulate') m.setWorkspace('simulate')
  if (m.fullscreen) m.toggleFullscreen()
  useOnboardingStore.getState().open(step)
}

/**
 * Al cerrar el tour: devuelve el foco a donde estaba. Si se lanzó desde Help en pantalla completa, ese botón ya no
 * existe (el tour sale de pantalla completa): el foco va al botón Help que esté montado ahora.
 */
export function restoreFocus() {
  const fromHelp = returnFocus?.matches(HELP_BUTTON)
  if (returnFocus?.isConnected) returnFocus.focus()
  else if (fromHelp) document.querySelector<HTMLElement>(HELP_BUTTON)?.focus()
  returnFocus = null
}
