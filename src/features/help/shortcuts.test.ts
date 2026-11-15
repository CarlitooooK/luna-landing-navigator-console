import { expect, test } from 'vitest'
import { sliderStep } from '@/core/utils/timeline'
import { SHORTCUTS, hotkeyFor } from './shortcuts'

const free = { inField: false, dialogOpen: false }

test('F y ? son los atajos globales', () => {
  expect(hotkeyFor({ key: 'f' }, free)).toBe('fullscreen')
  expect(hotkeyFor({ key: 'F' }, free)).toBe('fullscreen')
  expect(hotkeyFor({ key: '?' }, free)).toBe('help')
  expect(hotkeyFor({ key: 'g' }, free)).toBeNull()
})
test('no actúan dentro de un campo, con un diálogo abierto ni con modificadores', () => {
  expect(hotkeyFor({ key: 'f' }, { inField: true, dialogOpen: false })).toBeNull()
  expect(hotkeyFor({ key: '?' }, { inField: false, dialogOpen: true })).toBeNull()
  expect(hotkeyFor({ key: 'f', metaKey: true }, free)).toBeNull()
  expect(hotkeyFor({ key: 'f', ctrlKey: true }, free)).toBeNull()
})

// "Los atajos listados existen todos" (tarea D1): cada tecla del panel la atiende alguien.
const KEY: Record<string, string> = { '←': 'ArrowLeft', '→': 'ArrowRight', PgUp: 'PageUp', PgDn: 'PageDown' }
test('cada atajo listado lo atiende hotkeyFor, sliderStep o el navegador (Esc)', () => {
  for (const s of SHORTCUTS) {
    for (const k of s.keys) {
      if (k === 'Esc') continue // lo cierran <dialog> y popover de forma nativa
      const handled = hotkeyFor({ key: k }, free) !== null || sliderStep(KEY[k] ?? k, 5, 100, 12) !== null
      expect(handled, k).toBe(true)
    }
  }
})
