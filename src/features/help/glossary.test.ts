import { expect, test } from 'vitest'
import { GLOSSARY, HELP_GROUPS, glossaryGroups, type HelpEntry } from './glossary'

const entries = Object.entries(GLOSSARY) as [string, HelpEntry][]

test('cada texto tiene una o dos frases cortas', () => {
  for (const [id, e] of entries) {
    expect(e.text.length, id).toBeLessThanOrEqual(220)
    expect(e.text.split(/[.!?](\s|$)/).filter((x) => x && x.trim()).length, id).toBeLessThanOrEqual(4)
  }
})
test('todo grupo existe y cada grupo tiene entradas', () => {
  for (const [id, e] of entries) expect(HELP_GROUPS, id).toContain(e.group)
  expect(glossaryGroups().map((g) => g.group)).toEqual(HELP_GROUPS)
})
test('el glosario conserva todas las entradas, sin repetir', () => {
  const ids = glossaryGroups().flatMap((g) => g.entries.map((e) => e.id))
  expect(new Set(ids).size).toBe(entries.length)
})

// Salvaguarda contra umbrales inventados (design.md §0, regla 1): un número con °, % o h solo puede
// ser uno de estos. Cada uno tiene su fuente: 2° (PRODUCT.md), 0°, 90° y 360° (rumbos y rango de longitud
// del contrato), 100% (rango de eficiencia) y 28% (eficiencia por defecto del contrato). Uno nuevo se agrega aquí con su fuente.
const ALLOWED = new Set(['2°', '0°', '90°', '360°', '100%', '28%'])
test('ningún texto trae un número con °, % o h fuera de la lista permitida', () => {
  const unit = /(\d[\d.,]*)\s?(°|%|h\b)/g
  for (const [id, e] of entries) {
    for (const field of [e.text, e.try ?? '']) {
      for (const m of field.matchAll(unit)) expect(ALLOWED.has(m[0].replace(/\s/g, '')), `${id}: "${m[0]}"`).toBe(true)
    }
  }
})
