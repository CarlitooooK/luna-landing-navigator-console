// Dónde poner una burbuja (ayuda "?") o la tarjeta del tour junto a un elemento, sin salirse de la ventana.
// Función pura (spec de onboarding, tarea B3): recibe rectángulos, devuelve coordenadas fijas.

export interface Box { x: number; y: number; width: number; height: number }
export type Side = 'bottom' | 'top' | 'right' | 'left'

/**
 * Prueba los lados en el orden de `prefer` y se queda con el primero donde la tarjeta cabe entera.
 * Si no cabe en ninguno, usa el que tenga más espacio. Al final la recorta a la ventana con un margen.
 */
export function place(target: Box, card: { width: number; height: number }, viewport: { width: number; height: number },
  { gap = 8, margin = 8, prefer = ['bottom', 'top', 'right', 'left'] as Side[] } = {}): { top: number; left: number; side: Side } {
  const room: Record<Side, number> = {
    bottom: viewport.height - (target.y + target.height) - gap - margin,
    top: target.y - gap - margin,
    right: viewport.width - (target.x + target.width) - gap - margin,
    left: target.x - gap - margin,
  }
  const need = (s: Side) => (s === 'top' || s === 'bottom' ? card.height : card.width)
  const side = prefer.find((s) => room[s] >= need(s)) ?? prefer.reduce((a, b) => (room[b] - need(b) > room[a] - need(a) ? b : a))
  const cx = target.x + target.width / 2 - card.width / 2
  const cy = target.y + target.height / 2 - card.height / 2
  let top = side === 'bottom' ? target.y + target.height + gap : side === 'top' ? target.y - gap - card.height : cy
  let left = side === 'right' ? target.x + target.width + gap : side === 'left' ? target.x - gap - card.width : cx
  const clamp = (v: number, size: number, max: number) => Math.max(margin, Math.min(v, max - margin - size))
  top = clamp(top, card.height, viewport.height)
  left = clamp(left, card.width, viewport.width)
  return { top: Math.round(top), left: Math.round(left), side }
}
