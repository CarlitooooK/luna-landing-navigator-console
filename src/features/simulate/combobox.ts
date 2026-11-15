// Navegación con teclado del buscador de sitios (patrón combobox con listbox de ARIA APG).
// El foco se queda en el input; la opción activa se anuncia con aria-activedescendant.

/** Teclas que mueven la opción activa. */
export type ComboboxKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'

export const isComboboxKey = (key: string): key is ComboboxKey =>
  key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End'

/**
 * Índice de la opción activa después de pulsar `key`. `-1` significa "ninguna".
 * Las flechas dan la vuelta en los extremos; sin opciones siempre devuelve -1.
 */
export function moveActive(index: number, key: ComboboxKey, count: number): number {
  if (count <= 0) return -1
  switch (key) {
    case 'ArrowDown': return index < 0 || index >= count - 1 ? 0 : index + 1
    case 'ArrowUp': return index <= 0 || index >= count ? count - 1 : index - 1
    case 'Home': return 0
    case 'End': return count - 1
  }
}
