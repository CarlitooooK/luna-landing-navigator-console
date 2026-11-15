import { ChevronRight, Maximize, Minimize, MapPin } from 'lucide-react'
import { GLIDER, useGlider, withViewTransition } from '@/ui/motion'
import { useMissionStore } from '@/core/store/useMissionStore'
import { API_BASE } from '@/core/api/client'
import { Dot, Kbd, Segmented } from '@/ui'
import { Logo } from './Rail'
import { WORKSPACES } from './workspaces'
import { ConnectionStatus } from './ConnectionStatus'

/** Origen de datos visible siempre (principio 5 de PRODUCT.md: datos honestos). */
export function DataSource() {
  const health = useMissionStore((s) => s.health)
  const error = useMissionStore((s) => s.error)
  const offline = error?.code === 'ERR_NETWORK' || (!health && !!error)
  const [label, signal] = offline ? ['Offline', 'nogo'] as const : !health ? ['Connecting', 'ink'] as const
    : health.status === 'ok' ? ['Live data', 'go'] as const : ['Degraded', 'caution'] as const
  return (
    <span title={API_BASE} className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-ink-2 ring-1 ring-white/15">
      <Dot signal={signal} />{label}
    </span>
  )
}

function DetailToggle() {
  const detail = useMissionStore((s) => s.detail)
  const setDetail = useMissionStore((s) => s.setDetail)
  return <Segmented label="Detail level" value={detail} onChange={(v) => withViewTransition(() => setDetail(v))}
    options={[{ value: 'simple', label: 'Simple' }, { value: 'detailed', label: 'Detailed' }]} className="w-[180px]" />
}

function FullscreenButton() {
  const fullscreen = useMissionStore((s) => s.fullscreen)
  const toggle = useMissionStore((s) => s.toggleFullscreen)
  const Icon = fullscreen ? Minimize : Maximize
  return (
    <button onClick={() => withViewTransition(toggle)} className="raised inline-flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] font-bold">
      <Icon size={15} aria-hidden />{fullscreen ? 'Exit full screen' : 'Full screen'}<Kbd>F</Kbd>
    </button>
  )
}

function Context() {
  const workspace = useMissionStore((s) => s.workspace)
  const selected = useMissionStore((s) => s.selected)
  const name = WORKSPACES.find((w) => w.id === workspace)?.label
  return (
    <div className="flex min-w-0 items-center gap-2">
      <h1 className="text-[15px] font-bold">{name}</h1>
      {selected && workspace !== 'history' && <>
        <ChevronRight size={15} className="text-ink-3" aria-hidden />
        <span className="truncate text-[15px] font-medium text-ink-2">{selected.label}</span>
        {selected.category && <span className="truncate text-[13px] text-ink-3">{selected.category}</span>}
      </>}
    </div>
  )
}

export function TopBar() {
  const workspace = useMissionStore((s) => s.workspace)
  return (
    <header className="glass condense pointer-events-auto relative z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-[18px] pr-2.5 pl-5 [view-transition-name:vt-top]">
      <div className="flex min-w-0 items-center justify-between gap-3"><Context /><ConnectionStatus /></div>
      {workspace !== 'history' ? <DetailToggle /> : <span />}
      <div className="flex items-center justify-end gap-2.5"><DataSource /><FullscreenButton /></div>
    </header>
  )
}

/** Barra flotante de pantalla completa: marca + sitio, navegación y salida (Figma C7). */
export function FullscreenBar() {
  const workspace = useMissionStore((s) => s.workspace)
  const setWorkspace = useMissionStore((s) => s.setWorkspace)
  const selected = useMissionStore((s) => s.selected)
  const { box, glider, style } = useGlider<HTMLElement>(workspace)
  return (
    <div className="fs-bar relative z-20 grid grid-cols-[1fr_auto_1fr] items-start gap-3 [view-transition-name:vt-fsbar]">
      <div className="flex min-w-0 items-center gap-2 justify-self-start">
      <div className="fs-dim glass pointer-events-auto inline-flex h-11 items-center gap-3 justify-self-start rounded-full pr-4 pl-3.5">
        <Logo size={22} /><span className="text-[15px] font-bold">Lunar Navigator</span>
        {selected && <><span className="h-[18px] w-px bg-line" /><MapPin size={15} className="text-ink-2" aria-hidden />
          <span className="truncate text-[15px] font-medium">{selected.label}</span></>}
      </div>
      <ConnectionStatus />
      </div>
      <nav ref={box} aria-label="Workspaces" className="fs-dim glass pointer-events-auto relative flex gap-0.5 rounded-full p-[5px]">
        <span ref={glider} aria-hidden className={`${GLIDER} rounded-full`} style={style} />
        {WORKSPACES.map(({ id, label, icon: Icon }) => {
          const on = id === workspace
          return (
            <button key={id} onClick={() => withViewTransition(() => setWorkspace(id))} aria-current={on ? 'page' : undefined} data-active={on}
              className={`relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-[color,scale] duration-200 active:scale-95 ${on ? 'font-bold text-ink' : 'font-medium text-ink-2 hover:text-ink'}`}>
              <Icon size={15} aria-hidden />{label}
            </button>
          )
        })}
      </nav>
      {/* Simple/Detailed y el origen de datos también en pantalla completa: es el modo de la demo y el video (tarea A6) */}
      <div className="fs-dim glass pointer-events-auto flex items-center gap-2 justify-self-end rounded-full p-1 pl-1.5">
        {workspace !== 'history' && <DetailToggle />}<DataSource /><FullscreenButton />
      </div>
    </div>
  )
}
