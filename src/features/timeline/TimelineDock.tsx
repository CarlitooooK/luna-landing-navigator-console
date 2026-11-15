import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Pause, Play } from 'lucide-react'
import { useMissionStore } from '@/core/store/useMissionStore'
import { bothRuns, coverage, dayOf, earthRuns, sliderStep, stepHours, sunRuns, type Run } from '@/core/utils/timeline'
import { formatUtc } from '@/core/utils/time'
import { Panel, SIGNAL, Segmented, type Signal } from '@/ui'
import { HorizonChart } from './HorizonChart'
import { Help } from '@/features/help/Help'
import type { HelpId } from '@/features/help/glossary'

const SPEEDS = [1, 4, 12] as const
// Identidad de una corrida: al cambiar, las pistas se vuelven a verter
const startUtc = (t: { timestamp_utc: string }[]) => t[0]?.timestamp_utc ?? '' // pasos del timeline por tick (100 ms)

function Track({ runs, n, signal, height, delay = 0 }: { runs: Run[]; n: number; signal: Signal; height: number; delay?: number }) {
  const c = SIGNAL[signal]
  return (
    <div className="inset-well relative w-full overflow-hidden rounded-full" style={{ height }}>
      {runs.map(([s, e]) => (
        <span key={s} className="glow pour absolute top-0 h-full rounded-full"
          style={{ animationDelay: `${delay}ms`, left: `${(s / n) * 100}%`, width: `${((e - s) / n) * 100}%`, color: c,
            background: `linear-gradient(90deg, color-mix(in srgb, ${c} 72%, transparent), ${c} 85%, color-mix(in srgb, ${c} 45%, white))` }} />
      ))}
    </div>
  )
}

function usePlayback(n: number, speed: number) {
  const playing = useMissionStore((s) => s.playing)
  const setStep = useMissionStore((s) => s.setStep)
  const setPlaying = useMissionStore((s) => s.setPlaying)
  useEffect(() => {
    if (!playing || n === 0) return
    // Capa 3: solo cambia stepIndex; cero red (D-003).
    const id = setInterval(() => {
      const next = useMissionStore.getState().stepIndex + speed
      if (next >= n) { setStep(n - 1); setPlaying(false) } else setStep(next)
    }, 100)
    return () => clearInterval(id)
  }, [playing, n, speed, setStep, setPlaying])
}

export function TimelineDock() {
  const evaluation = useMissionStore((s) => s.evaluation)
  const stepIndex = useMissionStore((s) => s.stepIndex)
  const playing = useMissionStore((s) => s.playing)
  const detail = useMissionStore((s) => s.detail)
  const setStep = useMissionStore((s) => s.setStep)
  const setPlaying = useMissionStore((s) => s.setPlaying)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4)
  const [tab, setTab] = useState<'timeline' | 'horizon'>('timeline')
  const lane = useRef<HTMLDivElement>(null)
  const t = useMemo(() => evaluation?.timeline ?? [], [evaluation])
  const n = t.length
  const tracks = useMemo(() => ({ sun: sunRuns(t), earth: earthRuns(t), both: bothRuns(t) }), [t])
  usePlayback(n, detail === 'detailed' ? speed : 4)
  if (!evaluation || n === 0) return null

  const detailed = detail === 'detailed'
  // Columna de etiquetas: en Detailed lleva "?" y el porcentaje, así que es más ancha (tarea B4).
  const labelW = detailed ? 148 : 104, laneLeft = labelW + 12
  const hrs = stepHours(t)
  const totalH = n * hrs
  const p = t[stepIndex]
  const day = dayOf(stepIndex * hrs)
  const totalDays = Math.round(totalH / 24)
  const m = evaluation.summary
  const scrub = (e: PointerEvent<HTMLDivElement>) => {
    const r = lane.current!.getBoundingClientRect()
    setStep(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
  }
  // Un solo scrubber para las dos pestañas (tarea A5): flechas, PageUp/PageDown (un día), Home y End.
  const stamp = formatUtc(p.timestamp_utc)
  const slider = {
    ref: lane, role: 'slider', tabIndex: 0, 'aria-label': 'Mission time', 'aria-valuemin': 0, 'aria-valuemax': n - 1, 'aria-valuenow': stepIndex,
    'aria-valuetext': detailed ? `T+${Math.round(stepIndex * hrs)} h, ${stamp}` : `Day ${day} of ${totalDays}, ${stamp}`,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e) },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => { if (e.buttons) scrub(e) },
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      const next = sliderStep(e.key, stepIndex, n, 24 / hrs)
      if (next == null) return
      e.preventDefault()
      setStep(next)
    },
  } as const
  const playhead = (
    <span className={`glow absolute -top-1 bottom-0 w-0.5 -translate-x-1/2 rounded-full bg-ink text-ink ${playing ? 'breathe' : ''}`}
      style={{ left: `${(stepIndex / (n - 1)) * 100}%`, transition: playing ? 'left 100ms linear' : 'left 240ms var(--ease-out)' }} />
  )
  const rows: { label: string; pct: number; signal: Signal; runs: Run[]; help: HelpId }[] = [
    { label: 'Sunlight', pct: m.sun_visible_pct, signal: 'sun', runs: tracks.sun, help: 'daylight' },
    { label: detailed ? 'Earth link' : 'Earth in view', pct: m.earth_visible_pct, signal: 'earth', runs: tracks.earth, help: 'earth-link' },
    ...(detailed ? [{ label: 'Sun + Earth', pct: coverage(tracks.both, n) * 100, signal: 'go' as Signal, runs: tracks.both, help: 'both' as HelpId }] : []),
  ]
  const tickEvery = totalH > 400 ? 120 : 72
  const ticks = Array.from({ length: Math.floor(totalH / tickEvery) + 1 }, (_, i) => i * tickEvery).filter((h) => h < totalH - tickEvery / 3)
  const events = detailed ? [
    m.hours_to_next_earthset != null && { label: 'Earthset', h: m.hours_to_next_earthset, signal: 'earth' as Signal },
    m.hours_to_next_sunset != null && { label: 'Sunset', h: m.hours_to_next_sunset, signal: 'sun' as Signal },
  ].filter(Boolean) as { label: string; h: number; signal: Signal }[] : []

  return (
    <Panel label="Timeline" peek="inline" className="w-full max-w-[688px] gap-2.5 px-4 py-3 [--peek-h:58px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (!playing && stepIndex >= n - 1) setStep(0); setPlaying(!playing) }} aria-label={playing ? 'Pause' : 'Play'}
            className="btn-primary grid size-8 place-items-center rounded-full">
            <span key={String(playing)} className="condense grid place-items-center">
              {playing ? <Pause size={13} fill="currentColor" aria-hidden /> : <Play size={13} fill="currentColor" aria-hidden />}</span>
          </button>
          {detailed && <Segmented size="sm" label="Playback speed" value={speed} onChange={setSpeed}
            options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} className="w-[120px]" />}
          <div className="flex min-w-0 flex-col">
            <span className="tnum text-sm font-bold">{detailed ? `T+${Math.round(stepIndex * hrs)} h` : `Day ${day} of ${totalDays}`}</span>
            <span className="tnum truncate font-mono text-[11px] text-ink-2">{formatUtc(p.timestamp_utc)}</span>
          </div>
        </div>
        {detailed ? <span className="flex items-center gap-1"><Segmented size="sm" label="Bottom view" value={tab} onChange={setTab}
          options={[{ value: 'timeline', label: 'Timeline' }, { value: 'horizon', label: 'Horizon 360°' }]} className="w-[200px]" /><Help id="horizon-360" /></span>
          : <div className="flex items-center gap-3.5 text-xs text-ink-2">
              {rows.map((r) => <span key={r.label} className="flex items-center gap-1.5">
                <span className="glow h-1.5 w-3 rounded-full" style={{ color: SIGNAL[r.signal], background: SIGNAL[r.signal] }} />{r.label}<Help id={r.help} /></span>)}
            </div>}
      </div>

      {tab === 'horizon' && detailed ? (
        <div className="flex flex-col gap-2">
          <HorizonChart profile={evaluation.horizon_profile} point={p} />
          {/* Mismo scrubber que en la pestaña Timeline, sin las pistas */}
          <div className="relative h-4">
            <span aria-hidden className="absolute inset-x-0 top-1.5 h-1 rounded-full bg-white/10" />
            <div {...slider} className="absolute inset-0 cursor-ew-resize touch-none">{playhead}</div>
          </div>
        </div>
      ) : (
        <div className="relative pt-5">
          {events.map((e) => {
            // En la mitad derecha la bandera crece hacia la izquierda para no salirse del dock
            const f = Math.min(1, e.h / totalH), flip = f > 0.5
            return (
              <span key={e.label} className={`absolute top-0 flex items-center gap-1 rounded-md px-1.5 py-px text-[10px] font-bold whitespace-nowrap ${flip ? 'flex-row-reverse -translate-x-full' : ''}`}
                style={{ left: `calc(${laneLeft}px + (100% - ${laneLeft}px) * ${f})`, background: `color-mix(in srgb, ${SIGNAL[e.signal]} 18%, transparent)` }}>
                <span className="h-2.5 w-0.5" style={{ background: SIGNAL[e.signal] }} />{e.label} {Math.round(e.h)} h
              </span>
            )
          })}
          <div className="grid items-center gap-x-3 gap-y-2" style={{ gridTemplateColumns: `${labelW}px 1fr` }}>
            {rows.map((r, i) => (
              <div key={r.label} className="contents">
                <span className="flex items-center justify-between text-xs font-medium text-ink-2"><span className="flex items-center">{r.label}{detailed && <Help id={r.help} />}</span>
                  {detailed && <span className="tnum font-mono text-[11px] text-ink-3">{r.pct.toFixed(1)}%</span>}</span>
                <Track key={evaluation.site.lat + startUtc(t)} runs={r.runs} n={n} signal={r.signal} height={detailed ? 10 : 8} delay={120 + i * 110} />
              </div>
            ))}
            <span />
            <div className="relative h-3.5">
              {ticks.map((h) => <span key={h} className="tnum absolute font-mono text-[10px] text-ink-3" style={{ left: `${(h / totalH) * 100}%` }}>
                {detailed ? (h === 0 ? 'T+0' : `${h} h`) : (h === 0 ? 'Landing' : `Day ${dayOf(h)}`)}</span>)}
            </div>
          </div>
          {/* Zona de arrastre + playhead sobre las pistas */}
          <div {...slider} className="absolute top-4 bottom-4 right-0 cursor-ew-resize touch-none" style={{ left: laneLeft }}>{playhead}</div>
        </div>
      )}
    </Panel>
  )
}
