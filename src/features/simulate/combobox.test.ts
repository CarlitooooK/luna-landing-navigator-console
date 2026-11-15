import { expect, test } from 'vitest'
import { isComboboxKey, moveActive } from './combobox'

test('↓ empieza en la primera opción y avanza', () => {
  expect(moveActive(-1, 'ArrowDown', 3)).toBe(0)
  expect(moveActive(0, 'ArrowDown', 3)).toBe(1)
})
test('↑ sin opción activa va a la última y retrocede', () => {
  expect(moveActive(-1, 'ArrowUp', 3)).toBe(2)
  expect(moveActive(2, 'ArrowUp', 3)).toBe(1)
})
test('las flechas dan la vuelta en los extremos', () => {
  expect(moveActive(2, 'ArrowDown', 3)).toBe(0)
  expect(moveActive(0, 'ArrowUp', 3)).toBe(2)
})
test('Home y End van a los extremos', () => {
  expect(moveActive(1, 'Home', 3)).toBe(0)
  expect(moveActive(1, 'End', 3)).toBe(2)
})
test('sin opciones no hay opción activa', () => {
  expect(moveActive(-1, 'ArrowDown', 0)).toBe(-1)
  expect(moveActive(4, 'End', 0)).toBe(-1)
})
test('un índice que quedó fuera de la lista se corrige', () => {
  expect(moveActive(5, 'ArrowDown', 3)).toBe(0)
  expect(moveActive(5, 'ArrowUp', 3)).toBe(2)
})
test('solo las cuatro teclas de navegación mueven la opción', () => {
  expect(['ArrowDown', 'ArrowUp', 'Home', 'End'].every(isComboboxKey)).toBe(true)
  expect(isComboboxKey('Enter')).toBe(false)
  expect(isComboboxKey('Tab')).toBe(false)
})
