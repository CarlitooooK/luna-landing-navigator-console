import { Globe2, Mountain, Snowflake, Sun, Zap, type LucideIcon } from 'lucide-react'
import { useMissionStore } from '@/core/store/useMissionStore'
import { countdown, type Body, type Countdown as CountdownT } from '@/core/utils/countdown'
import { isStale } from '@/core/utils/stale'
import { deg, formatHours, hoursShort, pct, pctWhole } from '@/core/utils/timeline'
import { formatUtc } from '@/core/utils/time'
import { Divider, Flow, IconWell, Meter, Panel, SectionTitle, Skeleton, StatusChip, type Signal } from '@/ui'
import type { MissionStatus } from '@/types'

// Encabezado en lenguaje llano por estado. No repite umbrales: esos los decide el backend.
const HEADLINE: Record<MissionStatus, { title: string; body: string }> = {
  GO: { title: 'A good place to land', body: 'Enough sunlight, a line to Earth and safe ground for this window.' },
  CAUTION: { title: 'Possible, with risks', body: 'At least one condition is close to its limit. Check the details before committing.' },
  'NO-GO': { title: 'Not a safe choice', body: 'At least one condition fails for this window. Try another date or a nearby site.' },
}

// Texto de cada caso de countdown() (design.md §3.4). Los números de horas vienen del backend o de su timeline.
const COUNTDOWN_TEXT: Record<Body, { set: string; rise: string; never: string; always: string; later: string }> = {
  sun: { set: 'until sunset', rise: 'until sunrise', never: 'No sunlight in this window', always: 'No sunset in this window', later: 'Sunrise later in this window' },
  earth: { set: 'until Earth sets', rise: 'until Earth rises', never: 'Earth never in view', always: 'Earth stays in view', later: 'Earth rises later in this window' },
}

function Countdown({ icon, signal, label, body, c, note, share }: {
  icon: LucideIcon; signal: Signal; label: string; body: Body; c: CountdownT; note: string; share: number
}) {
  const t = COUNTDOWN_TEXT[body]
  const f = c.kind === 'until-set' || c.kind === 'until-rise' ? formatHours(c.hours) : null
  const until = c.kind === 'until-rise' ? t.rise : t.set
  const none = c.kind === 'never' ? t.never : c.kind === 'always' ? t.always : t.later
  return (
    <div className="flex items-start gap-3">
      <IconWell icon={icon} signal={signal} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium text-ink-3">{label}</span>
        {f ? <span className="flex items-baseline gap-1.5"><span className="tnum text-xl font-bold"><Flow text={f.value} /></span>
          <span className="text-[13px] font-medium text-ink-2">{[f.unit, until].filter(Boolean).join(' ')}</span></span>
          : <span className="text-xl font-bold">{none}</span>}
        <Meter value={share} signal={signal} label={`${label} share of the window`} />
        <span className="text-xs text-ink-2">{note}</span>
      </div>
    </div>
  )
}

/** Celda compacta de "Next set" en Detailed. */
const nextSetCell = (c: CountdownT) =>
  c.kind === 'until-set' ? hoursShort(c.hours) : c.kind === 'until-rise' ? `rise ${hoursShort(c.hours)}` : c.kind === 'never' ? 'never' : c.kind === 'always' ? 'no set' : 'rise later'

function Fact({ icon, signal, label, value, unit, note }: { icon: LucideIcon; signal: Signal; label: string; value: string; unit: string; note: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconWell icon={icon} signal={signal} />
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-3">{label}</span>
        <span className="flex items-baseline gap-1.5"><span className="tnum text-xl font-bold"><Flow text={value} duration={300} /></span><span className="text-[13px] font-medium text-ink-2">{unit}</span></span>
        <span className="text-xs text-ink-2">{note}</span>
      </div>
    </div>
  )
}

function Row({ k, a, b, ac, bc }: { k: string; a: string; b?: string; ac?: string; bc?: string }) {
  return (
    <div className="flex h-6 items-center text-xs">
      <span className="flex-1 text-ink-2">{k}</span>
      <span className={`tnum w-[78px] text-right font-mono text-[13px] font-medium ${ac ?? ''}`}>{a}</span>
      {b !== undefined && <span className={`tnum w-[78px] text-right font-mono text-[13px] font-medium ${bc ?? ''}`}>{b}</span>}
    </div>
  )
}

function Simple() {
  const ev = useMissionStore((s) => s.evaluation)!
  const point = useMissionStore((s) => s.evaluation?.timeline[s.stepIndex])
  const { summary: m, site } = ev
  const h = HEADLINE[site.status as MissionStatus] ?? HEADLINE.CAUTION
  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <StatusChip status={site.status} />
        <h3 className="text-[22px] leading-[27px] font-bold text-balance">{h.title}</h3>
        <p className="text-[13px] leading-[19px] text-ink-2">{h.body}</p>
      </div>
      <Divider />
      <Countdown icon={Sun} signal="sun" label="Daylight" body="sun" c={countdown(m, ev.timeline, 'sun')}
        note={`Sunlit ${pctWhole(m.sun_visible_pct)} of the mission.`} share={m.sun_visible_pct / 100} />
      <Countdown icon={Globe2} signal="earth" label="Talk to Earth" body="earth" c={countdown(m, ev.timeline, 'earth')}
        note={`Earth in view ${pctWhole(m.earth_visible_pct)} of the mission.`} share={m.earth_visible_pct / 100} />
      <Fact icon={Zap} signal="sun" label="Solar power now" value={point ? `${Math.round(point.power_factor * 100)}%` : '—'} unit="of panel output"
        note={`Peak in this window: ${(m.estimated_peak_power_w / 1000).toFixed(1)} kW.`} />
      <Fact icon={Mountain} signal="regolith" label="Ground" value={`${site.slope_deg.toFixed(1)}°`} unit="tilt"
        note={site.nearest_psr_km != null ? `Permanent shadow ${site.nearest_psr_km.toFixed(1)} km away.` : 'Local slope of the landing spot.'} />
    </>
  )
}

function Detailed() {
  const ev = useMissionStore((s) => s.evaluation)!
  const p = useMissionStore((s) => s.evaluation?.timeline[s.stepIndex])
  const stepIndex = useMissionStore((s) => s.stepIndex)
  const panelAreaM2 = useMissionStore((s) => s.panelAreaM2)
  const panelEfficiency = useMissionStore((s) => s.panelEfficiency)
  const { summary: m, site } = ev
  const clear = (el?: number, hz?: number) => (el == null || hz == null ? '—' : `${el - hz >= 0 ? '+' : ''}${(el - hz).toFixed(2)}°`)
  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between"><StatusChip status={site.status} />
          <span className="text-xs text-ink-2">{site.reasons.length} checks from the backend</span></div>
        {/* reasons llegan en español desde el backend: pendiente en docs/ideas/console-ui-figma.md */}
        <ul className="flex flex-col gap-1.5">
          {site.reasons.map((r) => <li key={r} className="text-xs leading-[17px] text-ink" lang="es">{r}</li>)}
        </ul>
      </div>
      <Divider />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center text-[11px] font-medium text-ink-3">
          <span className="flex-1">Now, T+{stepIndex} steps</span>
          <span className="flex w-[78px] items-center justify-end gap-1.5 text-xs font-bold text-ink"><Sun size={13} className="text-sun" aria-hidden />Sun</span>
          <span className="flex w-[78px] items-center justify-end gap-1.5 text-xs font-bold text-ink"><Globe2 size={13} className="text-earth" aria-hidden />Earth</span>
        </div>
        <Row k="Status" a={p?.sun_visible ? 'Visible' : 'Hidden'} b={p?.earth_visible ? 'In view' : 'Hidden'}
          ac={p?.sun_visible ? 'text-sun' : 'text-nogo'} bc={p?.earth_visible ? 'text-earth' : 'text-nogo'} />
        <Row k="Azimuth" a={deg(p?.sun_az_deg)} b={deg(p?.earth_az_deg)} />
        <Row k="Elevation" a={deg(p?.sun_el_deg)} b={deg(p?.earth_el_deg)} />
        <Row k="Terrain horizon" a={deg(p?.sun_horizon_el_deg)} b={deg(p?.earth_horizon_el_deg)} />
        <Row k="Clearance" a={clear(p?.sun_el_deg, p?.sun_horizon_el_deg)} b={clear(p?.earth_el_deg, p?.earth_horizon_el_deg)} />
        <Row k="Visible in window" a={pct(m.sun_visible_pct)} b={pct(m.earth_visible_pct)} />
        <Row k="Longest stretch" a={hoursShort(m.max_continuous_sun_hours)} b={hoursShort(m.max_continuous_dte_hours)} />
        <Row k="Next set" a={nextSetCell(countdown(m, ev.timeline, 'sun'))} b={nextSetCell(countdown(m, ev.timeline, 'earth'))} />
        <p className="tnum pt-1 font-mono text-[11px] text-ink-3">
          Sunset {m.next_sunset_utc ? formatUtc(m.next_sunset_utc) : 'none in window'} · Earthset {m.next_earthset_utc ? formatUtc(m.next_earthset_utc) : 'none in window'}
        </p>
      </div>
      <Divider />
      <div className="flex flex-col gap-0.5">
        <SectionTitle aside={<span className="text-[11px] text-ink-3">{panelAreaM2.toFixed(1)} m² · {Math.round(panelEfficiency * 100)}%</span>}>
          <span className="flex items-center gap-2"><Zap size={14} className="text-sun" aria-hidden />Solar power</span></SectionTitle>
        <Row k="Power factor now" a={p ? p.power_factor.toFixed(2) : '—'} />
        <Row k="Average factor" a={m.avg_power_factor.toFixed(2)} />
        <Row k="Peak in window" a={`${Math.round(m.estimated_peak_power_w).toLocaleString('en-US')} W`} />
      </div>
      <Divider />
      <div className="flex flex-col gap-0.5">
        <SectionTitle><span className="flex items-center gap-2"><Mountain size={14} className="text-regolith" aria-hidden />Terrain & ice</span></SectionTitle>
        <Row k="Elevation" a={`${site.elevation_m.toLocaleString('en-US', { maximumFractionDigits: 1 })} m`} />
        <Row k="Local slope" a={`${site.slope_deg.toFixed(1)}°`} />
        <div className="flex h-6 items-center text-xs"><span className="flex flex-1 items-center gap-1.5 text-ink-2"><Snowflake size={12} className="text-psr" aria-hidden />Nearest shadow zone</span>
          <span className="tnum font-mono text-[13px] font-medium">{site.nearest_psr_km != null ? `${site.nearest_psr_km.toFixed(1)} km` : '—'}</span></div>
      </div>
    </>
  )
}

function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-3.5">
      <span className="text-xs text-ink-2">Tracing the 360° horizon, then the Sun and Earth for every step…</span>
      <Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-56" /><Skeleton className="h-3 w-full" /><Divider />
      {[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><Skeleton className="size-[30px] rounded-[9px]" />
        <div className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-2.5 w-24" /><Skeleton className="h-4 w-36" /><Skeleton className="h-1 w-full" /></div></div>)}
    </div>
  )
}

export function ResultsPanel() {
  const detail = useMissionStore((s) => s.detail)
  const evaluation = useMissionStore((s) => s.evaluation)
  const loading = useMissionStore((s) => s.loading)
  const error = useMissionStore((s) => s.error)
  const stale = useStale()
  return (
    <Panel title="Results" label="Results"
      peekAside={loading ? 'Calculating…' : error ? <span className="text-nogo">Failed</span> : evaluation ? (stale ? 'Out of date' : <StatusChip small status={evaluation.site.status} />) : 'No run yet'}>
      {!loading && !error && evaluation && stale && <StaleNotice />}
      {loading ? <Loading />
        : error ? <ErrorNotice />
        : !evaluation ? <p className="text-[13px] leading-[19px] text-ink-2">Choose a landing site and a date, then run the simulation to see sunlight, the link to Earth and the ground.</p>
        : <div className={`flex flex-col gap-4 transition-opacity duration-300 ${stale ? 'opacity-60' : ''}`}>{detail === 'detailed' ? <Detailed /> : <Simple />}</div>}
      {!loading && !error && evaluation && <AuxNotice />}
    </Panel>
  )
}

/** ¿Cambió el sitio o algún parámetro desde la última corrida? (`isStale`, tarea A4) */
function useStale() {
  return useMissionStore((s) => isStale({ lat: s.selected?.lat, lon: s.selected?.lon, startUtc: s.startUtc, durationDays: s.durationDays,
    stepMinutes: s.stepMinutes, panelAreaM2: s.panelAreaM2, panelEfficiency: s.panelEfficiency }, s.evaluatedFor))
}

/** Results sigue mostrando la corrida anterior, atenuada, y dice de qué es. */
function StaleNotice() {
  const run = useMissionStore((s) => s.evaluatedFor)!
  return (
    <p role="status" className="rounded-xl bg-white/5 px-3 py-2 text-xs leading-[18px] text-ink-2 ring-1 ring-white/10">
      <span className="font-bold text-caution">Out of date.</span> These results are for {run.label}, {formatUtc(run.startUtc)}. Run the simulation again to update them.
    </p>
  )
}

/** El veredicto llegó, pero el parche de terreno o las PSR no: se dice qué falta en lugar de fallar toda la corrida. */
function AuxNotice() {
  const failed = useMissionStore((s) => s.auxFailed)
  if (failed.length === 0) return null
  const what = failed.map((f) => (f === 'terrain' ? 'the local terrain patch' : 'the nearby shadowed regions')).join(' and ')
  return <p role="status" className="text-xs text-caution">The verdict is complete, but {what} could not be loaded. Run again to retry.</p>
}

/** Decide por `code`, nunca por el mensaje (AGENTS.md del handoff). */
function ErrorNotice() {
  const error = useMissionStore((s) => s.error)!
  const text: Record<string, string> = {
    ERR_NETWORK: 'The simulation server is unreachable. Check the connection and try again.',
    ERR_UPSTREAM_SERVICE: 'The ephemeris service did not answer. Try again in a moment.',
    ERR_INVALID_COORDINATES: 'Those coordinates are outside the supported area.',
    ERR_INVALID_PAYLOAD: 'Some inputs are not valid. Review the setup and run again.',
    ERR_DATE_OUT_OF_RANGE: 'That date is outside the available ephemeris range.',
    ERR_TERRAIN_UNAVAILABLE: 'There is no terrain data for this spot. Try a nearby catalog site.',
    ERR_NOT_FOUND: 'The console is calling an API route that does not exist. Check the /api/v1 base URL.',
  }
  return (
    <div role="alert" className="flex flex-col gap-1.5 rounded-xl bg-nogo/10 p-3 ring-1 ring-nogo/40">
      <span className="text-[13px] font-bold">Simulation failed</span>
      <span className="text-xs text-ink-2">{text[error.code] ?? 'Something went wrong. Try again.'}</span>
      <span className="tnum font-mono text-[11px] text-ink-3">{error.code}</span>
    </div>
  )
}
