// Catálogo de alunizajes reales para "Recreate missions".
// Solo fecha, hora y coordenadas de fuentes públicas (citadas por entrada). Las condiciones de luz y
// enlace NO se guardan aquí: salen de POST /evaluate al reproducir (D-002, D-006).
// Coordenadas planetocéntricas, longitud Este. Revisado el 2026-11-14.

export type MissionRegion = 'south-pole' | 'near-side' | 'far-side'

export interface Mission {
  id: string
  code: string // monograma corto para la lista
  name: string
  operator: string
  touchdownUtc: string // ISO-8601 UTC
  /** true si la hora o el sitio publicados son aproximados. */
  approximate?: boolean
  lat: number
  lon: number
  region: MissionRegion
  summary: string
  /**
   * El registro histórico dice que la Tierra nunca se ve desde el sitio (tarea C4). Solo sirve para avisar si la
   * simulación dice otra cosa: la consola no elige quién tiene razón (design.md §4.6).
   */
  earthNeverInView?: boolean
  sources: { label: string; url: string }[]
}

/** ¿El registro de la misión y la simulación se contradicen sobre la Tierra? Solo hay algo que comparar si el registro lo afirma. */
export const missionDisagrees = (m: Pick<Mission, 'earthNeverInView'>, earthVisiblePct: number) =>
  m.earthNeverInView === true && earthVisiblePct > 0

export const MISSIONS: Mission[] = [
  {
    id: 'im-1', code: 'IM-1', name: 'IM-1 Odysseus', operator: 'Intuitive Machines · NASA CLPS',
    touchdownUtc: '2024-02-22T23:23:53Z', lat: -80.13, lon: 1.44, region: 'south-pole',
    summary: 'First US soft landing since Apollo 17. Came to rest near Malapert A on ground sloped about 12°.',
    sources: [
      { label: 'LROC: IM-1 on the Moon (touchdown time)', url: 'https://www.lroc.asu.edu/posts/1360' },
      { label: 'NASA: LRO images Odysseus (site, slope)', url: 'https://www.nasa.gov/missions/lro/nasas-lro-images-intuitive-machines-odysseus-lander' },
    ],
  },
  {
    id: 'im-2', code: 'IM-2', name: 'IM-2 Athena', operator: 'Intuitive Machines · NASA CLPS',
    touchdownUtc: '2025-03-06T17:30:00Z', approximate: true, lat: -84.78, lon: 29.13, region: 'south-pole',
    summary: 'Landed on Mons Mouton, closer to the south pole than any earlier mission, about 400 m from its target.',
    sources: [
      { label: 'LROC: IM-2 target site (-84.78°, 29.13° E)', url: 'https://www.lroc.asu.edu/images/1401' },
      { label: 'NASA: touchdown around 11:30 a.m. CST, 400 m off target', url: 'https://go.nasa.gov/4ibG8Wx' },
    ],
  },
  {
    id: 'chandrayaan-3', code: 'CH-3', name: 'Chandrayaan-3 Vikram', operator: 'ISRO',
    touchdownUtc: '2023-08-23T12:32:00Z', lat: -69.37345, lon: 32.31985, region: 'south-pole',
    summary: 'First landing in the southern high latitudes, at Statio Shiv Shakti.',
    sources: [
      { label: 'JPL Horizons: Chandrayaan-3 lander record (time)', url: 'https://ssd.jpl.nasa.gov/api/horizons.api?COMMAND=%27-158%27&MAKE_EPHEM=NO&format=text' },
      { label: 'USGS Gazetteer: Statio Shiv Shakti (site)', url: 'https://planetarynames.wr.usgs.gov/Feature/16272' },
    ],
  },
  {
    id: 'change-4', code: 'CE-4', name: "Chang'e 4", operator: 'CNSA',
    touchdownUtc: '2019-01-03T02:26:00Z', lat: -45.4446, lon: 177.5991, region: 'far-side',
    summary: 'First soft landing on the far side, in Von Kármán crater. Earth is never in view: it talked through the Queqiao relay.',
    earthNeverInView: true,
    sources: [{ label: 'China NSSDC: Chang\'e 4 mission (time, site)', url: 'https://www.nssdc.ac.cn/mobile/nssdc_en/html/task/change4.html' }],
  },
  {
    id: 'apollo-17', code: 'A17', name: 'Apollo 17', operator: 'NASA',
    touchdownUtc: '1972-12-11T19:54:57Z', lat: 20.1911, lon: 30.7723, region: 'near-side',
    summary: 'Last crewed landing, in the Taurus-Littrow valley.',
    sources: [
      { label: 'NSSDCA: Apollo 17 LM (time)', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C' },
      { label: 'NSSDCA: Apollo landing site coordinates', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html' },
    ],
  },
  {
    id: 'apollo-15', code: 'A15', name: 'Apollo 15', operator: 'NASA',
    touchdownUtc: '1971-07-30T22:16:29Z', lat: 26.13239, lon: 3.6333, region: 'near-side',
    summary: 'First mission with the Lunar Roving Vehicle, at Hadley-Apennine.',
    sources: [
      { label: 'NSSDCA: Apollo 15 (time)', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo15info.html' },
      { label: 'NSSDCA: Apollo landing site coordinates', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html' },
    ],
  },
  {
    id: 'apollo-11', code: 'A11', name: 'Apollo 11', operator: 'NASA',
    touchdownUtc: '1969-07-20T20:17:40Z', lat: 0.67416, lon: 23.47314, region: 'near-side',
    summary: 'First crewed landing, in Mare Tranquillitatis.',
    sources: [
      { label: 'NSSDCA: Apollo 11 (time)', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html' },
      { label: 'NSSDCA: Apollo landing site coordinates', url: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html' },
    ],
  },
]

export const REGION_LABEL: Record<MissionRegion, string> = { 'south-pole': 'South pole region', 'near-side': 'Near side', 'far-side': 'Far side' }

/** Inicio de la reproducción: la hora en punto anterior al alunizaje (el contrato pide segundos en cero). */
export const replayStart = (iso: string) => `${iso.slice(0, 13)}:00:00Z`
