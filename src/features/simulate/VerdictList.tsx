import { AlertTriangle, Check, X, type LucideIcon } from 'lucide-react'
import { verdictReasons, type Level } from '@/core/utils/verdict'

// Ícono y color por nivel: nunca solo el color (design.md §2.7).
const LEVEL: Record<Level, { icon: LucideIcon; className: string; label: string }> = {
  ok: { icon: Check, className: 'text-go', label: 'Passes' },
  caution: { icon: AlertTriangle, className: 'text-caution', label: 'Marginal' },
  nogo: { icon: X, className: 'text-nogo', label: 'Fails' },
}

/** El porqué del veredicto: los checks del servidor, o sus notas en español si el ambiente no los manda (tarea B5). */
export function VerdictList({ site }: { site: Parameters<typeof verdictReasons>[0] }) {
  const v = verdictReasons(site)
  if (v.source === 'reasons') {
    return <ul className="flex flex-col gap-1.5">{v.items.map((r) => <li key={r} className="text-xs leading-[17px] text-ink" lang="es">{r}</li>)}</ul>
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {v.items.map((c) => {
        const l = LEVEL[c.level]
        return (
          <li key={c.code} className="flex items-start gap-2 text-xs leading-[17px] text-ink">
            <l.icon size={14} className={`mt-px shrink-0 ${l.className}`} aria-label={l.label} />{c.message}
          </li>
        )
      })}
    </ul>
  )
}

