// Catálogo único de textos de ayuda: los "?", el glosario de Help y el tour leen de aquí (spec de onboarding, design.md §2).
// Regla: ningún texto decide qué es bueno o malo con un umbral propio. Eso lo dice el servidor (site.checks).
// Los números que aparecen son rangos del contrato, valores por defecto o sugerencias de valor ("Try").

export type HelpGroup = 'Setup' | 'Verdict' | 'Sun and power' | 'Earth link' | 'Terrain' | 'Time' | 'Views' | 'Compare'

/** Orden de los grupos en el glosario. */
export const HELP_GROUPS: HelpGroup[] = ['Setup', 'Verdict', 'Sun and power', 'Earth link', 'Terrain', 'Time', 'Views', 'Compare']

export interface HelpEntry {
  term: string
  text: string
  /** Sugerencia de valor, se muestra como "Try: …". */
  try?: string
  group: HelpGroup
}

export const GLOSSARY = {
  // Setup (design.md §2.3)
  site: { group: 'Setup', term: 'Landing site',
    text: 'Where the lander touches down. Catalog sites are candidate and historic landing spots. You can also click the globe.',
    try: 'Start with a south pole site: there the Sun stays within about 2° of the horizon, so the terrain decides everything.' },
  latitude: { group: 'Setup', term: 'Latitude', text: 'Degrees north (+) or south (−) of the lunar equator, from −90 to 90.', try: '−89.45' },
  longitude: { group: 'Setup', term: 'Longitude', text: 'Degrees east, from −180 to 360. Results always show it as 0 to 360° E.', try: '222.7' },
  date: { group: 'Setup', term: 'Landing date and time',
    text: 'The moment the lander touches down on the Moon, in UTC, not the launch from Earth. The simulation starts here. Dates from 1900 to 2050 are supported.',
    try: 'Dec 13, 2026: daytime at most catalog sites.' },
  duration: { group: 'Setup', term: 'Mission length',
    text: 'How long the mission stays on the surface. The verdict covers this whole window. 14 days is about one lunar daytime; 29.5 days is a full day and night.',
    try: '14 days' },
  step: { group: 'Setup', term: 'Time step',
    text: 'Time between samples. A shorter step catches brief sunsets and Earth dropouts, and takes longer to compute.',
    try: '60 min. With 29.5 days, avoid 15 min: it asks for 2,832 samples.' },
  'panel-area': { group: 'Setup', term: 'Panel area', text: 'Total area of the solar panels. It scales the power estimate. It does not change the verdict.', try: '4 m²' },
  'panel-efficiency': { group: 'Setup', term: 'Efficiency',
    text: 'Share of sunlight the panels turn into electricity, from 1 to 100%. It scales the power estimate.', try: '28%' },

  // Resultados y timeline (design.md §2.4)
  verdict: { group: 'Verdict', term: 'GO, CAUTION, NO-GO',
    text: 'GO: every check passes. CAUTION: at least one check is marginal. NO-GO: at least one check fails. The server decides; the console only shows it.' },
  daylight: { group: 'Sun and power', term: 'Daylight',
    text: 'Time until the Sun next sets or rises behind the local terrain, and the share of the mission with direct sunlight.' },
  // P-011: definición exacta de power_factor pendiente del backend; texto neutro mientras tanto.
  power: { group: 'Sun and power', term: 'Solar power now',
    text: 'Relative solar power at the time selected on the timeline, as reported by the server. Move the timeline to watch it change.' },
  'peak-power': { group: 'Sun and power', term: 'Peak power',
    text: 'Highest estimated electrical power in the window, for the panel area and efficiency set in Setup.' },
  'earth-link': { group: 'Earth link', term: 'Earth link (DTE)',
    text: 'A direct radio link (Direct-to-Earth, DTE) needs Earth above the local horizon. With Earth never in view, the mission needs a relay satellite.' },
  slope: { group: 'Terrain', term: 'Ground slope', text: 'How steep the ground is at the landing spot. Steeper ground is harder to land on.' },
  // P-011: texto científico por revisar.
  psr: { group: 'Terrain', term: 'Permanent shadow (PSR)',
    text: 'A permanently shadowed region (PSR) never sees the Sun. It is extremely cold and may hold water ice. This is the distance to the nearest one.' },
  azimuth: { group: 'Terrain', term: 'Azimuth', text: 'Compass direction along the horizon: 0° is north, 90° is east.' },
  elevation: { group: 'Terrain', term: 'Elevation', text: 'Angle above (+) or below (−) a flat horizon.' },
  'terrain-horizon': { group: 'Terrain', term: 'Terrain horizon', text: 'How high the terrain rises in that direction. The Sun or Earth is visible only above it.' },
  clearance: { group: 'Terrain', term: 'Clearance', text: 'Elevation minus terrain horizon. Positive means visible; negative means hidden behind terrain.' },
  longest: { group: 'Time', term: 'Longest stretch', text: 'The longest uninterrupted period in view during the window.' },
  both: { group: 'Time', term: 'Sun + Earth', text: 'Hours with sunlight and Earth in view at the same time: power and a direct radio link together.' },
  'horizon-360': { group: 'Views', term: 'Horizon 360°',
    text: 'The skyline seen from the site, unrolled from north through east, south and west. The dots are the Sun and Earth right now; a dot under the line is hidden.' },
  'horizon-view': { group: 'Views', term: 'Horizon view',
    text: 'Stand at the landing spot and look around. The skyline is the real terrain horizon from the server; the Sun and Earth follow the timeline and hide behind it.' },
  'landing-scene': { group: 'Views', term: 'Landing scene',
    text: 'An illustrative descent at this site. The path and the numbers on screen are not a physical simulation.' },
  'terrain-detail': { group: 'Views', term: 'Terrain detail', text: 'The local terrain patch served by the server, lit by the Sun at the selected time.' },

  // Barra superior y Compare (design.md §2.5)
  'detail-level': { group: 'Views', term: 'Simple and Detailed',
    text: 'Simple speaks plain language. Detailed shows the full telemetry. Same simulation, same verdict.' },
  'data-source': { group: 'Verdict', term: 'Data source',
    text: 'Live data: computed by the simulation server from NASA terrain and ephemerides. Degraded: the server answers, but one of its parts is not healthy. Offline: the server cannot be reached.' },
  scenario: { group: 'Compare', term: 'Scenario',
    text: 'A scenario is one site on one landing date, starting at 00:00 UTC. Compare two to five. They all use the mission length and solar panels set in Simulate, with a 2-hour time step.' },
  'rank-by': { group: 'Compare', term: 'Rank by',
    text: 'GO always ranks above CAUTION, and CAUTION above NO-GO. Within the same verdict: Balanced adds sunlight and Earth shares, Sunlight uses the sunlit share, Earth link uses the Earth-in-view share.' },
} as const satisfies Record<string, HelpEntry>

export type HelpId = keyof typeof GLOSSARY

/** Entradas agrupadas en el orden de HELP_GROUPS, para el glosario de Help. */
export function glossaryGroups(): { group: HelpGroup; entries: (HelpEntry & { id: HelpId })[] }[] {
  const all = (Object.entries(GLOSSARY) as [HelpId, HelpEntry][]).map(([id, e]) => ({ ...e, id }))
  return HELP_GROUPS.map((group) => ({ group, entries: all.filter((e) => e.group === group) })).filter((g) => g.entries.length > 0)
}
