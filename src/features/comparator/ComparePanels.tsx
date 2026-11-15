import { useState } from 'react'
import { Columns2, Eye, Plus, Trash2 } from 'lucide-react'
import { MAX_SCENARIOS, useMissionStore, type Scenario } from '@/core/store/useMissionStore'
import { bestIndex, rank } from '@/core/utils/compare'
import { setCell } from '@/core/utils/countdown'
import { hoursShort, pct } from '@/core/utils/timeline'
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

function useResult(i: number): CompareResponse['results'][number] | undefined {
  return useMissionStore((s) => s.comparison?.results[i])
}

function ScenarioRow({ s, i }: { s: Scenario; i: number }) {
  const shown = useMissionStore((st) => st.shownScenario === s.key)
  const showScenario = useMissionStore((st) => st.showScenario)
  const removeScenario = useMissionStore((st) => st.removeScenario)
  const result = useResult(i)
  return (
    <li className={`flex items-start gap-2.5 rounded-xl p-2.5 ring-1 ${shown ? 'raised ring-white/20' : 'ring-white/8'}`}>
      <Badge i={i} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5"><span className="truncate text-[13px] font-bold">{s.site.label}</span>{result && <StatusChip small status={result.site.status} />}</span>
        <span className="tnum text-xs text-ink-2">{shortDate(s.startUtc)} · {s.startUtc.slice(11, 16)} UTC</span>
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
  const { scenarios, comparison, comparing, compareError, compare, rankBy: priority, setRankBy: setPriority } = useMissionStore()
  const best = comparison ? rank(comparison.results, priority)[0] : undefined
  const bestI = best ? comparison!.results.indexOf(best) : -1
  return (
    <Panel title={<span className="flex items-baseline gap-2"><h2 className="text-base font-bold">Scenarios</h2><Help id="scenario" className="self-center" />
      <span className="text-xs text-ink-3">{scenarios.length} of {MAX_SCENARIOS}</span></span>} label="Scenarios"
      peekAside={`${scenarios.length} of ${MAX_SCENARIOS}`}>
      {scenarios.length > 0 && <ol className="flex flex-col gap-2">{scenarios.map((s, i) => <ScenarioRow key={s.key} s={s} i={i} />)}</ol>}
      <AddScenario />
      {scenarios.length < 2 && <p className="text-xs text-ink-3">Tip: add the same site twice with different dates to see the cost of a launch slip.</p>}
      <Button variant="primary" icon={Columns2} disabled={scenarios.length < 2 || comparing} onClick={() => void compare()}>
        {comparing ? 'Comparing…' : 'Compare scenarios'}
      </Button>
      {compareError && <p role="alert" className="text-xs text-nogo">Comparison failed ({compareError.code}). Try again.</p>}
      {best && (
        <>
          <Divider />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-ink-3">Recommended</span>
            <span className="flex items-center gap-2.5"><Badge i={bestI} size={22} /><span className="text-base font-bold">{scenarios[bestI]?.site.label}</span></span>
            <span className="text-[13px] text-ink-2">{shortDate(scenarios[bestI]?.startUtc ?? '')} · {best.site.status} · sunlight {pct(best.summary.sun_visible_pct, 0)}, Earth {pct(best.summary.earth_visible_pct, 0)}.</span>
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

type Metric = { label: string; sub?: string; get: (r: CompareResponse['results'][number]) => number | null; fmt: (v: number | null) => string; bar?: number; color?: string
  /** Texto propio cuando el número solo no basta (p. ej. sin ocaso: design.md §4.4). */
  text?: (r: CompareResponse['results'][number]) => string }
const METRICS: Metric[] = [
  { label: 'Sunlight', sub: 'share of window', get: (r) => r.summary.sun_visible_pct, fmt: (v) => pct(v), bar: 100, color: 'var(--color-sun)' },
  { label: 'Earth link', sub: 'Direct-to-Earth', get: (r) => r.summary.earth_visible_pct, fmt: (v) => pct(v), bar: 100, color: 'var(--color-earth)' },
  { label: 'Longest daylight', sub: 'continuous', get: (r) => r.summary.max_continuous_sun_hours, fmt: hoursShort, bar: 336, color: 'var(--color-sun)' },
  { label: 'Longest link', sub: 'continuous', get: (r) => r.summary.max_continuous_dte_hours, fmt: hoursShort, bar: 336, color: 'var(--color-earth)' },
  { label: 'First sunset', get: (r) => r.summary.hours_to_next_sunset ?? null, fmt: hoursShort, text: (r) => setCell(r.summary, 'sun') },
  { label: 'First Earthset', get: (r) => r.summary.hours_to_next_earthset ?? null, fmt: hoursShort, text: (r) => setCell(r.summary, 'earth') },
  { label: 'Peak power', get: (r) => r.summary.estimated_peak_power_w, fmt: (v) => (v == null ? '—' : `${Math.round(v).toLocaleString('en-US')} W`) },
  { label: 'Ground slope', get: (r) => r.site.slope_deg, fmt: (v) => (v == null ? '—' : `${v.toFixed(1)}°`) },
]

export function CompareMatrix() {
  const { scenarios, comparison, comparing } = useMissionStore()
  if (scenarios.length < 2 && !comparison) return null
  const results = comparison?.results ?? []
  return (
    <Panel label="Side by side" peekAside={comparing ? 'Comparing…' : `${scenarios.length} scenarios`}
      className="absolute top-0 right-0 max-h-[calc(100%-180px)] w-[min(680px,100%)] gap-0 overflow-y-auto">
      <div className="grid gap-x-4" style={{ gridTemplateColumns: `128px repeat(${scenarios.length}, minmax(0, 1fr))` }}>
        <div className="flex flex-col pb-3"><h2 className="text-[15px] font-bold">Side by side</h2><span className="text-[11px] text-ink-3">Computed by the simulation server</span></div>
        {scenarios.map((s, i) => (
          <div key={s.key} className="flex flex-col gap-1 pb-3">
            <span className="flex items-center gap-2"><Badge i={i} />{results[i] && <StatusChip small status={results[i].site.status} />}</span>
            <span className="truncate text-[13px] font-bold">{s.site.label}</span>
            <span className="text-xs text-ink-2">{shortDate(s.startUtc)}</span>
          </div>
        ))}
        {METRICS.map((m, mi) => {
          const vals = results.map((r) => m.get(r))
          const best = m.bar ? bestIndex(vals.map((v) => v ?? -Infinity)) : null
          return (
            <div key={m.label} className="contents">
              <div className={`flex flex-col py-2.5 ${mi === 0 || mi === 4 ? 'border-t border-hairline' : ''}`}>
                <span className="text-[13px] font-medium">{m.label}</span>{m.sub && <span className="text-[11px] text-ink-3">{m.sub}</span>}
              </div>
              {scenarios.map((s, i) => (
                <div key={s.key} className={`flex flex-col justify-center gap-1.5 py-2.5 ${mi === 0 || mi === 4 ? 'border-t border-hairline' : ''}`}>
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
