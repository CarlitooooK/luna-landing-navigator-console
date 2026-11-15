// Las ayudas que usa la interfaz existen en el catálogo, y cada entrada del catálogo tiene al menos un "?"
// en pantalla (tarea B4) o una burbuja de píldora (`tipOf`). Lee el código fuente con import.meta.glob: el entorno de pruebas es node, sin DOM.
import { expect, test } from 'vitest'
import { GLOSSARY } from './glossary'

/** Entradas que solo viven en el glosario de Help y en el tour, sin "?" ni burbuja propia. Hoy ninguna. */
const GLOSSARY_ONLY: string[] = []

const sources = import.meta.glob<string>('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true })
const src = Object.values(sources).join('\n')
const used = new Set([
  ...[...src.matchAll(/<Help id="([\w-]+)"/g)].map((m) => m[1]),
  ...[...src.matchAll(/\bhelp(?:=|: )["']([\w-]+)["']/g)].map((m) => m[1]),
  ...[...src.matchAll(/\btipOf\(["']([\w-]+)["']/g)].map((m) => m[1]),
])

test('toda ayuda usada existe en el catálogo', () => {
  for (const id of used) expect(Object.keys(GLOSSARY), id).toContain(id)
})
test('cada entrada del catálogo tiene un "?" o una burbuja en pantalla, salvo las del glosario puro', () => {
  for (const id of Object.keys(GLOSSARY)) if (!GLOSSARY_ONLY.includes(id)) expect(used.has(id), id).toBe(true)
})
