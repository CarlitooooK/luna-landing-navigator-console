// Utilidades puras de presentación sobre evaluation.timeline[] (capa 3: cero red).
// No calculan física (D-002, D-006): solo agrupan y formatean lo que manda el backend.
import type { TimelinePoint } from '@/types'

/** Tramo continuo [start, end) en índices del timeline. */
export type Run = [start: number, end: number]

/** Tramos donde `pred` es verdadero, para pintar pistas tipo Gantt. */
export function runs(points: TimelinePoint[], pred: (p: TimelinePoint) => boolean): Run[] {
  const out: Run[] = []
  let start = -1
  points.forEach((p, i) => {
    if (pred(p)) { if (start < 0) start = i }
    else if (start >= 0) { out.push([start, i]); start = -1 }
  })
  if (start >= 0) out.push([start, points.length])
  return out
}

export const sunRuns = (t: TimelinePoint[]) => runs(t, (p) => p.sun_visible)
export const earthRuns = (t: TimelinePoint[]) => runs(t, (p) => p.earth_visible)
export const bothRuns = (t: TimelinePoint[]) => runs(t, (p) => p.sun_visible && p.earth_visible)

/** Fracción del timeline cubierta por los tramos (0..1). */
export const coverage = (r: Run[], n: number) => (n === 0 ? 0 : r.reduce((a, [s, e]) => a + (e - s), 0) / n)

/** Horas entre dos marcas del timeline (el paso lo decide el backend). */
export function stepHours(points: TimelinePoint[]): number {
  if (points.length < 2) return 1
  return (Date.parse(points[1].timestamp_utc) - Date.parse(points[0].timestamp_utc)) / 3_600_000
}

/**
 * Duración legible para cuentas regresivas.
 * `null` significa que el evento no ocurre dentro de la ventana: el llamador decide el texto.
 */
export function formatHours(h: number | null | undefined): { value: string; unit: string } | null {
  if (h == null || !Number.isFinite(h)) return null
  if (h < 48) return { value: String(Math.round(h)), unit: Math.round(h) === 1 ? 'hour' : 'hours' }
  const d = Math.floor(h / 24)
  const rest = Math.round(h - d * 24)
  if (rest === 0) return { value: String(d), unit: 'days' }
  return { value: `${d}d ${rest}h`, unit: '' }
}

/** Formato corto para pantallas técnicas: "196 h". */
export const hoursShort = (h: number | null | undefined) => (h == null ? '—' : `${Math.round(h)} h`)

export const pct = (v: number | null | undefined, digits = 1) => (v == null ? '—' : `${v.toFixed(digits)}%`)
/** Porcentaje sin decimales que no redondea a 0 % algo que sí pasó: 0.3 % se muestra "<1%". */
export const pctWhole = (v: number | null | undefined) => (v == null ? '—' : v > 0 && v < 1 ? '<1%' : `${Math.round(v)}%`)

/** Día de la misión, contado desde 1, para `h` horas desde el alunizaje. El reloj y el eje usan esta misma regla. */
export const dayOf = (h: number) => Math.floor(h / 24 + 1e-9) + 1

/**
 * Paso del scrubber después de pulsar `key` (tarea A5). ←/→ un paso, PageUp/PageDown un día, Home/End los extremos.
 * Devuelve `null` si la tecla no mueve el scrubber.
 */
export function sliderStep(key: string, index: number, count: number, stepsPerDay: number): number | null {
  const last = Math.max(0, count - 1), day = Math.max(1, Math.round(stepsPerDay))
  const clamp = (i: number) => Math.max(0, Math.min(last, i))
  switch (key) {
    case 'ArrowRight': case 'ArrowUp': return clamp(index + 1)
    case 'ArrowLeft': case 'ArrowDown': return clamp(index - 1)
    case 'PageUp': return clamp(index + day)
    case 'PageDown': return clamp(index - day)
    case 'Home': return 0
    case 'End': return last
    default: return null
  }
}
export const deg = (v: number | null | undefined, digits = 2) => (v == null ? '—' : `${v.toFixed(digits)}°`)
