// Primitivas de la interfaz (Figma: Glass/Panel, Glass/Raised, Glass/Inset, Button/Primary, Glow/*).
import { useContext, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, Check, X, type LucideIcon } from 'lucide-react'
import type { MissionStatus } from '@/types'
import { SIGNAL, type Signal } from './signal'
import { GLIDER, useGlider } from './motion'
import { FieldContext } from './field'
import { TipButton, type Tip } from './TipButton'

export { SIGNAL, type Signal }
export { Flow } from './Flow'
export { HelpTip } from './HelpTip'
export { TipButton, TIP_OPEN_MS, type Tip } from './TipButton'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')


/**
 * Panel de vidrio. En pantalla completa se pliega en una tira con `peek` (título; por defecto el
 * título o el label) y `peekAside` (resumen corto). `peek="inline"`: sin tira, se ve su primera fila.
 */
export function Panel({ title, aside, children, className, as: Tag = 'section', label, peek, peekAside, tour }: {
  title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; as?: 'section' | 'aside' | 'div'; label?: string
  peek?: string | 'inline'; peekAside?: ReactNode
  /** Ancla del tour (`data-tour`). */
  tour?: string
}) {
  const strip = peek === 'inline' ? null : (peek ?? (typeof title === 'string' ? title : label))
  return (
    <Tag aria-label={label} data-tour={tour} data-peek={peek === 'inline' ? 'inline' : undefined}
      className={cx('glass condense surface-in pointer-events-auto flex flex-col gap-4 rounded-[20px] p-[18px]', className)}>
      {strip && (
        <div className="peek-head" aria-hidden>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{strip}</span>
          {peekAside && <span className="flex min-w-0 shrink items-center justify-end gap-2 text-xs text-ink-2">
            {typeof peekAside === 'string' ? <span className="truncate">{peekAside}</span> : peekAside}</span>}
        </div>
      )}
      {(title || aside) && (
        <header className="flex items-center justify-between gap-3">
          {typeof title === 'string' ? <h2 className="text-base font-bold">{title}</h2> : title}
          {aside}
        </header>
      )}
      {children}
    </Tag>
  )
}

export const Divider = () => <hr className="h-px w-full border-0 bg-hairline" />

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-bold text-ink-2">{children}</h3>
      {aside}
    </div>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange, label, size = 'md', className }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; size?: 'sm' | 'md'; className?: string
}) {
  const { box, glider, style } = useGlider(value)
  return (
    <div ref={box} role="radiogroup" aria-label={label} className={cx('inset-well relative flex gap-0.5 rounded-xl p-[3px]', className)}>
      <span ref={glider} aria-hidden className={cx(GLIDER, 'rounded-[9px]')} style={style} />
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={String(o.value)} role="radio" aria-checked={on} data-active={on} onClick={() => onChange(o.value)}
            className={cx('relative flex-1 rounded-[9px] px-3 whitespace-nowrap transition-[color,scale] duration-200 active:scale-95',
              size === 'sm' ? 'h-7 text-xs' : 'h-8 text-[13px]',
              on ? 'font-bold text-ink' : 'font-medium text-ink-2 hover:text-ink')}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Etiqueta, control y texto de ayuda o error. Es un `<div>` y no un `<label>` que envuelve:
 * así un clic en el texto no activa el primer botón de un `Segmented`, y cabe un botón "?" (`help`) junto a la etiqueta.
 * El `Input` de dentro toma el id del contexto; un `Segmented` conserva su propio `aria-label`.
 */
export function Field({ label, children, hint, error, help, className }: {
  label: string; children: ReactNode; hint?: string; error?: string; help?: ReactNode; className?: string
}) {
  const id = useId()
  const note = error || hint ? `${id}-note` : undefined
  const helpId = help ? `${id}-help` : undefined
  const describedBy = [note, helpId].filter(Boolean).join(' ') || undefined
  return (
    <FieldContext.Provider value={{ id, describedBy, helpId }}>
      <div className={cx('flex min-w-0 flex-col gap-1.5', className)}>
        <span className="flex items-center gap-1">
          <label htmlFor={id} className={cx('text-xs font-medium', error ? 'text-nogo' : 'text-ink-3')}>{label}</label>{help}
        </span>
        {children}
        {error ? <span id={note} className="flex gap-2 text-xs text-ink"><AlertTriangle size={14} className="mt-px shrink-0 text-nogo" />{error}</span>
          : hint && <span id={note} className="text-xs text-ink-3">{hint}</span>}
      </div>
    </FieldContext.Provider>
  )
}

export function Input({ icon: Icon, suffix, invalid, mono, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon; suffix?: string; invalid?: boolean; mono?: boolean
}) {
  const field = useContext(FieldContext)
  return (
    <span className={cx('inset-well flex h-10 items-center gap-2 rounded-xl px-3 ring-1 transition-[box-shadow,background-color] duration-300',
      invalid ? 'bg-nogo/10 ring-nogo' : 'ring-white/10 focus-within:ring-earth/70', className)}>
      {Icon && <Icon size={15} className="shrink-0 text-ink-2" aria-hidden />}
      <input id={field?.id} aria-describedby={field?.describedBy} {...rest} aria-invalid={invalid || undefined}
        className={cx('min-w-0 flex-1 bg-transparent text-sm caret-sun outline-none [color-scheme:dark]', mono ? 'tnum font-mono' : 'font-medium')} />
      {suffix && <span className="text-xs text-ink-3">{suffix}</span>}
    </span>
  )
}

export function Button({ variant = 'secondary', icon: Icon, iconFill, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: LucideIcon; iconFill?: boolean
}) {
  return (
    <button {...rest} className={cx('inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed',
      variant === 'primary' && (rest.disabled ? 'raised text-ink-3' : 'btn-primary hover:brightness-105'),
      variant === 'secondary' && 'raised text-ink hover:brightness-125 disabled:opacity-40',
      variant === 'ghost' && 'text-ink-2 transition-[color,background-color,scale] duration-200 hover:bg-white/5 hover:text-ink active:scale-95',
      variant === 'danger' && 'raised text-nogo hover:brightness-125', className)}>
      {Icon && <Icon size={15} aria-hidden fill={iconFill ? 'currentColor' : 'none'} />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, active, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; active?: boolean }) {
  return (
    <button {...rest} aria-label={label} title={label}
      className={cx('grid size-9 place-items-center rounded-xl', active ? 'raised text-ink' : 'text-ink-3 transition-[color,background-color,scale] duration-200 hover:bg-white/5 hover:text-ink active:scale-90', className)}>
      <Icon size={16} aria-hidden />
    </button>
  )
}

export function IconWell({ icon: Icon, signal, size = 30 }: { icon: LucideIcon; signal: Signal; size?: number }) {
  return (
    <span className="raised grid shrink-0 place-items-center rounded-[9px]"
      style={{ width: size, height: size, color: SIGNAL[signal], background: `color-mix(in srgb, ${SIGNAL[signal]} 16%, transparent)` }}>
      <Icon size={Math.round(size / 2)} aria-hidden />
    </span>
  )
}

const STATUS: Record<MissionStatus, { icon: LucideIcon; color: string }> = {
  GO: { icon: Check, color: SIGNAL.go }, CAUTION: { icon: AlertTriangle, color: SIGNAL.caution }, 'NO-GO': { icon: X, color: SIGNAL.nogo },
}
export function StatusChip({ status, small }: { status: string; small?: boolean }) {
  const s = STATUS[status as MissionStatus] ?? { icon: AlertTriangle, color: SIGNAL.ink }
  return (
    <span className={cx('glow ignite inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold', small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}
      style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 18%, transparent)` }}>
      <s.icon size={small ? 11 : 13} aria-hidden />{status}
    </span>
  )
}

/** Medidor retroiluminado (0..1). */
export function Meter({ value, signal, label }: { value: number; signal: Signal; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <span role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}
      className="inset-well block h-[5px] w-full overflow-hidden rounded-full">
      <span className="glow pour block h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${pct}%`, color: SIGNAL[signal],
        background: `linear-gradient(90deg, color-mix(in srgb, ${SIGNAL[signal]} 70%, transparent), ${SIGNAL[signal]} 85%, color-mix(in srgb, ${SIGNAL[signal]} 50%, white))` }} />
    </span>
  )
}

export function Dot({ signal, hollow }: { signal: Signal; hollow?: boolean }) {
  return <span aria-hidden className={cx('inline-block size-2 shrink-0 rounded-full', !hollow && 'glow')}
    style={{ color: SIGNAL[signal], background: hollow ? 'transparent' : SIGNAL[signal], border: hollow ? `1.2px solid ${SIGNAL[signal]}` : undefined }} />
}

export const Kbd = ({ children }: { children: ReactNode }) =>
  <kbd className="rounded-[5px] px-1.5 text-[11px] font-medium text-ink-2 ring-1 ring-white/20">{children}</kbd>

export const Skeleton = ({ className }: { className?: string }) =>
  <span aria-hidden className={cx('shimmer block rounded-full bg-white/8', className)} />

/** Píldora sobre la escena. Con `tip`, una burbuja explica qué hace tras 1 s con el cursor encima (o con el foco). */
export function Pill({ children, className, tip, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tip?: Tip }) {
  const cls = cx('glass condense pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-medium text-ink-2 hover:text-ink', className)
  if (tip) return <TipButton {...rest} tip={tip} className={cls}>{children}</TipButton>
  return <button {...rest} className={cls}>{children}</button>
}
