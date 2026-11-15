import { expect, test } from 'vitest'
import { MISSIONS, missionDisagrees } from './missions'

test('el registro dice "nunca a la vista" y la simulación también: no hay aviso', () => {
  expect(missionDisagrees({ earthNeverInView: true }, 0)).toBe(false)
})
test('el registro dice "nunca a la vista" y la simulación la ve: se avisa', () => {
  expect(missionDisagrees({ earthNeverInView: true }, 12.5)).toBe(true)
})
test('sin afirmación en el registro no hay nada que comparar', () => {
  expect(missionDisagrees({}, 0)).toBe(false)
  expect(missionDisagrees({}, 100)).toBe(false)
})
test('solo Chang\'e 4 lo afirma en el catálogo', () => {
  expect(MISSIONS.filter((m) => m.earthNeverInView).map((m) => m.id)).toEqual(['change-4'])
})
