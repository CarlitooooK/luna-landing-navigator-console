import { useEffect, type ReactNode } from 'react'
import { useLiquidLight, withViewTransition } from '@/ui/motion'
import { useMissionStore } from '@/core/store/useMissionStore'
import { SceneBackground } from '@/features/viewport3d/SceneBackground'
import { Rail } from './Rail'
import { FullscreenBar, TopBar } from './TopBar'
import { hotkeyFor } from '@/features/help/shortcuts'
import { toggleHelp } from '@/features/help/toggleHelp'
import { Tour } from '@/features/onboarding/Tour'

export interface WorkspaceSlots { left?: ReactNode; right?: ReactNode; top?: ReactNode; bottom?: ReactNode; overlay?: ReactNode; leftWidth?: number }

/** Franja inferior libre para los créditos NASA/Cesium del globo (handoff docs/11 §2, ≈32 px). */
export const ATTRIBUTION_STRIP = 32

/** `F` pantalla completa y `?` Help, fuera de los campos y sin un `<dialog>` abierto (tareas D1 y D3). */
function useHotkeys() {
  const toggle = useMissionStore((s) => s.toggleFullscreen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      const key = hotkeyFor(e, { inField: !!t.closest?.('input, textarea, select, [contenteditable="true"]'), dialogOpen: !!document.querySelector('dialog[open]') })
      if (!key) return
      e.preventDefault()
      if (key === 'fullscreen') withViewTransition(toggle)
      else toggleHelp()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])
}

function Attribution() {
  const viewMode = useMissionStore((s) => s.viewMode)
  // En vista global el globo pinta sus propios créditos en esta franja; en la escena local los ponemos nosotros.
  if (viewMode === 'globe') return null
  return (
    <p className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-ink-3">
      Terrain and ephemeris: Lunar Navigator API · source data: LRO LOLA DEM, JPL DE ephemerides
    </p>
  )
}

/**
 * Cascarón de la consola: el render es el fondo y todo lo demás flota encima.
 * El contenedor del overlay no captura el puntero (arrastrar el espacio libre mueve el render);
 * cada panel lo reactiva con `pointer-events-auto`.
 * En pantalla completa los huecos `.peek` muestran solo la cabecera de cada panel y lo despliegan
 * al pasar el puntero o al entrar con teclado (index.css, "Pantalla completa").
 */
export function ConsoleShell({ slots }: { slots: WorkspaceSlots }) {
  useHotkeys()
  useLiquidLight()
  const fullscreen = useMissionStore((s) => s.fullscreen)
  return (
    <>
      <SceneBackground />
      <div data-fullscreen={fullscreen || undefined} className="pointer-events-none fixed inset-0 z-10 flex gap-4 p-4" style={{ paddingBottom: ATTRIBUTION_STRIP + 8 }}>
        {!fullscreen && <Rail />}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {fullscreen ? <FullscreenBar /> : <TopBar />}
          <div className="relative flex min-h-0 flex-1 gap-4">
            {slots.left && <div className="peek flex shrink-0 flex-col gap-3 overflow-y-auto [--from-x:calc(var(--drift)*-1)] [view-transition-name:vt-left]" style={{ width: slots.leftWidth ?? 300 }}>{slots.left}</div>}
            <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-4">
              {/* self-start: el ancla del tour mide solo las píldoras, no todo el ancho */}
              <div data-tour="scene" className="flex flex-wrap items-start gap-2 self-start">{slots.top}</div>
              {/* items-end: al desplegarse en pantalla completa el timeline crece hacia arriba desde el borde inferior.
                  Sin esto quedaba pegado arriba del hueco y, mientras animaba su alto, el borde inferior subía, dejaba
                  el cursor fuera y se plegaba otra vez (abrir y cerrar en bucle) */}
              <div className="peek flex items-end justify-center [view-transition-name:vt-dock]">{slots.bottom}</div>
            </div>
            {slots.right && <div className="peek flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto [--from-x:var(--drift)] [view-transition-name:vt-right]">{slots.right}</div>}
            {slots.overlay && <div className="peek contents">{slots.overlay}</div>}
          </div>
        </div>
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10" style={{ height: ATTRIBUTION_STRIP }}><Attribution /></div>
      <Tour />
    </>
  )
}
