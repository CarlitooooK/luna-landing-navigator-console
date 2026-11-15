// Ayuda "?" junto a un campo o una métrica (spec de onboarding, design.md §2.1, tarea B3).
// La burbuja usa el atributo `popover`: vive en la capa superior, así que no la recortan los paneles con overflow
// ni las tiras de pantalla completa, y el navegador ya resuelve Esc y el clic fuera (popover="auto").
import { useContext, useEffect, useId, useRef, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { FieldContext } from './field'
import { place } from './place'

const HOVER_OPEN_MS = 150
const HOVER_CLOSE_MS = 120
const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

export function HelpTip({ term, text, tryText, className }: { term: string; text: string; tryText?: string; className?: string }) {
  const field = useContext(FieldContext)
  const own = useId()
  const bubbleId = `${own}-bubble`
  // Dentro de un Field, el texto oculto lleva el id que el Input ya tiene en aria-describedby.
  const srId = field?.helpId ?? `${own}-sr`
  const button = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)

  const position = () => {
    const b = button.current, el = bubble.current
    if (!b || !el) return
    const r = b.getBoundingClientRect()
    const p = place({ x: r.x, y: r.y, width: r.width, height: r.height }, { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight })
    el.style.top = `${p.top}px`
    el.style.left = `${p.left}px`
  }
  const show = () => { window.clearTimeout(timer.current); const el = bubble.current; if (el && !el.matches(':popover-open')) { el.showPopover(); position() } }
  const hide = () => { window.clearTimeout(timer.current); const el = bubble.current; if (el?.matches(':popover-open')) el.hidePopover() }
  const later = (fn: () => void, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(fn, ms) }

  useEffect(() => {
    const el = bubble.current
    if (!el) return
    const onToggle = (e: Event) => setOpen((e as ToggleEvent).newState === 'open')
    el.addEventListener('toggle', onToggle)
    return () => { el.removeEventListener('toggle', onToggle); window.clearTimeout(timer.current) }
  }, [])

  const hover = { onPointerEnter: () => { if (finePointer()) later(show, HOVER_OPEN_MS) }, onPointerLeave: () => { if (finePointer()) later(hide, HOVER_CLOSE_MS) } }
  return (
    <>
      <button ref={button} type="button" aria-label={`About ${term}`} aria-expanded={open} aria-controls={bubbleId}
        onClick={() => (open ? hide() : show())} onBlur={(e) => { if (!bubble.current?.contains(e.relatedTarget as Node | null)) hide() }} {...hover}
        className={`grid size-6 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-200 hover:text-ink focus-visible:text-ink ${className ?? ''}`}>
        <CircleHelp size={13} aria-hidden />
      </button>
      <span id={srId} className="sr-only">{`${text}${tryText ? ` Try: ${tryText}` : ''}`}</span>
      {/* El popover hereda del DOM aunque se pinte en la capa superior: dentro de un control con whitespace-nowrap
          (Live data) el texto salía en una sola línea y se cortaba. whitespace-normal lo vuelve a partir. */}
      <div ref={bubble} id={bubbleId} popover="auto" role="status" {...hover}
        className="glass glass-strong drip fixed m-0 w-[260px] rounded-2xl p-3 text-left text-xs leading-[18px] font-normal whitespace-normal text-ink-2 [inset:auto]">
        <p><span className="font-bold text-ink">{term}. </span>{text}</p>
        {tryText && <p className="mt-1.5 text-ink"><span className="font-bold">Try: </span>{tryText}</p>}
      </div>
    </>
  )
}
