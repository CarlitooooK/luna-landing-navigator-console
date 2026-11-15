// Bloque "Next step" (spec de onboarding, design.md §3.1, tareas C2–C5): una sola sugerencia por pantalla,
// siempre en el mismo lugar, con una acción como máximo y otra secundaria opcional.
import { ArrowRight, Compass } from 'lucide-react'
import { Button, IconWell, type Signal } from '@/ui'
import type { ActionId, NextStep } from './nextStep'

export function NextStepBlock({ step, onAction, primary = true, announce }: {
  step: NextStep
  onAction: (id: ActionId) => void
  /** Si la acción toma la tecla luminosa de la pantalla. */
  primary?: boolean
  /** Texto para el lector de pantalla cuando cambia el resultado, p. ej. "NO-GO. Next step: …". */
  announce?: string
}) {
  const signal: Signal = step.tone
  return (<>
    {/* La región aria-live queda fuera del bloque con key: si se volviera a montar, el lector de pantalla podría no anunciarla */}
    {announce !== undefined && <span role="status" aria-live="polite" className="sr-only">{announce}</span>}
    {/* `key` cambia con el caso: el bloque vuelve a encenderse (ignite) una vez al aparecer una sugerencia nueva */}
    <div key={step.id} className="raised ignite flex items-start gap-3 rounded-[14px] p-3 ring-1 ring-white/10">
      <IconWell icon={Compass} signal={signal} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-ink-3">Next step</span>
          <p className="text-[13px] leading-[19px] text-ink">{step.text}</p>
          {step.code && <span className="tnum font-mono text-[11px] text-ink-3">{step.code}</span>}
        </div>
        {(step.action || step.secondary) && (
          <div className="flex flex-wrap items-center gap-2">
            {step.action && <Button variant={primary ? 'primary' : 'secondary'} className="h-9 px-3" onClick={() => onAction(step.action!.id)}>
              {step.action.label}<ArrowRight size={14} aria-hidden /></Button>}
            {step.secondary && <Button variant="ghost" className="h-9 px-2" onClick={() => onAction(step.secondary!.id)}>{step.secondary.label}</Button>}
          </div>
        )}
      </div>
    </div>
  </>)
}
