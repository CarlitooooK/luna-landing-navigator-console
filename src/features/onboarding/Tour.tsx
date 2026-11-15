// Tour de primera visita (spec de onboarding, design.md §1.4–§1.6, tarea D3).
// Un <dialog> modal del tamaño de la ventana: trae la trampa de foco, Esc, el resto de la página inerte y la capa
// superior (encima del iframe del globo). Dentro, un foco de luz sobre el ancla `data-tour` y la tarjeta del paso.
// Qué pasos tocan y con qué texto lo decide `resolveSteps()` (steps.ts); aquí solo se pinta y se mide.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useMissionStore } from '@/core/store/useMissionStore'
import { useGlobeStore } from '@/core/store/useGlobeStore'
import { useOnboardingStore } from '@/core/store/useOnboardingStore'
import { GLOBE_URL } from '@/core/config'
import { toSelected } from '@/core/utils/sites'
import { Button } from '@/ui'
import { prefersReducedMotion } from '@/ui/motion'
import { place, type Box } from '@/ui/place'
import { restoreFocus, startTour } from './startTour'
import { autoStart, resolveSteps, tourParam, tourScenario, type TourActionId, type TourInput } from './steps'

/** Los paneles entran con `condense` en unos 700 ms; antes de eso las anclas todavía se mueven. */
const PANELS_SETTLE_MS = 700
const PAD = 6
const CARD_W = 340
/** Duración del viaje del marco entre anclas (design.md §1.4). */
const FRAME_MS = 560

function useTourInput(): TourInput {
  const m = useMissionStore()
  const link = useGlobeStore((s) => s.link)
  return {
    selected: m.selected?.id ? { id: m.selected.id, label: m.selected.label } : m.selected ? { id: '', label: m.selected.label } : null,
    startUtc: m.startUtc, sites: m.sites, evaluated: !!m.evaluation, terrain: !!m.terrain, viewMode: m.viewMode, detail: m.detail,
    offline: !m.health && m.error?.code === 'ERR_NETWORK',
    // "Horizon view" y "Landing scene" solo aparecen con el globo listo (SceneControls).
    globe: !!GLOBE_URL && link === 'ready',
  }
}

/** Autoarranque: una vez, cuando `init()` terminó (bien o mal) y los paneles ya entraron. */
function useAutoStart() {
  const done = useMissionStore((s) => !!s.health || !!s.error)
  const fired = useRef(false)
  useEffect(() => {
    if (!done || fired.current) return
    fired.current = true
    const start = autoStart(useOnboardingStore.getState().tour.status, tourParam(window.location.search))
    if (start === null) return
    const t = window.setTimeout(() => startTour(start), PANELS_SETTLE_MS)
    return () => window.clearTimeout(t)
  }, [done])
}

/** Marco del foco de luz: el ancla con `PAD` de aire, sin salirse de la ventana (deja 4 px para el halo). */
function clipToViewport(r: Box) {
  const m = 4
  const top = Math.max(m, r.y - PAD), left = Math.max(m, r.x - PAD)
  const bottom = Math.min(window.innerHeight - m, r.y + r.height + PAD), right = Math.min(window.innerWidth - m, r.x + r.width + PAD)
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

/** Rectángulo del ancla, o `null` si no está o no mide nada (tarjeta centrada, sin foco de luz). */
function useAnchorRect(anchor: string | null, key: unknown): Box | null {
  const [rect, setRect] = useState<Box | null>(null)
  useEffect(() => {
    const measure = () => {
      const el = anchor ? document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`) : null
      const r = el?.getBoundingClientRect()
      setRect((prev) => {
        if (!r || r.width < 1 || r.height < 1) return null
        if (prev && prev.x === r.x && prev.y === r.y && prev.width === r.width && prev.height === r.height) return prev
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      })
    }
    measure()
    // Se vuelve a medir mientras los paneles terminan de entrar o de cambiar (view transition, resultados nuevos).
    const timers = [120, 360, PANELS_SETTLE_MS, 1400].map((ms) => window.setTimeout(measure, ms))
    const el = anchor ? document.querySelector(`[data-tour="${anchor}"]`) : null
    const ro = new ResizeObserver(measure)
    if (el) ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { timers.forEach(window.clearTimeout); ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [anchor, key])
  return rect
}

export function Tour() {
  useAutoStart()
  const step = useOnboardingStore((s) => s.step)
  // El foco vuelve al cerrarse el tour, no en la limpieza del diálogo: StrictMode la corre también al montar.
  const wasOpen = useRef(false)
  useEffect(() => {
    if (step !== null) { wasOpen.current = true; return }
    if (wasOpen.current) { wasOpen.current = false; restoreFocus() }
  }, [step])
  if (step === null) return null
  return <TourDialog index={step} />
}

function TourDialog({ index }: { index: number }) {
  const { go, dismiss, complete } = useOnboardingStore()
  const m = useMissionStore()
  const requestHorizon = useGlobeStore((s) => s.requestHorizon)
  const input = useTourInput()
  const steps = resolveSteps(input)
  const i = Math.min(index, steps.length - 1)
  const s = steps[i]
  const last = i === steps.length - 1
  const id = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const rect = useAnchorRect(s.anchor, `${i}:${!!m.evaluation}:${m.detail}`)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const reduced = prefersReducedMotion()

  // useLayoutEffect y antes del que coloca la tarjeta: con el <dialog> cerrado la tarjeta mide 0 × 0 y la
  // invitación (sin ancla, sin nada que la vuelva a medir) quedaba con la esquina en el centro de la pantalla.
  useLayoutEffect(() => {
    const d = dialog.current!
    if (!d.open) d.showModal()
    return () => d.close()
  }, [])
  // En cada paso el foco va al título, para que el lector de pantalla lea título y texto.
  useEffect(() => { title.current?.focus() }, [i])

  useLayoutEffect(() => {
    const c = card.current
    if (!c) return
    const vp = { width: window.innerWidth, height: window.innerHeight }
    const size = { width: c.offsetWidth, height: c.offsetHeight }
    if (!rect) { setPos({ top: Math.round((vp.height - size.height) / 2), left: Math.round((vp.width - size.width) / 2) }); return }
    const padded = { x: rect.x - PAD, y: rect.y - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    const p = place(padded, size, vp, { gap: 16, margin: 16, prefer: ['right', 'left', 'bottom', 'top'] })
    setPos({ top: p.top, left: p.left })
  }, [rect, i, s.text, s.note])

  const act = (a: TourActionId) => {
    switch (a) {
      case 'try-scenario': {
        const sc = tourScenario(m.sites, m.startUtc)
        const site = sc && m.sites.find((x) => x.id === sc.siteId)
        if (!sc || !site) return
        m.select(toSelected(site))
        m.setConfig({ startUtc: sc.startUtc, ...(sc.durationDays ? { durationDays: sc.durationDays } : {}) })
        return
      }
      case 'run': void m.evaluate(); return
      case 'play':
        if (!m.playing && m.evaluation && m.stepIndex >= m.evaluation.timeline.length - 1) m.setStep(0)
        m.setPlaying(!m.playing); return
      case 'horizon': requestHorizon(); return
      case 'toggle-detail': m.setDetail(m.detail === 'simple' ? 'detailed' : 'simple'); return
    }
  }
  const actionLabel = s.action?.id === 'play' && m.playing ? 'Pause' : s.action?.id === 'run' && m.loading ? 'Calculating…' : s.action?.label
  // El marco viaja de un ancla a otra. Sin ancla se encoge a un punto en el centro: el velo cubre todo y el halo se apaga.
  // Recortado a la ventana: un panel más alto que la pantalla (Results con scroll) no deja el contorno fuera de vista.
  const frame = rect ? clipToViewport(rect) : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 }
  const move = reduced ? 'none'
    : ['top', 'left', 'width', 'height', 'border-radius'].map((p) => `${p} ${FRAME_MS}ms var(--ease-out)`).join(', ')

  return (
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`}
      onCancel={(e) => { e.preventDefault(); dismiss() }}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-ink backdrop:bg-transparent">
      {/* Foco de luz: el ancla queda nítida y lo demás se atenúa (el velo es la sombra de 100vmax del marco).
          Un solo elemento siempre montado, para que el marco se desplace entre pasos en vez de aparecer y desaparecer.
          Con reduced motion salta de lugar y el halo solo se funde (design.md §1.4). */}
      <div aria-hidden className="pointer-events-none fixed"
        style={{ ...frame, borderRadius: rect ? 24 : 0, boxShadow: '0 0 0 100vmax rgb(4 6 10 / 0.6)', transition: move }}>
        <div key={reduced ? i : undefined} className="absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{ opacity: rect ? 1 : 0, animation: reduced ? 'fade-in 150ms both' : undefined }}>
          {/* Contorno iluminado que respira: anillo nítido y halo del color del Sol, el acento de la marca */}
          <div className="tour-breathe absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: '0 0 0 1.5px var(--color-sun), 0 0 14px 2px color-mix(in srgb, var(--color-sun) 55%, transparent), inset 0 0 12px color-mix(in srgb, var(--color-sun) 25%, transparent)' }} />
        </div>
      </div>
      <div ref={card} key={reduced ? undefined : i} style={{ width: CARD_W, top: pos?.top ?? -9999, left: pos?.left ?? -9999, transition: reduced ? 'opacity 150ms' : undefined }}
        className={`glass glass-strong fixed flex flex-col gap-3 rounded-[20px] p-[18px] ${reduced ? '' : 'condense'}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs text-ink-3">{s.id === 'intro' ? 'Welcome' : `Step ${i + 1} of ${steps.length}`}</span>
          <button type="button" onClick={dismiss} aria-label="Close the tour" className="grid size-6 place-items-center rounded-full text-ink-3 hover:text-ink">
            <X size={14} aria-hidden /></button>
        </div>
        <h2 ref={title} id={`${id}-title`} tabIndex={-1} className="text-base font-bold outline-none">{s.title}</h2>
        <p id={`${id}-text`} className="text-[13px] leading-[19px] text-ink-2">{s.text}</p>
        {s.note && <p role="note" className="rounded-xl bg-caution/10 px-3 py-2 text-xs text-ink-2 ring-1 ring-caution/40">{s.note}</p>}
        {s.id === 'intro' ? (
          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" className="h-9 px-3" onClick={() => go(i + 1)}>Take the tour</Button>
            <Button variant="ghost" className="h-9 px-2" onClick={dismiss}>Skip</Button>
          </div>
        ) : (<>
          {s.action && <Button className="h-9 self-start px-3" disabled={s.action.id === 'run' && m.loading} onClick={() => act(s.action!.id)}>{actionLabel}</Button>}
          <div className="flex items-center gap-2 pt-1">
            {i > 1 && <Button variant="secondary" className="h-9 px-3" onClick={() => go(i - 1)}>Back</Button>}
            <Button variant="primary" className="h-9 px-3" onClick={() => (last ? complete() : go(i + 1))}>{last ? 'Done' : 'Next'}</Button>
            <Button variant="ghost" className="ml-auto h-9 px-2" onClick={dismiss}>Skip tour</Button>
          </div>
        </>)}
      </div>
    </dialog>
  )
}
