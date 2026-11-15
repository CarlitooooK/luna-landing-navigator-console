// Botón Help de la barra superior y de la de pantalla completa (spec de onboarding, design.md §2.6, tarea D1).
// Abre un popover con el glosario (el mismo texto de los "?") y los atajos. La tecla "?" lo abre desde ConsoleShell.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'
import { Kbd } from '@/ui'
import { place } from '@/ui/place'
import { glossaryGroups } from './glossary'
import { SHORTCUTS } from './shortcuts'

const BUTTON = '[data-help-button]'

/** Abre o cierra el menú Help que esté montado (solo hay uno: TopBar o FullscreenBar). */
export function toggleHelp() {
  document.querySelector<HTMLButtonElement>(BUTTON)?.click()
}

/** `compact`: solo ícono y tecla, para la barra de pantalla completa, que no tiene ancho para el texto. */
export function HelpMenu({ children, compact }: { children?: ReactNode; compact?: boolean }) {
  const id = useId()
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const el = menu.current
    if (!el) return
    const onToggle = (e: Event) => {
      const isOpen = (e as ToggleEvent).newState === 'open'
      setOpen(isOpen)
      if (!isOpen) return
      const r = button.current!.getBoundingClientRect()
      const p = place({ x: r.x, y: r.y, width: r.width, height: r.height }, { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight }, { prefer: ['bottom', 'left'] })
      el.style.top = `${p.top}px`
      el.style.left = `${p.left}px`
      // El foco entra al menú para que Tab recorra el glosario; Esc lo cierra (popover="auto").
      el.focus()
    }
    el.addEventListener('toggle', onToggle)
    return () => el.removeEventListener('toggle', onToggle)
  }, [])

  return (
    <>
      <button ref={button} data-help-button type="button" popoverTarget={`${id}-menu`} aria-expanded={open}
        aria-label={compact ? 'Help' : undefined} title={compact ? 'Help (?)' : undefined}
        className="raised inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-[13px] font-bold whitespace-nowrap">
        <CircleHelp size={15} aria-hidden />{!compact && 'Help'}<Kbd>?</Kbd>
      </button>
      <div ref={menu} id={`${id}-menu`} popover="auto" tabIndex={-1} role="dialog" aria-labelledby={`${id}-title`}
        className="glass glass-strong drip fixed m-0 max-h-[min(560px,calc(100vh-96px))] w-[360px] overflow-y-auto rounded-[20px] p-4 text-left outline-none [inset:auto]">
        {/* Sin `flex` en el popover: una clase display le gana al `display: none` del navegador y se vería cerrado */}
        <div className="flex flex-col gap-4">
        <h2 id={`${id}-title`} className="sr-only">Help</h2>
        {children}
        <section aria-labelledby={`${id}-glossary`} className="flex flex-col gap-2">
          <h3 id={`${id}-glossary`} className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">Glossary</h3>
          {glossaryGroups().map((g) => (
            <details key={g.group} className="group rounded-xl ring-1 ring-white/10 open:bg-white/3">
              <summary className="cursor-pointer px-3 py-2 text-[13px] font-bold">{g.group}</summary>
              <dl className="flex flex-col gap-2 px-3 pb-3">
                {g.entries.map((e) => (
                  <div key={e.id}><dt className="text-xs font-bold text-ink">{e.term}</dt>
                    <dd className="text-xs leading-[18px] text-ink-2">{e.text}</dd></div>
                ))}
              </dl>
            </details>
          ))}
        </section>
        <section aria-labelledby={`${id}-keys`} className="flex flex-col gap-2">
          <h3 id={`${id}-keys`} className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">Shortcuts</h3>
          <dl className="flex flex-col gap-1.5">
            {SHORTCUTS.map((s) => (
              <div key={s.what} className="flex items-center justify-between gap-3 text-xs">
                <dt className="text-ink-2">{s.what}{s.scope && <span className="text-ink-3"> ({s.scope})</span>}</dt>
                <dd className="flex shrink-0 gap-1">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</dd>
              </div>
            ))}
          </dl>
        </section>
        </div>
      </div>
    </>
  )
}
