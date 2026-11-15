// Botón con burbuja que explica qué hace, al dejar el cursor encima 1 s (las píldoras de escena).
// Misma burbuja y misma colocación que el "?" (HelpTip), pero `popover="manual"`: pasar el cursor por una píldora no
// debe cerrar otro popover abierto, como el menú Help. Esc, el clic y salir del botón la cierran.
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type PointerEvent } from 'react'
import { place } from './place'

export const TIP_OPEN_MS = 1000
const TIP_CLOSE_MS = 120

export interface Tip { term: string; text: string }

export function TipButton({ tip, children, onPointerEnter, onPointerLeave, onPointerDown, onFocus, onBlur, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { tip: Tip }) {
  const own = useId()
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
  const show = () => { const el = bubble.current; if (el && !el.matches(':popover-open')) { el.showPopover(); position(); setOpen(true) } }
  const hide = () => { window.clearTimeout(timer.current); const el = bubble.current; if (el?.matches(':popover-open')) el.hidePopover(); setOpen(false) }
  const later = (fn: () => void, ms: number) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(fn, ms) }
  // Solo con ratón o lápiz: en pantallas táctiles el "hover" llega junto con el toque y la burbuja taparía la acción
  const byPointer = (e: PointerEvent) => e.pointerType === 'mouse' || e.pointerType === 'pen'

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button ref={button} type="button" aria-describedby={`${own}-sr`} {...rest}
        onPointerEnter={(e) => { onPointerEnter?.(e); if (byPointer(e)) later(show, TIP_OPEN_MS) }}
        onPointerLeave={(e) => { onPointerLeave?.(e); later(hide, TIP_CLOSE_MS) }}
        onPointerDown={(e) => { onPointerDown?.(e); hide() }}
        // Con teclado también, tras el mismo segundo; con el foco de un clic no (ya se cerró en pointerdown)
        onFocus={(e) => { onFocus?.(e); if (e.currentTarget.matches(':focus-visible')) later(show, TIP_OPEN_MS) }}
        onBlur={(e) => { onBlur?.(e); hide() }}>
        {children}
      </button>
      <span id={`${own}-sr`} className="sr-only">{tip.text}</span>
      {/* Se puede pasar el cursor a la burbuja sin que se cierre (WCAG 1.4.13) */}
      <div ref={bubble} popover="manual" role="tooltip" aria-hidden
        onPointerEnter={() => window.clearTimeout(timer.current)} onPointerLeave={() => later(hide, TIP_CLOSE_MS)}
        className="glass glass-strong drip fixed m-0 w-[260px] rounded-2xl p-3 text-left text-xs leading-[18px] font-normal text-ink-2 [inset:auto]">
        <p><span className="font-bold text-ink">{tip.term}. </span>{tip.text}</p>
      </div>
    </>
  )
}
