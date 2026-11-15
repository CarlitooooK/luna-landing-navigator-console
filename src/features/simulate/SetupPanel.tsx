import { useEffect, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Bookmark, BookmarkCheck, ChevronRight, MapPin, Play, Search, Zap } from 'lucide-react'
import { STEP_OPTIONS, useMissionStore, type SelectedSite } from '@/core/store/useMissionStore'
import { useHistoryStore } from '@/core/store/useHistoryStore'
import { parseUtcTime, toUtcIso } from '@/core/utils/time'
import { fmtCoord } from '@/core/utils/coordinates'
import { isStale } from '@/core/utils/stale'
import { Button, Divider, Field, IconButton, IconWell, Input, Panel, SectionTitle, Segmented } from '@/ui'
import type { Site } from '@/types'
import { isComboboxKey, moveActive, type ComboboxKey } from './combobox'
import { Help } from '@/features/help/Help'

const DURATIONS_SIMPLE = [{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 29.5, label: 'Full cycle' }]
const DURATIONS_DETAILED = [{ value: 7, label: '7 d' }, { value: 14, label: '14 d' }, { value: 29.5, label: '29.5 d' }]

// Rangos del contrato (openapi.json; D-010 abrió la latitud a [-90, 90]).
const latError = (v: number) => (Number.isFinite(v) && v >= -90 && v <= 90 ? undefined : 'Latitude must be between -90° and 90°.')
const lonError = (v: number) => (Number.isFinite(v) && v >= -180 && v <= 360 ? undefined : 'Longitude must be between -180° and 360°.')

const toSelected = (s: Site): SelectedSite => ({ id: s.id, lat: s.lat, lon: s.lon, label: s.name, category: s.category })

function SiteSearch() {
  const sites = useMissionStore((s) => s.sites)
  const select = useMissionStore((s) => s.select)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = useMemo(() => {
    const k = q.trim().toLowerCase()
    return sites.filter((s) => !k || s.name.toLowerCase().includes(k) || s.category.toLowerCase().includes(k)).slice(0, 6)
  }, [q, sites])
  const shown = open && matches.length > 0
  const close = () => { setOpen(false); setActive(-1) }
  const choose = (s: Site) => { select(toSelected(s)); setQ(''); close() }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComboboxKey(e.key)) {
      // Home y End solo navegan la lista si está abierta; si no, mueven el cursor del texto.
      if (!shown && (e.key === 'Home' || e.key === 'End')) return
      e.preventDefault()
      setOpen(true)
      setActive((i) => moveActive(i, e.key as ComboboxKey, matches.length))
    } else if (e.key === 'Enter' && shown && active >= 0 && matches[active]) {
      e.preventDefault()
      choose(matches[active])
    } else if (e.key === 'Escape') {
      if (shown) { e.preventDefault(); close() } else if (q) { e.preventDefault(); setQ('') }
    }
  }
  // Se cierra cuando el foco sale del buscador y su lista, no por tiempo (el clic en una opción ya no compite con el blur).
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close()
  }
  return (
    <div className="relative" onBlur={onBlur}>
      <Input icon={Search} placeholder={`Search ${sites.length || ''} sites`.replace('  ', ' ')} value={q}
        role="combobox" aria-expanded={shown} aria-controls="site-results" aria-autocomplete="list" aria-label="Search landing sites"
        aria-activedescendant={shown && active >= 0 ? `site-option-${active}` : undefined}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1) }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} />
      {shown && (
        <ul id="site-results" role="listbox" aria-label="Landing sites" className="glass glass-strong drip absolute inset-x-0 top-12 z-20 flex flex-col gap-0.5 rounded-xl p-1.5">
          {matches.map((s, i) => (
            <li key={s.id} id={`site-option-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s)} onMouseMove={() => setActive(i)}
              className={`flex w-full cursor-pointer flex-col items-start rounded-lg px-2.5 py-1.5 text-left transition-[background-color,translate] duration-200 ${i === active ? 'translate-x-0.5 bg-white/8' : ''}`}>
              <span className="text-[13px] font-bold">{s.name}</span>
              <span className="text-xs text-ink-3">{s.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SelectedCard() {
  const selected = useMissionStore((s) => s.selected)
  if (!selected) return <p className="text-[13px] text-ink-3">No site selected yet. Pick one from the list or click the globe.</p>
  return (
    <div key={`${selected.lat},${selected.lon}`} className="raised condense flex items-start gap-3 rounded-[14px] p-3 ring-1 ring-white/15">
      <IconWell icon={MapPin} signal="ink" size={34} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold">{selected.label}</span>
        {selected.category && <span className="text-xs text-ink-2">{selected.category}</span>}
        <span className="tnum font-mono text-xs text-ink-3">{fmtCoord(selected.lat, selected.lon)}</span>
      </div>
    </div>
  )
}

function CustomCoords() {
  const selected = useMissionStore((s) => s.selected)
  const select = useMissionStore((s) => s.select)
  const [lat, setLat] = useState(String(selected?.lat ?? -89.66))
  const [lon, setLon] = useState(String(selected?.lon ?? 222.7))
  const le = latError(Number(lat)), oe = lonError(Number(lon))
  const commit = (la: string, lo: string) => {
    if (!latError(Number(la)) && !lonError(Number(lo))) select({ lat: Number(la), lon: Number(lo), label: 'Custom pin' })
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Latitude" help={<Help id="latitude" />} error={le ? ' ' : undefined}><Input mono suffix="°" inputMode="decimal" value={lat} invalid={!!le}
          onChange={(e) => { setLat(e.target.value); commit(e.target.value, lon) }} /></Field>
        <Field label="Longitude" help={<Help id="longitude" />} error={oe ? ' ' : undefined}><Input mono suffix="°E" inputMode="decimal" value={lon} invalid={!!oe}
          onChange={(e) => { setLon(e.target.value); commit(lat, e.target.value) }} /></Field>
      </div>
      {(le || oe) ? <p role="alert" className="text-xs text-ink">{le ?? oe}</p>
        : <p className="text-xs text-ink-3">South of -80° uses the 40 m/px polar terrain; elsewhere the global map.</p>}
    </div>
  )
}

/**
 * Hora de alunizaje en 24 horas (tarea A9). `<input type="time">` sigue el idioma del sistema: con en-US,
 * las 00:00 UTC se veían "12:00" con el AM recortado. Se valida al salir del campo o con Enter.
 */
function TimeField({ time, onCommit }: { time: string; onCommit: (t: string) => void }) {
  const [draft, setDraft] = useState(time)
  const [error, setError] = useState<string>()
  useEffect(() => { setDraft(time); setError(undefined) }, [time]) // p. ej. Missions o History cambian la hora
  const commit = () => {
    const t = parseUtcTime(draft)
    if (!t) return setError('Use 24-hour time, for example 05:00.')
    setError(undefined); setDraft(t)
    if (t !== time) onCommit(t)
  }
  return (
    <Field label="Landing time (UTC)" error={error}>
      <Input mono inputMode="numeric" maxLength={5} placeholder="HH:MM" value={draft} invalid={!!error}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit() }} />
    </Field>
  )
}

function WindowFields({ detailed }: { detailed: boolean }) {
  const { startUtc, durationDays, stepMinutes, setConfig } = useMissionStore()
  const date = startUtc.slice(0, 10), time = startUtc.slice(11, 16)
  const set = (d: string, t: string) => { if (d && t) setConfig({ startUtc: toUtcIso(new Date(`${d}T${t}:00Z`)) }) }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1.35fr_1fr] gap-2.5">
        <Field label="Landing date" help={<Help id="date" />}><Input type="date" value={date} onChange={(e) => set(e.target.value, time)} /></Field>
        <TimeField time={time} onCommit={(t) => set(date, t)} />
      </div>
      <Field label="Mission length" help={<Help id="duration" />} hint={detailed ? undefined : '14 days is one lunar daylight period.'}>
        <Segmented label="Mission length" value={durationDays} onChange={(v) => setConfig({ durationDays: v })}
          options={detailed ? DURATIONS_DETAILED : DURATIONS_SIMPLE} />
      </Field>
      {detailed && (
        <Field label="Time step" help={<Help id="step" />}>
          <Segmented label="Time step" value={stepMinutes} onChange={(v) => setConfig({ stepMinutes: v })}
            options={STEP_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))} />
        </Field>
      )}
    </div>
  )
}

function SolarPanels({ detailed }: { detailed: boolean }) {
  const { panelAreaM2, panelEfficiency, setConfig } = useMissionStore()
  const [open, setOpen] = useState(false)
  if (!detailed && !open) return (
    <button onClick={() => setOpen(true)} className="flex items-center justify-between gap-3 text-left">
      <span className="flex items-center gap-2.5"><Zap size={15} className="text-sun" aria-hidden />
        <span className="flex flex-col"><span className="text-[13px] font-bold text-ink-2">Solar panels</span>
          <span className="text-xs text-ink-3">{panelAreaM2.toFixed(1)} m² · {Math.round(panelEfficiency * 100)}% efficiency</span></span></span>
      <ChevronRight size={15} className="text-ink-3" aria-hidden />
    </button>
  )
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle aside={<Zap size={14} className="text-sun" aria-hidden />}>Solar panels</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Panel area" help={<Help id="panel-area" />}><Input mono suffix="m²" inputMode="decimal" value={panelAreaM2}
          onChange={(e) => { const v = Number(e.target.value); if (v > 0) setConfig({ panelAreaM2: v }) }} /></Field>
        <Field label="Efficiency" help={<Help id="panel-efficiency" />}><Input mono suffix="%" inputMode="decimal" value={Math.round(panelEfficiency * 100)}
          onChange={(e) => { const v = Number(e.target.value); if (v > 0 && v <= 100) setConfig({ panelEfficiency: v / 100 }) }} /></Field>
      </div>
    </div>
  )
}

function RunBar({ detailed }: { detailed: boolean }) {
  const { selected, loading, evaluate, lastRunMs, evaluation, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluatedFor } = useMissionStore()
  const save = useHistoryStore((s) => s.save)
  const [saved, setSaved] = useState<'saved' | 'duplicate' | null>(null)
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(null), 2500); return () => clearTimeout(t) }, [saved])
  const n = evaluation?.timeline.length
  // Solo se guarda la corrida que está en pantalla con sus parámetros: si Results quedó desactualizado, primero hay que volver a correrla.
  const stale = isStale({ lat: selected?.lat, lon: selected?.lon, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency }, evaluatedFor)
  const canSave = !!evaluation && !!selected && !stale
  const onSave = () => {
    if (!canSave) return
    const run = save({ site: selected, startUtc, durationDays, stepMinutes, panelAreaM2, panelEfficiency, evaluation })
    setSaved(run ? 'saved' : 'duplicate')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button variant="primary" icon={Play} iconFill className={loading ? 'flex-1 shimmer' : 'flex-1'} disabled={!selected || loading} onClick={() => void evaluate()}>
          {loading ? 'Calculating…' : 'Run simulation'}
        </Button>
        <IconButton icon={saved === 'saved' ? BookmarkCheck : Bookmark} label={stale ? 'Run the simulation again to save it' : 'Save to history'} disabled={!canSave}
          className="raised size-11 text-ink disabled:opacity-40" onClick={onSave} />
      </div>
      <p role="status" aria-live="polite" className="min-h-0 text-xs text-ink-2 empty:hidden">
        {saved === 'saved' ? 'Saved to history.' : saved === 'duplicate' ? 'Already in history.' : ''}
      </p>
      {lastRunMs != null && n != null && (
        <p className={detailed ? 'tnum font-mono text-[11px] text-ink-3' : 'text-xs text-ink-3'}>
          {detailed ? `Computed in ${(lastRunMs / 1000).toFixed(2)} s · ${n} samples` : `Last run took ${lastRunMs < 100 ? 'under 0.1' : (lastRunMs / 1000).toFixed(1)} s`}
        </p>
      )}
    </div>
  )
}

export function SetupPanel() {
  const detail = useMissionStore((s) => s.detail)
  const sites = useMissionStore((s) => s.sites)
  const selected = useMissionStore((s) => s.selected)
  const select = useMissionStore((s) => s.select)
  const [mode, setMode] = useState<'catalog' | 'custom'>('catalog')
  const detailed = detail === 'detailed'
  return (
    <Panel title="Setup" label="Setup" peekAside={selected ? <span className="truncate">{selected.label}</span> : 'No site'}>
      <div className="flex flex-col gap-3">
        <SectionTitle aside={detailed && <Segmented size="sm" label="Site source" value={mode} onChange={setMode}
          options={[{ value: 'catalog', label: 'Catalog' }, { value: 'custom', label: 'Custom' }]} className="w-[140px]" />}>
          <span className="flex items-center gap-1">Landing site<Help id="site" /></span>
        </SectionTitle>
        {!detailed && <><SiteSearch /><SelectedCard /></>}
        {detailed && mode === 'catalog' && (
          <Field label="Site">
            <select aria-label="Landing site" value={selected?.id ?? ''}
              onChange={(e) => { const s = sites.find((x) => x.id === e.target.value); if (s) select(toSelected(s)) }}
              className="inset-well h-10 rounded-xl px-3 text-sm font-bold ring-1 ring-white/10 [color-scheme:dark]">
              <option value="" disabled>Choose a site…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
            </select>
          </Field>
        )}
        {detailed && mode === 'custom' && <CustomCoords />}
      </div>
      <Divider />
      <div className="flex flex-col gap-3"><SectionTitle>Landing window</SectionTitle><WindowFields detailed={detailed} /></div>
      <Divider />
      <SolarPanels detailed={detailed} />
      <Divider />
      <RunBar detailed={detailed} />
    </Panel>
  )
}
