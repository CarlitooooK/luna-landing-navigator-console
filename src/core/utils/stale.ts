// ¿Los resultados en pantalla siguen siendo de la configuración actual? (spec de onboarding, A-07, tarea A4)
// Results solo es vigente si el sitio y todos los parámetros que se mandaron a /evaluate son los mismos.

export interface RunParams {
  lat: number
  lon: number
  label: string
  startUtc: string
  durationDays: number
  stepMinutes: number
  panelAreaM2: number
  panelEfficiency: number
}

/** `true` si hay una evaluación y alguno de sus parámetros ya no es el actual. Sin sitio elegido no se marca. */
export function isStale(current: Omit<RunParams, 'label' | 'lat' | 'lon'> & { lat?: number; lon?: number }, evaluatedFor: RunParams | null): boolean {
  if (!evaluatedFor || current.lat == null || current.lon == null) return false
  return current.lat !== evaluatedFor.lat || current.lon !== evaluatedFor.lon
    || current.startUtc !== evaluatedFor.startUtc || current.durationDays !== evaluatedFor.durationDays
    || current.stepMinutes !== evaluatedFor.stepMinutes || current.panelAreaM2 !== evaluatedFor.panelAreaM2
    || current.panelEfficiency !== evaluatedFor.panelEfficiency
}
