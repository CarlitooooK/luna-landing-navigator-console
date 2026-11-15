import { expect, test } from 'vitest'
import { place } from './place'

const vp = { width: 1440, height: 900 }
const card = { width: 260, height: 120 }

test('con espacio, va debajo y centrada en el objetivo', () => {
  expect(place({ x: 600, y: 100, width: 24, height: 24 }, card, vp)).toEqual({ top: 132, left: 482, side: 'bottom' })
})
test('pegada al borde inferior, sube', () => {
  expect(place({ x: 600, y: 840, width: 24, height: 24 }, card, vp).side).toBe('top')
})
test('a la derecha o izquierda si no cabe ni arriba ni abajo', () => {
  const tall = { width: 260, height: 500 }
  expect(place({ x: 100, y: 380, width: 24, height: 24 }, tall, vp).side).toBe('right')
  expect(place({ x: 1300, y: 380, width: 24, height: 24 }, tall, vp).side).toBe('left')
})
test('nunca se sale de la ventana', () => {
  const p = place({ x: 2, y: 100, width: 24, height: 24 }, card, vp)
  expect(p.left).toBe(8)
  const q = place({ x: 1420, y: 100, width: 24, height: 24 }, card, vp)
  expect(q.left + card.width).toBeLessThanOrEqual(vp.width - 8)
})
test('un objetivo más grande que la tarjeta (un panel del tour) la pone al lado con más espacio', () => {
  const panel = { x: 16, y: 80, width: 300, height: 700 }
  const p = place(panel, { width: 340, height: 220 }, vp)
  expect(p.side).toBe('right')
  expect(p.left).toBe(16 + 300 + 8)
})
test('si no cabe en ningún lado, usa el de más espacio y la recorta', () => {
  const huge = { width: 1000, height: 800 }
  const p = place({ x: 700, y: 400, width: 24, height: 24 }, huge, vp)
  expect(p.top).toBeGreaterThanOrEqual(8)
  expect(p.left).toBeGreaterThanOrEqual(8)
})
