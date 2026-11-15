// Contrato: ISO-8601 UTC estricto YYYY-MM-DDTHH:mm:ssZ (sin milisegundos ni offsets).
export const toUtcIso = (d: Date): string => d.toISOString().replace(/\.\d{3}Z$/, 'Z')
export const formatUtc = (iso: string): string => iso.replace('T', ' ').replace(/:\d{2}(\.\d+)?Z$/, ' UTC')

/**
 * Hora UTC escrita a mano, siempre en 24 horas (tarea A9). Acepta `H:MM` y `HH:MM` de 00:00 a 23:59
 * y la devuelve como `HH:MM`; cualquier otra cosa devuelve `null`.
 */
export function parseUtcTime(text: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(text.trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
