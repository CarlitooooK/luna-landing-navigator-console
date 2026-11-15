// Qué hace cada `ActionId` de nextStep (tareas C2–C5). Las acciones llaman a las mismas funciones del store
// que los controles de la pantalla; las que llevan a un control, le dan el foco.
import { useMissionStore } from '@/core/store/useMissionStore'
import { useSaveRun } from '@/features/simulate/useSaveRun'
import { withViewTransition } from '@/ui/motion'
import type { ActionId } from './nextStep'
import { runSimulation } from '@/features/simulate/runSimulation'

/** Enfoca el primer elemento que exista. Reintenta unas veces por si React todavía no pintó el cambio de pantalla. */
export function focusLater(...selectors: string[]) {
  let tries = 0
  const attempt = () => {
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel)
      if (el) { el.focus(); return }
    }
    // Sin requestAnimationFrame: con el globo dibujando, los fotogramas pueden tardar cientos de milisegundos.
    // Hasta ~1.5 s: el cambio de pantalla con view transition no pinta el DOM nuevo hasta capturar la foto vieja.
    if (++tries < 50) setTimeout(attempt, 30)
  }
  setTimeout(attempt, 0)
}

const SITE_PICKER = ['[aria-label="Search landing sites"]', 'select[aria-label="Landing site"]']

export function useStepActions(): (id: ActionId) => void {
  const st = useMissionStore()
  const { save } = useSaveRun()
  return (id) => {
    switch (id) {
      case 'retry-init': void st.init(); break
      case 'focus-search': case 'change-site': case 'review-setup':
        if (st.workspace !== 'simulate') withViewTransition(() => st.setWorkspace('simulate'))
        focusLater(...SITE_PICKER); break
      case 'go-missions': withViewTransition(() => st.setWorkspace('missions')); break
      case 'run-again': case 'try-again': void runSimulation(); break
      case 'compare-dates': withViewTransition(() => { void st.compareDates() }); break
      case 'compare-sites': withViewTransition(() => st.compareSites()); focusLater('select[aria-label="Scenario site"]'); break
      case 'save': save(); break
      case 'shorten-mission': focusLater('[role="radiogroup"][aria-label="Mission length"] [aria-checked="true"]'); break
      case 'change-date': focusLater('input[type="date"]'); break
      case 'fix-coordinates': st.setDetail('detailed'); focusLater('input[aria-describedby][inputmode="decimal"]', '[role="radio"][aria-checked="true"]'); break
      case 'focus-scenario-site': focusLater('select[aria-label="Scenario site"]'); break
      case 'compare-again': void st.compare(); break
      case 'start-simulation': withViewTransition(() => st.setWorkspace('simulate')); focusLater(...SITE_PICKER); break
      case 'add-current': case 'add-plus-7': case 'open-in-simulate': case 'open-as-simulation':
        break // las resuelven Compare y Missions, que tienen el contexto (C3, C4)
    }
  }
}
