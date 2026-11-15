import { useMemo, useState } from 'react'
import { AlertTriangle, Check, Columns2, Copy, Globe2, History as HistoryIcon, Play, Search, Star, Sun, Trash2, X } from 'lucide-react'
import { withViewTransition } from '@/ui/motion'
import { useMissionStore } from '@/core/store/useMissionStore'
import { groupByDay, mergeEntries, useHistoryStore, type HistoryComparison, type HistoryEntry, type HistoryRun } from '@/core/store/useHistoryStore'
import { setCell } from '@/core/utils/countdown'
import { pct } from '@/core/utils/timeline'
import { formatUtc } from '@/core/utils/time'
import { Button, Divider, Input, Panel, Segmented, StatusChip } from '@/ui'
import { NextStepBlock } from '@/features/suggest/NextStepBlock'
import { nextStepHistory } from '@/features/suggest/nextStep'
import { useStepActions } from '@/features/suggest/useStepActions'

type Filter = 'all' | 'starred' | 'GO' | 'NO-GO'
const STATUS_ICON = { GO: [Check, 'var(--color-go)'], CAUTION: [AlertTriangle, 'var(--color-caution)'], 'NO-GO': [X, 'var(--color-nogo)'] } as const
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function RunRow({ r, on, onPick }: { r: HistoryRun; on: boolean; onPick: () => void }) {
  const toggleStar = useHistoryStore((s) => s.toggleStar)
  const [Icon, color] = STATUS_ICON[r.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.CAUTION
  return (
    <li className={`flex items-center gap-3 rounded-xl p-2.5 ring-1 ${on ? 'raised ring-white/20' : 'ring-transparent hover:bg-white/5'}`}>
      <button onClick={onPick} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="raised grid size-[26px] shrink-0 place-items-center rounded-lg" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
          <Icon size={13} aria-label={r.status} /></span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-bold">{r.site.label}</span>
          <span className="truncate text-xs text-ink-2">{shortDate(r.startUtc)} · {r.durationDays} d</span>
        </span>
      </button>
      <span className="flex flex-col items-end gap-1">
        <span className="tnum font-mono text-[11px] text-ink-3">{r.savedAt.slice(11, 16)}</span>
        <button onClick={() => toggleStar(r.id)} aria-label={r.starred ? 'Unstar' : 'Star'} aria-pressed={r.starred}>
          <Star size={13} className={r.starred ? 'text-sun' : 'text-ink-3'} fill={r.starred ? 'currentColor' : 'none'} />
        </button>
      </span>
    </li>
  )
}

/** Una comparación guardada: ícono de Compare, los sitios y cuántos escenarios. */
function ComparisonRow({ c, on, onPick }: { c: HistoryComparison; on: boolean; onPick: () => void }) {
  const toggleStar = useHistoryStore((s) => s.toggleStar)
  const sites = c.scenarios.map((x) => x.site.label).join(' · ')
  return (
    <li className={`flex items-center gap-3 rounded-xl p-2.5 ring-1 ${on ? 'raised ring-white/20' : 'ring-transparent hover:bg-white/5'}`}>
      <button onClick={onPick} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="raised grid size-[26px] shrink-0 place-items-center rounded-lg text-ink-2"><Columns2 size={13} aria-label="Comparison" /></span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span title={sites} className="truncate text-[13px] font-bold">{sites}</span>
          <span className="truncate text-xs text-ink-2">Comparison · {c.scenarios.length} scenarios · {c.durationDays} d</span>
        </span>
      </button>
      <span className="flex flex-col items-end gap-1">
        <span className="tnum font-mono text-[11px] text-ink-3">{c.savedAt.slice(11, 16)}</span>
        <button onClick={() => toggleStar(c.id)} aria-label={c.starred ? 'Unstar' : 'Star'} aria-pressed={c.starred}>
          <Star size={13} className={c.starred ? 'text-sun' : 'text-ink-3'} fill={c.starred ? 'currentColor' : 'none'} />
        </button>
      </span>
    </li>
  )
}

const entryText = (e: HistoryEntry) => e.kind === 'run' ? `${e.site.label} ${e.note} ${e.startUtc}`
  : `${e.scenarios.map((x) => `${x.site.label} ${x.startUtc}`).join(' ')} comparison ${e.note}`
// GO y NO-GO filtran corridas: una comparación junta veredictos distintos
const passes = (e: HistoryEntry, f: Filter) => f === 'all' || (f === 'starred' ? e.starred : e.kind === 'run' && e.status === f)

export function HistoryList() {
  const runs = useHistoryStore((s) => s.runs)
  const comparisons = useHistoryStore((s) => s.comparisons)
  const picked = useMissionStore((s) => s.pickedRun)
  const pickRun = useMissionStore((s) => s.pickRun)
  const act = useStepActions()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const entries = useMemo(() => mergeEntries(runs, comparisons), [runs, comparisons])
  const groups = useMemo(() => groupByDay(entries.filter((e) => passes(e, filter)
    && (!q || entryText(e).toLowerCase().includes(q.toLowerCase())))), [entries, q, filter])
  const count = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
  const empty = nextStepHistory({ runs: entries.length, picked: false })
  if (entries.length === 0 && empty) return (
    <Panel label="History" peekAside="Nothing saved yet">
      <div className="flex flex-col items-center gap-2 pt-3 text-center">
        <span className="raised grid size-11 place-items-center rounded-[14px]"><HistoryIcon size={20} aria-hidden /></span>
        <h2 className="text-base font-bold">Nothing saved yet</h2>
        <p className="text-[13px] text-ink-2">Runs and comparisons stay on this device.</p>
      </div>
      {/* Estado vacío con la misma forma de sugerencia que el resto de la consola (tarea C5) */}
      <NextStepBlock step={empty} onAction={act} />
    </Panel>
  )
  return (
    <Panel label="History" title="History" aside={<span className="text-xs text-ink-3">{count}</span>} peekAside={count} className="h-full">
      <Input icon={Search} placeholder="Search by site, date or note" aria-label="Search history" value={q} onChange={(e) => setQ(e.target.value)} />
      <Segmented size="sm" label="Filter history" value={filter} onChange={setFilter}
        options={[{ value: 'all', label: 'All' }, { value: 'starred', label: 'Starred' }, { value: 'GO', label: 'GO' }, { value: 'NO-GO', label: 'NO-GO' }]} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {groups.map((g) => (
          <section key={g.label} className="flex flex-col gap-1">
            <h3 className="text-[11px] font-bold tracking-wide text-ink-3 uppercase">{g.label}</h3>
            <ul className="flex flex-col gap-1">{g.runs.map((e) => e.kind === 'run'
              ? <RunRow key={e.id} r={e} on={e.id === picked} onPick={() => pickRun(e.id)} />
              : <ComparisonRow key={e.id} c={e} on={e.id === picked} onPick={() => pickRun(e.id)} />)}</ul>
          </section>
        ))}
        {groups.length === 0 && <p className="text-xs text-ink-3">Nothing matches these filters.</p>}
      </div>
      <p className="text-[11px] text-ink-3">Every run and comparison is saved on this device only.</p>
    </Panel>
  )
}

/** Detalle de una comparación guardada: el resumen de cada escenario tal como respondió el servidor. */
function ComparisonDetails({ c }: { c: HistoryComparison }) {
  const { remove, setNote, toggleStar } = useHistoryStore()
  const { pickRun, restoreComparison } = useMissionStore()
  return (
    <Panel label="Comparison details" title="Comparison" aside={<button onClick={() => toggleStar(c.id)} aria-label={c.starred ? 'Unstar' : 'Star'}>
      <Star size={15} className={c.starred ? 'text-sun' : 'text-ink-3'} fill={c.starred ? 'currentColor' : 'none'} /></button>}>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-ink-2">{c.scenarios.length} scenarios · {c.durationDays} days</p>
        <p className="tnum font-mono text-[11px] text-ink-3">Saved {formatUtc(c.savedAt)}</p>
      </div>
      <Divider />
      <ul className="flex flex-col gap-3">
        {c.scenarios.map((x, i) => (
          <li key={`${x.site.lat},${x.site.lon},${x.startUtc}`} className="flex flex-col gap-1">
            <span className="flex items-center gap-2"><span className="raised grid size-5 shrink-0 place-items-center rounded-md text-[11px] font-bold">{String.fromCharCode(65 + i)}</span>
              <span title={x.site.label} className="min-w-0 truncate text-[13px] font-bold">{x.site.label}</span><StatusChip small status={x.status} /></span>
            <span className="tnum pl-7 text-xs text-ink-2">{shortDate(x.startUtc)} · Sun {pct(x.summary.sun_visible_pct)} · Earth {pct(x.summary.earth_visible_pct)}</span>
          </li>
        ))}
      </ul>
      <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-ink-3">Note</span>
        <textarea value={c.note} onChange={(e) => setNote(c.id, e.target.value)} rows={2} placeholder="Why this comparison matters"
          className="inset-well resize-none rounded-xl px-3 py-2 text-[13px] ring-1 ring-white/10 outline-none focus:ring-earth/70" /></label>
      <Divider />
      <div className="flex flex-col gap-2">
        <Button variant="primary" icon={Columns2} onClick={() => withViewTransition(() => { void restoreComparison(c) })}>Open in Compare</Button>
        <Button variant="danger" icon={Trash2} className="justify-start" onClick={() => { remove(c.id); pickRun(null) }}>Delete comparison</Button>
      </div>
    </Panel>
  )
}

export function RunDetails() {
  const runs = useHistoryStore((s) => s.runs)
  const comparisons = useHistoryStore((s) => s.comparisons)
  const { remove, setNote, toggleStar } = useHistoryStore()
  const { pickedRun, pickRun, select, setConfig, evaluate, setWorkspace, addScenario } = useMissionStore()
  const r = runs.find((x) => x.id === pickedRun)
  const c = comparisons.find((x) => x.id === pickedRun)
  const total = runs.length + comparisons.length
  const pick = nextStepHistory({ runs: total, picked: !!r || !!c })
  if (c) return <ComparisonDetails c={c} />
  if (!r) return total && pick ? <Panel label="Run details" peekAside="Pick a run"><NextStepBlock step={pick} onAction={() => {}} /></Panel> : null
  const load = () => {
    select(r.site)
    // Las corridas guardadas desde la tarea A7 traen sus paneles; las viejas conservan los de Setup.
    setConfig({ startUtc: r.startUtc, durationDays: r.durationDays, stepMinutes: r.stepMinutes,
      ...(r.panelAreaM2 !== undefined && r.panelEfficiency !== undefined ? { panelAreaM2: r.panelAreaM2, panelEfficiency: r.panelEfficiency } : {}) })
    withViewTransition(() => setWorkspace('simulate'))
  }
  const s = r.summary
  return (
    <Panel label="Run details" title="Run details" aside={<button onClick={() => toggleStar(r.id)} aria-label={r.starred ? 'Unstar' : 'Star'}>
      <Star size={15} className={r.starred ? 'text-sun' : 'text-ink-3'} fill={r.starred ? 'currentColor' : 'none'} /></button>}>
      <div className="flex flex-col gap-1.5">
        <StatusChip status={r.status} />
        <h3 className="text-xl font-bold">{r.site.label}</h3>
        <p className="text-xs text-ink-2">{formatUtc(r.startUtc)} · {r.durationDays} days · {r.stepMinutes} min step</p>
        <p className="tnum font-mono text-[11px] text-ink-3">Saved {formatUtc(r.savedAt)}</p>
      </div>
      <Divider />
      <dl className="flex flex-col gap-1 text-xs">
        {([[Sun, 'text-sun', 'Sunlight', pct(s.sun_visible_pct)], [Globe2, 'text-earth', 'Earth link', pct(s.earth_visible_pct)],
          [Sun, 'text-sun', 'Next sunset', setCell(s, 'sun')],
          [Globe2, 'text-earth', 'Next Earthset', setCell(s, 'earth')]] as const).map(([I, c, k, v]) => (
          <div key={k} className="flex h-6 items-center justify-between"><dt className="flex items-center gap-2 text-ink-2"><I size={13} className={c} aria-hidden />{k}</dt>
            <dd className="tnum font-mono text-[13px]">{v}</dd></div>))}
      </dl>
      <label className="flex flex-col gap-1.5"><span className="text-xs font-medium text-ink-3">Note</span>
        <textarea value={r.note} onChange={(e) => setNote(r.id, e.target.value)} rows={2} placeholder="Why this run matters"
          className="inset-well resize-none rounded-xl px-3 py-2 text-[13px] ring-1 ring-white/10 outline-none focus:ring-earth/70" /></label>
      <Divider />
      <div className="flex flex-col gap-2">
        <Button variant="primary" icon={Play} iconFill onClick={() => { load(); void evaluate() }}>Open in Simulate</Button>
        <Button icon={Copy} onClick={load} className="justify-start">Duplicate and edit</Button>
        <Button icon={Columns2} className="justify-start"
          onClick={() => { addScenario({ label: `${r.site.label} (${r.startUtc.slice(0, 10)})`, site: r.site, startUtc: r.startUtc }); withViewTransition(() => setWorkspace('compare')) }}>Add to Compare</Button>
        <Button variant="danger" icon={Trash2} className="justify-start" onClick={() => { remove(r.id); pickRun(null) }}>Delete run</Button>
      </div>
    </Panel>
  )
}
