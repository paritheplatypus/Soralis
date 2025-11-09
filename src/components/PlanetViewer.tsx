// src/components/PlanetViewer.tsx
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { createPortal } from 'react-dom'
import PlanetQA from './PlanetQA'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  slug: string
  color: string
  transcript: string[]
  activeIndex?: number
}

function PlanetPreview({ slug, fallbackColor }: { slug: string; fallbackColor: string }) {
  const texPath = `/textures/${slug}/albedo.jpg`
  const tex = useMemo(() => {
    const loader = new THREE.TextureLoader()
    try {
      const t = loader.load(texPath)
      ;(t as any).colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    } catch {
      return undefined
    }
  }, [texPath])

  const meshRef = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => { if (meshRef.current) meshRef.current.rotation.y += 0.25 * dt })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2.1, 96, 96]} />
      <meshPhysicalMaterial
        map={tex}
        color={tex ? '#ffffff' : fallbackColor}
        roughness={0.9}
        metalness={0.02}
        envMapIntensity={0.4}
      />
    </mesh>
  )
}

export default function PlanetViewer(props: Props) {
  if (!props.open) return null

  const safeIndex = Math.max(
    0,
    Math.min(props.activeIndex ?? 0, Math.max(0, (props.transcript?.length ?? 1) - 1))
  )

  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (activeLineRef.current && scrollerRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [safeIndex, props.transcript])

  // Render in a portal so it's above any Canvas stacking context
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      // Safety net: clicking the dark backdrop also closes
      onPointerDown={(e) => { e.stopPropagation(); props.onClose(); }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-[min(1100px,95vw)] h-[min(70vh,700px)] rounded-2xl glass overflow-hidden pointer-events-auto"
        // prevent inner clicks from reaching backdrop/canvas
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-3 left-4 text-xl font-semibold">{props.title}</div>

        {/* Close button (always wins) */}
        <div className="absolute top-3 right-4 z-[100000] pointer-events-auto">
          <button
            type="button"
            className="glass px-3 py-1 rounded font-medium hover:bg-white/10 transition"
            onPointerDown={(e) => { e.stopPropagation(); props.onClose() }}
            onClick={(e) => { e.stopPropagation(); props.onClose() }}
          >
            ✕ Close
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 h-full">
          {/* Left: 3D preview */}
          <div className="relative">
            <Canvas camera={{ position: [0, 0, 7.5], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[3, 4, 5]} intensity={1.3} />
              <PlanetPreview slug={props.slug} fallbackColor={props.color} />
              <OrbitControls enablePan={false} minDistance={5.8} maxDistance={12} />
            </Canvas>
          </div>

          {/* Right: Transcript */}
{/* Right: Transcript + Planet Q&A */}
<div
  ref={scrollerRef}
  className="relative bg-black/35 p-4 pt-14 overflow-y-auto"
  onPointerDown={(e) => e.stopPropagation()}
  onClick={(e) => e.stopPropagation()}
>
  {props.transcript && props.transcript.length > 0 ? (
    <>
      <ol className="space-y-3 font-celestial text-[1.1rem] leading-7">
        {props.transcript.map((line, i) => {
          const isActive = i === safeIndex
          const common = "rounded-md border px-3 py-2"
          const cls = isActive
            ? `${common} bg-white/10 border-white/15 text-white/90`
            : `${common} bg-white/[0.05] border-white/10 text-white/80`
          return (
            <li
              key={i}
              ref={isActive ? activeLineRef : null}
              className={cls}
            >
              {line}
            </li>
          )
        })}
      </ol>

      {/* ⬇️ New: local Q&A for the current planet */}
      <PlanetQA slug={props.slug} />
    </>
  ) : (
    <>
      <div className="opacity-80 text-white/90">Loading narration…</div>
      <PlanetQA slug={props.slug} />
    </>
  )}
</div>

        </div>
      </div>
    </div>,
    document.body
  )
}