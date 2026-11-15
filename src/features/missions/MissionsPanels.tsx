import { useMemo, useState } from 'react'
import { ExternalLink, Globe2, Info, Mountain, Play, Search, Sun } from 'lucide-react'
import { withViewTransition } from '@/ui/motion'
import { useMissionStore } from '@/core/store/useMissionStore'
import { fmtCoord } from '@/core/utils/coordinates'
import { deg } from '@/core/utils/timeline'
import { formatUtc } from '@/core/utils/time'
import { Button, Divider, IconWell, Input, Panel, SectionTitle, Segmented, Skeleton, StatusChip } from '@/ui'
import { Help } from '@/features/help/Help'
import { VerdictList } from '@/features/simulate/VerdictList'
import { NextStepBlock } from '@/features/suggest/NextStepBlock'
import { nextStepMissions } from '@/features/suggest/nextStep'
import { MISSIONS, REGION_LABEL, missionDisagrees, replayStart, type Mission, type MissionRegion } from './missions'

const REGION_COLOR: Record<MissionRegion, string> = { 'south-pole': 'var(--color-psr)', 'far-side': 'var(--color-sun)', 'near-side': 'var(--color-earth)' }

function Monogram({ m }: { m: Mission }) {
  const c = REGION_COLOR[m.region]
  return <span className="raised tnum grid size-9 shrink-0 place-items-center rounded-[10px] font-mono text-[11px] font-medium"
    style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{m.code}</span>
}

export function MissionsList() {
  const picked = useMissionStore((s) => s.pickedMission)
  const onPick = useMissionStore((s) => s.pickMission)
  const [q, setQ] = useState('')
  const [region, setRegion] = useState<'all' | MissionRegion>('all')
  const list = useMemo(() => MISSIONS.filter((m) => (region === 'all' || m.region === region)
    && (!q || `${m.name} ${m.operator}`.toLowerCase().includes(q.toLowerCase()))), [q, region])
  return (
    <Panel label="Missions" peek="Recreate a mission" peekAside={`${MISSIONS.length} landings`} className="h-full">
      <div className="flex flex-col gap-1"><h2 className="text-base font-bold">Recreate a mission</h2>
        <p className="text-xs text-ink-2">Load a real landing and replay its light and Earth view.</p></div>
      <Input icon={Search} placeholder="Search missions or agencies" aria-label="Search missions" value={q} onChange={(e) => setQ(e.target.value)} />
      <Segmented size="sm" label="Region" value={region} onChange={setRegion}
        options={[{ value: 'all', label: 'All' }, { value: 'south-pole', label: 'South pole' }, { value: 'near-side', label: 'Near side' }, { value: 'far-side', label: 'Far side' }]} />
      <ul className="flex flex-col gap-1">
        {list.map((m) => {
          const on = m.id === picked
          return (
            <li key={m.id}>
              <button onClick={() => onPick(m.id)} aria-pressed={on}
                className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ring-1 ${on ? 'raised ring-white/20' : 'ring-transparent hover:bg-white/5'}`}>
                <Monogram m={m} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-bold">{m.name}</span>
                  <span className="truncate text-xs text-ink-2">{m.operator} · {new Date(m.touchdownUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                </span>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="p-2 text-xs text-ink-3">No mission matches that search.</li>}
      </ul>
      <p className="mt-auto flex gap-2 text-[11px] text-ink-3"><Info size={13} className="mt-px shrink-0" aria-hidden />
        Times and sites from public mission records, cited on each mission. Outside -80° the terrain comes from the global map at lower resolution.</p>
    </Panel>
  )
}

function Condition({ icon, signal, label, value, note }: { icon: typeof Sun; signal: 'sun' | 'earth' | 'regolith'; label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start gap-3">
      <IconWell icon={icon} signal={signal} size={28} />
      <div className="flex flex-col gap-0.5"><span className="text-[11px] font-medium text-ink-3">{label}</span>
        <span className="text-[15px] font-bold">{value}</span>{note && <span className="text-[11px] text-ink-2">{note}</span>}</div>
    </div>
  )
}

export function MissionBrief() {
  const id = useMissionStore((s) => s.pickedMission)
  const m = MISSIONS.find((x) => x.id === id) ?? MISSIONS[0]
  const { select, setConfig, evaluate, setWorkspace, selected, evaluation, loading, error } = useMissionStore()
  const loaded = selected?.id === `mission:${m.id}` && evaluation
  const t0 = loaded ? evaluation.timeline[0] : undefined
  const step = nextStepMissions({ picked: true, replayed: !!loaded && !loading })
  const load = async () => {
    select({ id: `mission:${m.id}`, lat: m.lat, lon: m.lon, label: m.name, category: m.operator })
    setConfig({ startUtc: replayStart(m.touchdownUtc), durationDays: 14 })
    await evaluate()
  }
  return (
    <Panel label="Mission brief" peek={m.name} peekAside={<span className="tnum font-mono">{m.touchdownUtc.slice(0, 10)}</span>}>
      <div className="flex items-center gap-3"><Monogram m={m} />
        <div className="flex flex-col"><h2 className="text-lg font-bold">{m.name}</h2><span className="text-xs text-ink-2">{m.operator}</span></div></div>
      <dl className="flex flex-col gap-1 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Touchdown</dt>
          <dd className="tnum font-mono">{formatUtc(m.touchdownUtc)}{m.approximate ? ' (approx.)' : ''}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Region</dt><dd>{REGION_LABEL[m.region]}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ink-2">Coordinates</dt><dd className="tnum font-mono">{fmtCoord(m.lat, m.lon)}</dd></div>
      </dl>
      <p className="text-[13px] leading-[19px] text-ink-2">{m.summary}</p>
      <Divider />
      <SectionTitle>Conditions at touchdown</SectionTitle>
      {loading ? <div className="flex flex-col gap-3"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
        : error && selected?.id === `mission:${m.id}` ? <p role="alert" className="text-xs text-nogo">Could not load this landing ({error.code}).</p>
        : t0 ? <>
          <Condition icon={Sun} signal="sun" label="Sun" value={t0.sun_visible ? `${deg(t0.sun_el_deg, 1)} above horizon` : 'Below the terrain'} />
          <Condition icon={Globe2} signal="earth" label="Earth" value={t0.earth_visible ? 'In view' : 'Hidden'}
            note={t0.earth_visible ? 'Direct radio link possible.' : 'No direct radio link from here.'} />
          <Condition icon={Mountain} signal="regolith" label="Ground" value={`${evaluation!.site.slope_deg.toFixed(1)}° slope`} />
          {/* El veredicto de la ventana de 14 días desde el alunizaje, con su porqué (M-01) */}
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1"><StatusChip status={evaluation!.site.status} /><Help id="verdict" /></span>
            <VerdictList site={evaluation!.site} />
          </div>
          {missionDisagrees(m, evaluation!.summary.earth_visible_pct) && (
            <p role="note" className="rounded-xl bg-caution/10 px-3 py-2 text-xs text-ink-2 ring-1 ring-caution/40">
              The mission record and this simulation disagree on Earth visibility. Check the data source.</p>)}
        </> : <p className="text-xs text-ink-2">Replay the landing to compute the Sun, Earth and ground at that moment.</p>}
      <Divider />
      <div className="flex flex-col gap-2">
        {step && <NextStepBlock step={step} onAction={() => withViewTransition(() => setWorkspace('simulate'))} announce={step.text} />}
        <Button variant={step ? 'secondary' : 'primary'} icon={Play} iconFill disabled={loading} onClick={() => void load()}>{loaded ? 'Replay again' : 'Replay landing window'}</Button>
      </div>
      <details className="text-[11px] text-ink-3">
        <summary className="cursor-pointer">Sources</summary>
        <ul className="mt-1.5 flex flex-col gap-1">{m.sources.map((s) => <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink">{s.label}<ExternalLink size={11} aria-hidden /></a></li>)}</ul>
      </details>
    </Panel>
  )
}
