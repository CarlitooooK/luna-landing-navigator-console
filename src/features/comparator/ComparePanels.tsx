import { useState } from 'react'
import { Columns2, Eye, Plus, Trash2 } from 'lucide-react'
import { MAX_SCENARIOS, useMissionStore, type Scenario } from '@/core/store/useMissionStore'
import { bestIndex, rank, score, type Priority } from '@/core/utils/compare'
import { fmtCoord } from '@/core/utils/coordinates'
import { setCell, setCellPlain } from '@/core/utils/countdown'
import { atMidnight, shiftDays } from '@/core/utils/scenarios'
import { NextStepBlock } from '@/features/suggest/NextStepBlock'
import { nextStepCompare, type ActionId } from '@/features/suggest/nextStep'
import { focusLater, useStepActions } from '@/features/suggest/useStepActions'
import { withViewTransition } from '@/ui/motion'
import { hoursShort, pct, pctWhole } from '@/core/utils/timeline'
import { Button, Divider, Field, IconButton, Input, Panel, Segmented, Skeleton, StatusChip } from '@/ui'
import type { CompareResponse } from '@/types'
import { Help } from '@/features/help/Help'

const BADGE = ['#F4F1EA', '#C9B8FF', '#FFD9A8', '#A8E6CF', '#FFB3C1'] // A..E (Figma)
const letter = (i: number) => String.fromCharCode(65 + i)
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function Badge({ i, size = 24 }: { i: number; size?: number }) {
  return <span className="raised grid shrink-0 place-items-center rounded-[7px] text-xs font-bold text-[#0a0d13]"
    style={{ width: size, height: size, background: `linear-gradient(180deg, color-mix(in srgb, ${BADGE[i]} 55%, white), ${BADGE[i]})` }}>{letter(i)}</span>
}

/** Simple habla en lenguaje llano; Detailed muestra todas las cifras del servidor (C-06 del audit). */
const useDetailed = () => useMissionStore((s) => s.detail === 'detailed')

function useResult(i: number): CompareResponse['results'][number] | undefined {
  return useMissionStore((s) => s.comparison?.results[i])
}

function ScenarioRow({ s, i }: { s: Scenario; i: number }) {
  const shown = useMissionStore((st) => st.shownScenario === s.key)
  const showScenario = useMissionStore((st) => st.showScenario)
  const removeScenario = useMissionStore((st) => st.removeScenario)
  // El ojo evalúa el escenario: se ve si está cargando o si falló (C-03).
  const loading = useMissionStore((st) => shown && st.loading)
  const failed = useMissionStore((st) => (shown && !st.loading ? st.error?.code : undefined))
  const result = useResult(i)
  const detailed = useDetailed()
  return (
    <li className={`flex items-start gap-2.5 rounded-xl p-2.5 ring-1 ${shown ? 'raised ring-white/20' : 'ring-white/8'}`}>
      <Badge i={i} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Nombre solo en su fila: junto a la etiqueta de estado y los dos botones, se truncaba a 3 o 4 letras */}
        <span title={s.site.label} className="truncate text-[13px] font-bold">{s.site.label}</span>
        {/* En Simple todo escenario arranca a las 00:00 UTC: la hora no aporta. Detailed la muestra, con las coordenadas */}
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1"><span className="tnum text-xs whitespace-nowrap text-ink-2">{shortDate(s.startUtc)}</span>{result && <StatusChip small status={result.site.status} />}</span>
        {detailed && <span className="tnum flex flex-col font-mono text-[10px] whitespace-nowrap text-ink-3">
          <span>{s.startUtc.slice(11, 16)} UTC</span><span>{fmtCoord(s.site.lat, s.site.lon)}</span></span>}
        {loading && <span role="status" className="text-xs text-ink-3">Loading on the globe…</span>}
        {failed && <span role="alert" className="text-xs text-nogo">Could not load it ({failed}). Try the eye again.</span>}
      </div>
      <IconButton icon={Eye} label={`Show ${letter(i)} on the globe`} active={shown} onClick={() => void showScenario(s.key)} className="size-8" />
      <IconButton icon={Trash2} label={`Remove ${letter(i)}`} onClick={() => removeScenario(s.key)} className="size-8" />
    </li>
  )
}

function AddScenario() {
  const { sites, selected, startUtc, scenarios, addScenario } = useMissionStore()
  const [siteId, setSiteId] = useState(selected?.id ?? '')
  const [date, setDate] = useState(startUtc.slice(0, 10))
  const [dup, setDup] = useState(false)
  const full = scenarios.length >= MAX_SCENARIOS
  const site = sites.find((x) => x.id === siteId)
  const add = () => {
    if (!site) return
    const ok = addScenario({ label: `${site.name} (${date})`, startUtc: `${date}T00:00:00Z`,
      site: { id: site.id, lat: site.lat, lon: site.lon, label: site.name, category: site.category } })
    setDup(!ok && !full)
  }
  if (full) return <p className="text-xs text-ink-3">Five scenarios is the limit. Remove one to add another.</p>
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-1 gap-2">
        <Field label="Site">
          <select aria-label="Scenario site" value={siteId} onChange={(e) => setSiteId(e.target.value)}
            className="inset-well h-10 min-w-0 rounded-xl px-2.5 text-[13px] font-medium ring-1 ring-white/10 [color-scheme:dark]">
            <option value="" disabled>Choose…</option>
            {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Landing date (UTC)"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      </div>
      <Button icon={Plus} disabled={!site} onClick={add} className="h-10 border border-dashed border-white/25">Add scenario</Button>
      {dup && <p role="alert" className="text-xs text-caution">That site and date are already in the list.</p>}
    </div>
  )
}

export function ScenariosPanel() {
  const { scenarios, comparison, comparing, compareError, compare, rankBy: priority, setRankBy: setPriority, selected } = useMissionStore()
  const best = comparison ? rank(comparison.results, priority)[0] : undefined
  const bestI = best ? comparison!.results.indexOf(best) : -1
  const leastBad = best?.site.status === 'NO-GO'
  const step = nextStepCompare({ count: scenarios.length, hasSite: !!selected, comparing, error: compareError?.code ?? null,
    best: best && scenarios[bestI] ? { letter: letter(bestI), site: scenarios[bestI].site.label, startUtc: scenarios[bestI].startUtc, status: best.site.status } : null })
  const act = useCompareActions(bestI)
  // Una sola tecla luminosa: "Compare scenarios" mientras haya algo que comparar; después, la acción de Next step.
  const compareIsPrimary = scenarios.length >= 2 && !comparison && !compareError
  const detailed = useDetailed()
  return (
    <Panel title={<span className="flex items-baseline gap-2"><h2 className="text-base font-bold">Scenarios</h2><Help id="scenario" className="self-center" />
      <span className="text-xs text-ink-3">{scenarios.length} of {MAX_SCENARIOS}</span></span>} label="Scenarios"
      peekAside={`${scenarios.length} of ${MAX_SCENARIOS}`}>
      {scenarios.length > 0 && <ol className="flex flex-col gap-2">{scenarios.map((s, i) => <ScenarioRow key={s.key} s={s} i={i} />)}</ol>}
      <AddScenario />
      {step && <NextStepBlock step={step} onAction={act} primary={!compareIsPrimary} announce={step.text} />}
      <Button variant={compareIsPrimary || scenarios.length < 2 ? 'primary' : 'secondary'} icon={Columns2} disabled={scenarios.length < 2 || comparing} onClick={() => void compare()}>
        {comparing ? 'Comparing…' : 'Compare scenarios'}
      </Button>
      {best && (
        <>
          <Divider />
          <div className="flex flex-col gap-2">
            {/* Si el primero del ranking es NO-GO, no se recomienda: es el menos malo (C-02) */}
            <span className={`text-xs font-medium ${leastBad ? 'text-nogo' : 'text-ink-3'}`}>{leastBad ? 'Least bad · still NO-GO' : 'Recommended'}</span>
            <span className="flex items-center gap-2.5"><Badge i={bestI} size={22} /><span className="text-base font-bold">{scenarios[bestI]?.site.label}</span></span>
            {detailed ? <>
              <span className="text-[13px] text-ink-2">{shortDate(scenarios[bestI]?.startUtc ?? '')} · {best.site.status} · sunlight {pct(best.summary.sun_visible_pct)}, Earth link {pct(best.summary.earth_visible_pct)}.</span>
              <span className="tnum text-xs text-ink-3">{RANK_RULE[priority]} Score {score(best, priority).toFixed(1)}.</span>
            </> : <span className="text-[13px] text-ink-2">{shortDate(scenarios[bestI]?.startUtc ?? '')}. {PLAIN_STATUS[best.site.status] ?? best.site.status}: sunlight {pctWhole(best.summary.sun_visible_pct)} of the time, Earth in view {pctWhole(best.summary.earth_visible_pct)}. {PLAIN_WHY[priority]}</span>}
          </div>
          <Field label="Rank by" help={<Help id="rank-by" />}>
            <Segmented label="Rank by" value={priority} onChange={setPriority}
              options={[{ value: 'balanced', label: 'Balanced' }, { value: 'power', label: 'Sunlight' }, { value: 'earth', label: 'Earth link' }]} />
          </Field>
        </>
      )}
    </Panel>
  )
}

type Result = CompareResponse['results'][number]
type Metric = { label: string; sub?: string; get: (r: Result) => number | null; fmt: (v: number | null) => string; bar?: number; color?: string
  /** Texto propio cuando el número solo no basta (p. ej. sin ocaso: design.md §4.4). */
  text?: (r: Result) => string
  /** Primera fila de un grupo: lleva la línea divisoria arriba. */
  group?: boolean }

const sunPct = (r: Result) => r.summary.sun_visible_pct
const earthPct = (r: Result) => r.summary.earth_visible_pct
const slope = (r: Result) => r.site.slope_deg
const degrees = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}°`)

/** Simple: cuatro filas en lenguaje llano y porcentajes enteros, los mismos términos que Results en Simple. */
const SIMPLE_METRICS: Metric[] = [
  { label: 'Daylight', sub: 'time with the Sun up', get: sunPct, fmt: pctWhole, bar: 100, color: 'var(--color-sun)', group: true },
  { label: 'Talk to Earth', sub: 'time with Earth in view', get: earthPct, fmt: pctWhole, bar: 100, color: 'var(--color-earth)' },
  { label: 'First sunset', get: (r) => r.summary.hours_to_next_sunset ?? null, fmt: hoursShort, text: (r) => setCellPlain(r.summary, 'sun'), group: true },
  { label: 'Ground slope', get: slope, fmt: degrees },
]

/** Detailed: todas las cifras del resumen de `/compare`, con un decimal y en horas. */
const DETAILED_METRICS: Metric[] = [
  { label: 'Sunlight', sub: 'share of window', get: sunPct, fmt: (v) => pct(v), bar: 100, color: 'var(--color-sun)', group: true },
  { label: 'Earth link', sub: 'Direct-to-Earth', get: earthPct, fmt: (v) => pct(v), bar: 100, color: 'var(--color-earth)' },
  { label: 'Longest daylight', sub: 'continuous', get: (r) => r.summary.max_continuous_sun_hours, fmt: hoursShort, bar: 336, color: 'var(--color-sun)' },
  { label: 'Longest link', sub: 'continuous', get: (r) => r.summary.max_continuous_dte_hours, fmt: hoursShort, bar: 336, color: 'var(--color-earth)' },
  { label: 'First sunset', get: (r) => r.summary.hours_to_next_sunset ?? null, fmt: hoursShort, text: (r) => setCell(r.summary, 'sun'), group: true },
  { label: 'First Earthset', get: (r) => r.summary.hours_to_next_earthset ?? null, fmt: hoursShort, text: (r) => setCell(r.summary, 'earth') },
  { label: 'Peak power', get: (r) => r.summary.estimated_peak_power_w, fmt: (v) => (v == null ? '—' : `${Math.round(v).toLocaleString('en-US')} W`), group: true },
  { label: 'Average factor', sub: 'solar power, 0 to 1', get: (r) => r.summary.avg_power_factor, fmt: (v) => (v == null ? '—' : v.toFixed(2)) },
  { label: 'Ground slope', get: slope, fmt: degrees, group: true },
  { label: 'Elevation', sub: 'site height', get: (r) => r.site.elevation_m, fmt: (v) => (v == null ? '—' : `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} m`) },
  { label: 'Nearest PSR', sub: 'to its edge', get: (r) => r.site.nearest_psr_km ?? null, fmt: (v) => (v == null ? '—' : `${v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`) },
]

/** Veredicto en palabras para "Recommended" en Simple (los mismos títulos que Results). */
const PLAIN_STATUS: Record<string, string> = { GO: 'A good place to land', CAUTION: 'Possible, with risks', 'NO-GO': 'Not a safe choice' }
/** Por qué gana, según "Rank by". El orden pone primero el veredicto (`rank`). */
const PLAIN_WHY: Record<Priority, string> = {
  balanced: 'It has the most sunlight and time with Earth in view, added together, among the options with the best verdict.',
  power: 'It has the most sunlight among the options with the best verdict.',
  earth: 'It has the most time with Earth in view among the options with the best verdict.',
}
/** La regla exacta del orden, para Detailed. */
const RANK_RULE: Record<Priority, string> = {
  balanced: 'Ranked by verdict, then sunlight % + Earth link %.',
  power: 'Ranked by verdict, then sunlight %.',
  earth: 'Ranked by verdict, then Earth link %.',
}

export function CompareMatrix() {
  const { scenarios, comparison, comparing } = useMissionStore()
  const detailed = useDetailed()
  if (scenarios.length < 2 && !comparison) return null
  const results = comparison?.results ?? []
  const metrics = detailed ? DETAILED_METRICS : SIMPLE_METRICS
  return (
    <Panel label="Side by side" peekAside={comparing ? 'Comparing…' : `${scenarios.length} scenarios`}
      // Termina encima del timeline (≈208 px de alto + 16 de separación); con 180 tapaba su fila de controles
      className="absolute top-0 right-0 max-h-[calc(100%-224px)] w-[min(680px,100%)] gap-0 overflow-y-auto">
      <div className="grid gap-x-4" style={{ gridTemplateColumns: `128px repeat(${scenarios.length}, minmax(0, 1fr))` }}>
        <div className="flex flex-col pb-3"><h2 className="text-[15px] font-bold">Side by side</h2><span className="text-[11px] text-ink-3">Computed by the simulation server</span></div>
        {scenarios.map((s, i) => (
          <div key={s.key} className="flex flex-col gap-1 pb-3">
            <span className="flex items-center gap-2"><Badge i={i} />{results[i] && <StatusChip small status={results[i].site.status} />}</span>
            <span className="truncate text-[13px] font-bold">{s.site.label}</span>
            <span className="text-xs text-ink-2">{shortDate(s.startUtc)}</span>
          </div>
        ))}
        {metrics.map((m) => {
          const vals = results.map((r) => m.get(r))
          const best = m.bar ? bestIndex(vals.map((v) => v ?? -Infinity)) : null
          return (
            <div key={m.label} className="contents">
              <div className={`flex flex-col py-2.5 ${m.group ? 'border-t border-hairline' : ''}`}>
                <span className="text-[13px] font-medium">{m.label}</span>{m.sub && <span className="text-[11px] text-ink-3">{m.sub}</span>}
              </div>
              {scenarios.map((s, i) => (
                <div key={s.key} className={`flex flex-col justify-center gap-1.5 py-2.5 ${m.group ? 'border-t border-hairline' : ''}`}>
                  {comparing || !results[i] ? <Skeleton className="h-3.5 w-16" /> : <>
                    <span className="flex items-baseline gap-1.5">
                      <span className={`tnum font-mono text-sm ${best === i ? 'font-medium text-ink' : 'text-ink-2'}`}>{m.text ? m.text(results[i]) : m.fmt(vals[i])}</span>
                      {best === i && <span className="text-[11px] font-bold text-go">Best</span>}
                    </span>
                    {m.bar && vals[i] != null && <span className="inset-well block h-[5px] w-full max-w-[140px] overflow-hidden rounded-full">
                      <span className="glow block h-full rounded-full" style={{ width: `${(vals[i]! / m.bar) * 100}%`, color: m.color, background: m.color, opacity: best === i ? 1 : 0.6 }} /></span>}
                  </>}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {!comparison && !comparing && <p className="pt-2 text-xs text-ink-3">Press “Compare scenarios” to fill the table.</p>}
      <p className="pt-3 text-[11px] text-ink-3">Click the eye on a scenario to see it on the globe with its full timeline.</p>
    </Panel>
  )
}

/** Acciones de Next step en Compare (§3.6): agregar la simulación actual o +7 días, abrir el mejor en Simulate. */
function useCompareActions(bestI: number): (id: ActionId) => void {
  const st = useMissionStore()
  const common = useStepActions()
  return (id) => {
    const first = st.scenarios[0]
    switch (id) {
      case 'add-current':
        if (st.selected) st.addScenario({ label: `${st.selected.label} (${st.startUtc.slice(0, 10)})`, site: st.selected, startUtc: atMidnight(st.startUtc) })
        break
      case 'add-plus-7': {
        const d = first && shiftDays(first.startUtc, 7)
        if (first && d) st.addScenario({ label: `${first.site.label} (${d.slice(0, 10)})`, site: first.site, startUtc: d })
        break
      }
      case 'open-in-simulate': {
        const sc = st.scenarios[bestI]
        if (sc) { void st.showScenario(sc.key); withViewTransition(() => st.setWorkspace('simulate')) }
        break
      }
      case 'focus-scenario-site': focusLater('select[aria-label="Scenario site"]'); break
      default: common(id)
    }
  }
}
