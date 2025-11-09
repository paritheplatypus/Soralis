import * as THREE from 'three'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Stars as IconStars, Sparkles as IconSparkles, Telescope } from 'lucide-react'
import entitiesData from '../src/data/entities.json'
import Starfield from './components/Starfield'
import SolarSystem3D from './modes/SolarSystem3D'
import { Canvas } from '@react-three/fiber'
import { Howler } from 'howler'
import { useTour } from './tour'
import { sfx } from './sfx'
import { prime, pauseSpeech, resumeSpeech, skipSpeech, stopSpeech, speakBatch } from './api/voice'

import PlanetViewer from './components/PlanetViewer'

// ⬇️ New widgets
import FactsCarousel from './components/FactsCarousel'
import LiveOrbit from './components/LiveOrbit'
import ConceptOfDay from './components/ConceptOfDay'

type Entity = typeof entitiesData[number]

function Card({children}:{children:any}){ return <div className="glass rounded-xl p-4">{children}</div> }

function NarrationToggle(){
  const [on,setOn] = useState<boolean>(()=> {
    try{ return JSON.parse(localStorage.getItem('aurora:narration') ?? 'true') }catch{ return true }
  })
  useEffect(()=>{ localStorage.setItem('aurora:narration', JSON.stringify(on)) },[on])
  return <button className="glass rounded px-3 py-1 text-sm" onClick={()=>setOn(v=>!v)}>{on?'Narration: On':'Narration: Off'}</button>
}

function Nav({onHome}:{onHome:()=>void}){
  const [muted,setMuted] = useState<boolean>(()=> {
    try{ return JSON.parse(localStorage.getItem('muted') || 'false') }catch{ return false }
  })
  useEffect(()=>{ Howler.mute(muted); localStorage.setItem('muted', JSON.stringify(muted)) },[muted])
  return (
    <div className="sticky top-0 z-40 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-white/90"/>
          <button className="font-semibold tracking-wide" onClick={onHome}>Solaris</button>
        </div>
        <div className="flex items-center gap-2">
          <NarrationToggle/>
          <button className="rounded-md px-3 py-1 text-sm glass hover:bg-white/10" onClick={()=>setMuted(m=>!m)} title={muted?'Unmute':'Mute'}>{muted?'🔇':'🔊'}</button>
        </div>
      </div>
    </div>
  )
}

function OrbitScrubber({ color }: { color: string }){
  const [angle, setAngle] = useState(0)
  const r = 100, cx=140, cy=110
  const rad = angle * Math.PI / 180
  const x = cx + r * Math.cos(rad)
  const y = cy + r * Math.sin(rad)
  const dist = 1 + 0.3*Math.cos(rad)
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Orbit Scrubber</div>
        <input type="range" min={0} max={360} value={angle} onChange={e=>setAngle(parseInt(e.target.value))}/>
      </div>
      <svg viewBox="0 0 300 220" className="w-full h-56">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" />
        <circle cx={x} cy={y} r="14" fill={color} filter="url(#glow)" />
        <circle cx={cx} cy={cy} r="6" fill="white" />
      </svg>
      <div className="text-xs text-white/70">Scrub along the orbit. Dist factor: {dist.toFixed(2)}</div>
    </Card>
  )
}

// ⬇️ Updated Home: planets removed, Launch 3D replaced by Deep Sky Mode button,
// and 3-widget educational layout added.
function Home({ enter3D }: { enter3D: () => void }) {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-12 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 shadow-sm">
          <IconSparkles className="h-3.5 w-3.5" /> A serene interface for cosmic explorers
        </div>
        <h1 id="hero-title" className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
          <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
            Solaris
          </span>{" "}
          - The Guiding Star
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/70 md:text-lg">
          Where every planet has a story to tell.
        </p>

        {/* Deep Sky Mode button now LAUNCHES 3D */}
        <div className="mt-8 flex justify-center">
          <button
            className="group glass rounded-2xl px-6 py-4 md:px-8 md:py-5 inline-flex flex-col items-center text-left shadow-xl hover:shadow-2xl transition"
            onClick={enter3D}
          >
            <span className="flex items-center gap-2 text-base md:text-lg font-medium">
              <Telescope className="h-5 w-5" />
              Deep Sky Mode
            </span>
            <span className="mt-1 text-xs md:text-sm text-white/70">
              Explore the celestial wonders of our solar system through immersive visuals and captivating narration, from the scorching surface of Mercury to the icy realms of Neptune, all from the comfort of your home.
            </span>
          </button>
        </div>
      </motion.div>

      {/* Educational widgets */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 md:h-[520px]">
          <FactsCarousel />
        </div>
        <div className="md:col-span-2 grid grid-rows-2 gap-6">
          <LiveOrbit />
          <ConceptOfDay />
        </div>
      </div>
    </section>
  );
}


export default function App(){
  const [slug, setSlug] = useState<string | null>(null)
  const [show3D, setShow3D] = useState(false)

  // Force narration restart even when the same planet is clicked again
  const [selectionNonce, setSelectionNonce] = useState(0)

  function handleSelect(nextSlug: string) {
    setSlug(prev => {
      if (prev === nextSlug) setSelectionNonce(n => n + 1) // re-click same item → bump nonce
      return nextSlug
    })
  }

  // unlock audio on first user gesture
  useEffect(() => {
    const once = () => { prime(); window.removeEventListener('pointerdown', once) }
    window.addEventListener('pointerdown', once, { once: true })
    return () => window.removeEventListener('pointerdown', once)
  }, [])

  // selected entity
  const selectedEntity = useMemo(
    () => (entitiesData as any as Entity[]).find(e => e.slug === slug),
    [slug]
  )

  // Build richer narration context: md -> facts -> summary
  const narrationContext =
    (selectedEntity?.sections?.[0]?.md ?? '') ||
    (Array.isArray((selectedEntity as any)?.facts) ? (selectedEntity as any).facts.join('\n') : '') ||
    ((selectedEntity as any)?.summary ?? '')

  // Fallback script so the panel never stays empty
  const fallbackLines = useMemo(() => {
    if (!selectedEntity) return []
    const facts = (selectedEntity as any)?.facts
    if (Array.isArray(facts) && facts.length) return facts
    const title = selectedEntity.title || selectedEntity.slug
    const summary = (selectedEntity as any)?.summary || narrationContext || ''
    return [
      `${title}.`,
      summary ? summary : `Let’s explore key features of ${title}.`
    ].filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity?.slug, narrationContext])

  const tour = useTour(selectedEntity?.slug ?? null, narrationContext, selectionNonce)

  // --- Sync UI step highlight with audio progress ---
  useEffect(() => {
    const onNext = () => tour.next()
    const onReset = () => {}
    window.addEventListener('tts:advance', onNext)
    window.addEventListener('tts:reset', onReset)
    return () => {
      window.removeEventListener('tts:advance', onNext)
      window.removeEventListener('tts:reset', onReset)
    }
  }, [tour])

  // Lines to show & speak: prefer tour, otherwise use fallback
  const currentLines = useMemo(
    () => (tour.steps && tour.steps.length ? tour.steps : fallbackLines),
    [tour.steps, fallbackLines]
  )

  // Start / restart narration when a planet opens OR the same planet is re-clicked
  useEffect(() => {
    if (selectedEntity?.slug) {
      tour.start?.()
    } else {
      try { stopSpeech() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity?.slug, selectionNonce])

  // When narration steps appear, (re)queue and start playback
  useEffect(() => {
    if (!slug) return
    const lines = (tour.steps && tour.steps.length) ? tour.steps : fallbackLines
    if (lines && lines.length) {
      try { stopSpeech() } catch {}
      speakBatch(lines)
    }
  }, [slug, selectionNonce, tour.steps, fallbackLines])

  // ESC to close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && slug) setSlug(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slug])

  return (
    <div className='min-h-screen relative'>
      <Starfield />
      <div className='relative bg-gradient-to-b from-[#0a0c19]/60 via-[#0a0d1f]/60 to-[#0b1024]/60'>
        <Nav onHome={()=>{ setShow3D(false); setSlug(null); setSelectionNonce(0); try{ stopSpeech() }catch{} }} />

        {/* MAIN */}
        {show3D ? (
          <div className="h-[80vh]">
            {/* Hide the big canvas whenever a planet modal is open */}
            {!slug && (
              <Canvas
                shadows
                camera={{ position: [0, 8, 26], fov: 45 }}
                gl={{
                  antialias: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 1.05,
                  powerPreference: 'high-performance',
                }}
              >
                <SolarSystem3D onSelect={(s)=> handleSelect(s)} />
              </Canvas>
            )}
          </div>
        ) : (
          <Home enter3D={() => setShow3D(true)} />
        )}

        <PlanetViewer
          key={`${slug ?? 'none'}-${selectionNonce}`}
          open={!!slug}
          onClose={() => { setSlug(null); setSelectionNonce(0); try{ stopSpeech() }catch{} }}
          title={selectedEntity?.title ?? (slug ?? '')}
          slug={(selectedEntity?.slug ?? slug ?? '').toLowerCase()}
          color={(selectedEntity as any)?.heroColor || '#8aa9ff'}
          transcript={currentLines}
          activeIndex={Math.max(0, Math.min((tour.activeStep ?? 0), (currentLines.length - 1)))}
          onPause={() => pauseSpeech()}
          onResume={() => resumeSpeech()}
          onSkip={() => { skipSpeech(); tour.next(); }}
          onStop={() => { stopSpeech(); tour.reset?.(); }}
        />

        {/* <footer className='border-t border-white/10 bg-black/30'>
          <div className='mx-auto max-w-6xl px-4 py-8 text-xs text-white/70'>
            © {new Date().getFullYear()} Aurora Interface Lab
          </div>
        </footer> */}
      </div>
    </div>
  )
}