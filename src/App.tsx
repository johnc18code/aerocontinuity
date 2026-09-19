import { useEffect, useMemo, useRef, useState } from 'react'
import terrainImage from './assets/radar-terrain.png'
import './App.css'

type Plane = { id: string; type: string; x: number; y: number; heading: number; speed: number; altitude: number; targetAltitude: number; status: string; color?: 'amber' | 'red' }
type RadarReturn = Plane & { pingedAt: number }

const INITIAL_PLANES: Plane[] = [
  { id: 'N482SF', type: 'B738', x: 18, y: 23, heading: 118, speed: 472, altitude: 182, targetAltitude: 120, status: 'ARRIVAL' },
  { id: 'UAL704', type: 'A320', x: 67, y: 18, heading: 224, speed: 446, altitude: 240, targetAltitude: 180, status: 'EN ROUTE' },
  { id: 'FDX193', type: 'B763', x: 83, y: 46, heading: 263, speed: 418, altitude: 112, targetAltitude: 80, status: 'ARRIVAL', color: 'amber' },
  { id: 'JBU921', type: 'E190', x: 27, y: 70, heading: 42, speed: 386, altitude: 74, targetAltitude: 120, status: 'CLIMB' },
  { id: 'DAL118', type: 'A321', x: 56, y: 78, heading: 335, speed: 424, altitude: 156, targetAltitude: 100, status: 'ARRIVAL' },
  { id: 'N71CX', type: 'C680', x: 77, y: 70, heading: 292, speed: 360, altitude: 91, targetAltitude: 90, status: 'HOLDING', color: 'red' },
  { id: 'SWA2408', type: 'B737', x: 40, y: 42, heading: 158, speed: 392, altitude: 128, targetAltitude: 60, status: 'APPROACH' },
]

const RUNWAYS = [
  { id: '09 / 27', x: 30, y: 36, rotation: -17, length: 15 },
  { id: '04 / 22', x: 70, y: 30, rotation: 34, length: 13 },
  { id: '16 / 34', x: 57, y: 68, rotation: 78, length: 14 },
]

const bearingFor = (x: number, y: number) => ((Math.atan2(y - 50, x - 50) * 180) / Math.PI + 450) % 360
const crossedBySweep = (previous: number, next: number, target: number) => next >= previous ? target >= previous && target < next : target >= previous || target < next

function movePlane(plane: Plane, elapsed: number, multiplier: number) {
  const radians = ((plane.heading - 90) * Math.PI) / 180
  const distance = elapsed * multiplier * plane.speed * 0.000017
  let x = plane.x + Math.cos(radians) * distance
  let y = plane.y + Math.sin(radians) * distance
  if (x < 4) x = 96; if (x > 96) x = 4; if (y < 4) y = 96; if (y > 96) y = 4
  return { ...plane, x, y }
}

const formatClock = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' })

function App() {
  const planesRef = useRef(INITIAL_PLANES)
  const sweepRef = useRef(0)
  const [returns, setReturns] = useState<RadarReturn[]>(INITIAL_PLANES.map((plane) => ({ ...plane, pingedAt: 0 })))
  const [sweep, setSweep] = useState(0)
  const [speed, setSpeed] = useState(8)
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState('SWA2408')
  const [utc, setUtc] = useState(new Date())

  useEffect(() => { const timer = window.setInterval(() => setUtc(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => {
    let frame = 0; let previousTime = performance.now()
    const animate = (now: number) => {
      const elapsed = Math.min((now - previousTime) / 1000, 0.1); previousTime = now
      if (!paused) {
        planesRef.current = planesRef.current.map((plane) => movePlane(plane, elapsed, speed))
        const previousSweep = sweepRef.current
        const nextSweep = (previousSweep + (elapsed * 360) / 4.4) % 360
        sweepRef.current = nextSweep; setSweep(nextSweep)
        const hits = planesRef.current.filter((plane) => crossedBySweep(previousSweep, nextSweep, bearingFor(plane.x, plane.y)))
        if (hits.length) setReturns((current) => {
          const hitMap = new Map(hits.map((plane) => [plane.id, plane]))
          return current.map((radarReturn) => { const hit = hitMap.get(radarReturn.id); return hit ? { ...hit, pingedAt: now } : radarReturn })
        })
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate); return () => cancelAnimationFrame(frame)
  }, [paused, speed])

  const selectedPlane = useMemo(() => returns.find((plane) => plane.id === selected) ?? returns[0], [returns, selected])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><div><strong>AERO CONTINUITY</strong><span>SECTOR CONTROL / SIMULATION</span></div></div>
        <div className="system-meta"><div><span>SECTOR</span><strong>NORTH ATLANTIC 04</strong></div><div><span>UTC</span><strong className="mono">{formatClock(utc)}</strong></div><div className="system-live"><i /> SYSTEM NOMINAL</div></div>
      </header>

      <section className="workspace">
        <aside className="left-rail">
          <div className="eyebrow">SIMULATION RATE</div>
          <div className="rate-display"><strong>{speed}×</strong><span>REAL TIME</span></div>
          <div className="speed-controls" aria-label="Simulation speed">{[4, 8, 16].map((value) => <button key={value} className={speed === value ? 'active' : ''} onClick={() => setSpeed(value)}>{value}×</button>)}</div>
          <button className="pause-button" onClick={() => setPaused((value) => !value)}><span>{paused ? '▶' : 'Ⅱ'}</span> {paused ? 'RESUME SIM' : 'PAUSE SIM'}</button>
          <div className="panel-heading"><span>TRACKED AIRCRAFT</span><b>{returns.length.toString().padStart(2, '0')}</b></div>
          <div className="aircraft-list">{returns.map((plane) => (
            <button key={plane.id} className={`aircraft-row ${selected === plane.id ? 'selected' : ''}`} onClick={() => setSelected(plane.id)}><span className={`track-dot ${plane.color ?? ''}`} /><span><strong>{plane.id}</strong><small>{plane.type} · {plane.status}</small></span><span className="flight-level">FL {plane.altitude}</span></button>
          ))}</div>
        </aside>

        <section className="radar-column">
          <div className="radar-toolbar"><div><span className="live-pulse" /> LIVE SURVEILLANCE</div><div className="legend"><span><i className="legend-dot green" /> TRACK</span><span><i className="legend-dot amber" /> CAUTION</span><span><i className="legend-dot red" /> CONFLICT</span></div><div>RANGE <strong>120 NM</strong></div></div>
          <div className="radar-wrap">
            <div className="radar" style={{ '--terrain': `url(${terrainImage})` } as React.CSSProperties}>
              <svg className="radar-grid" viewBox="0 0 100 100" aria-hidden="true"><g className="grid-lines">{[10, 20, 30, 40].map((radius) => <circle key={radius} cx="50" cy="50" r={radius} />)}<line x1="50" y1="2" x2="50" y2="98" /><line x1="2" y1="50" x2="98" y2="50" /><line x1="16" y1="16" x2="84" y2="84" /><line x1="84" y1="16" x2="16" y2="84" /></g><g className="bearing-ticks">{Array.from({ length: 36 }, (_, index) => <line key={index} x1="50" y1="2" x2="50" y2={index % 3 === 0 ? '4.1' : '3.2'} transform={`rotate(${index * 10} 50 50)`} />)}</g></svg>
              <div className="cardinal north">N <small>000</small></div><div className="cardinal east">E <small>090</small></div><div className="cardinal south">S <small>180</small></div><div className="cardinal west">W <small>270</small></div>
              {RUNWAYS.map((runway) => <div key={runway.id} className="runway-group" style={{ left: `${runway.x}%`, top: `${runway.y}%`, transform: `translate(-50%, -50%) rotate(${runway.rotation}deg)`, width: `${runway.length}%` }}><div className="runway"><span /><span /><span /><span /><span /></div><small>{runway.id}</small></div>)}
              <div className="sweep-line" style={{ transform: `rotate(${sweep - 90}deg)` }}><span /></div><div className="radar-origin"><i /></div>
              {returns.map((plane) => <button key={plane.id} className={`plane-return ${plane.color ?? ''} ${selected === plane.id ? 'is-selected' : ''}`} style={{ left: `${plane.x}%`, top: `${plane.y}%`, transform: `translate(-50%, -50%) rotate(${plane.heading}deg)` }} onClick={() => setSelected(plane.id)} aria-label={`Select ${plane.id}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2 7.2 7 4v2l-7-.9V19l2.4 2v1L12 21l-4.4 1v-1l2.4-2v-4.7l-7 .9v-2l7-4L12 2z" /></svg><span className="vector-line" /><span className="plane-label" style={{ transform: `rotate(${-plane.heading}deg)` }}><strong>{plane.id}</strong><small>{plane.altitude}  {plane.speed}</small></span></button>)}
            </div>
            <div className="map-readout"><span>LAT 42° 17′ N</span><span>LON 071° 03′ W</span><span>SWEEP {Math.round(sweep).toString().padStart(3, '0')}°</span></div>
          </div>
        </section>

        <aside className="right-rail">
          <div className="eyebrow">ACTIVE TRACK</div>
          <div className="selected-title"><span className={`track-dot ${selectedPlane.color ?? ''}`} /><div><strong>{selectedPlane.id}</strong><small>{selectedPlane.type} · SQUAWK 4271</small></div></div>
          <div className="data-grid"><div><span>ALTITUDE</span><strong>{selectedPlane.altitude},000 <small>FT</small></strong><em>↓ {Math.max(0, selectedPlane.altitude - selectedPlane.targetAltitude)}00 FPM</em></div><div><span>GROUND SPEED</span><strong>{selectedPlane.speed} <small>KT</small></strong><em>Mach 0.72</em></div><div><span>HEADING</span><strong>{selectedPlane.heading.toString().padStart(3, '0')}°</strong><em>TRUE</em></div><div><span>SEPARATION</span><strong>8.4 <small>NM</small></strong><em className="safe">SAFE</em></div></div>
          <div className="section-divider" /><div className="eyebrow">ROUTE PROGRESS</div><div className="route"><span className="route-stop complete">BOS</span><i /><span className="route-plane">✦</span><i /><span className="route-stop">ACK</span></div><div className="route-meta"><span>DEPARTED<br /><strong>18:42Z</strong></span><span>EST. ARRIVAL<br /><strong>19:16Z</strong></span></div>
          <div className="section-divider" /><div className="eyebrow">SECTOR CONDITIONS</div><div className="condition"><span>WIND</span><strong>240° / 18 KT</strong></div><div className="condition"><span>VISIBILITY</span><strong>10+ SM</strong></div><div className="condition"><span>QNH</span><strong>30.12 inHg</strong></div><div className="condition"><span>CEILING</span><strong>CLR</strong></div>
          <div className="notice"><span>⌁</span><div><strong>ACCELERATED SIMULATION</strong><p>Aircraft positions advance at {speed}× real time. Returns refresh only when contacted by the radar sweep.</p></div></div>
        </aside>
      </section>
      <footer><span><i /> PRIMARY RADAR ONLINE</span><span>DATA LINK <b>24 ms</b></span><span>RUNWAYS ACTIVE <b>09 · 04 · 16</b></span><span className="footer-right">AERO/CONTINUITY <b>v2.4.1</b></span></footer>
    </main>
  )
}

export default App
