import * as THREE from 'three'
import { OrbitControls, Stars, Sparkles, Effects } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Bloom, Vignette } from '@react-three/postprocessing'
import { ORBITS } from '../data/orbits'

const ORBIT_SPEED = 0.45
type P = { slug: string; color: string; radius: number; dist: number; tilt?: number }

function angleFromDays(periodDays: number, elapsedSec: number) {
  const simDaysPerSecond = 5
  const simDays = elapsedSec * simDaysPerSecond
  return (simDays / periodDays) * Math.PI * 2
}

// ---------- small helpers ----------
function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex)
  if (amt < 0) c.lerp(new THREE.Color('#000'), -amt)
  else c.lerp(new THREE.Color('#fff'), amt)
  return `#${c.getHexString()}`
}
function makeRadialGradientTexture(hexInner: string, hexMid: string, hexOuter: string) {
  const size = 256, c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!, g = ctx.createRadialGradient(size*.4, size*.35, size*.1, size*.5, size*.5, size*.6)
  g.addColorStop(0, hexInner); g.addColorStop(0.6, hexMid); g.addColorStop(1, hexOuter)
  ctx.fillStyle = g; ctx.fillRect(0,0,size,size)
  const tex = new THREE.CanvasTexture(c); (tex as any).colorSpace = THREE.SRGBColorSpace
  return tex
}
function makeBandsTexture(base: string, band: string) {
  const w=512,h=256,c=document.createElement('canvas'); c.width=w;c.height=h
  const ctx=c.getContext('2d')!; ctx.fillStyle=base; ctx.fillRect(0,0,w,h)
  for(let y=0;y<h;){ const bh=6+Math.random()*10; ctx.fillStyle=band; ctx.globalAlpha=.14+Math.random()*.08; ctx.fillRect(0,y,w,bh); y+=bh+(6+Math.random()*12) }
  ctx.globalAlpha=1
  const tex=new THREE.CanvasTexture(c); (tex as any).colorSpace=THREE.SRGBColorSpace; tex.wrapS=tex.wrapT=THREE.RepeatWrapping
  return tex
}
function useAlbedo(path?: string) {
  return useMemo(() => {
    if (!path) return undefined
    const loader = new THREE.TextureLoader()
    try {
      const t = loader.load(path)
      ;(t as any).colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      return t
    } catch { return undefined }
  }, [path])
}

// ---------- moons spec ----------
type MoonSpec = {
  name: string
  r: number       // radius (scene units)
  dist: number    // distance from planet center (scene units)
  speed: number   // angular speed (rad/sec, stylized)
  texture?: string
}
/** Exact roster per your request */
const MOONS: Record<string, MoonSpec[]> = {
  mercury: [],
  venus:   [],

  earth:   [{ name: 'moon',   r: 0.32, dist: 2.2, speed: 0.55, texture: '/textures/moon/albedo.jpg' }],

  mars: [
    { name: 'phobos', r: 0.12, dist: 1.4, speed: 1.10 },
    { name: 'deimos', r: 0.08, dist: 2.0, speed: 0.80 },
  ],

  jupiter: [
    { name: 'io',       r: 0.24, dist: 3.2, speed: 1.00 },
    { name: 'europa',   r: 0.22, dist: 3.9, speed: 0.85 },
    { name: 'ganymede', r: 0.30, dist: 4.8, speed: 0.65 },
    { name: 'callisto', r: 0.28, dist: 5.6, speed: 0.55 },
  ],

  saturn: [
    { name: 'mimas',     r: 0.14, dist: 3.0, speed: 1.10 },
    { name: 'enceladus', r: 0.18, dist: 3.6, speed: 0.95 },
    { name: 'tethys',    r: 0.20, dist: 4.2, speed: 0.80 },
  ],

  uranus:  [{ name: 'titania', r: 0.22, dist: 2.8, speed: 0.60 }],
  neptune: [{ name: 'triton',  r: 0.22, dist: 3.2, speed: 0.70 }],
}

// Default texture for *all non-Earth* moons = Uranus albedo
const DEFAULT_MOON_TEX = '/textures/uranus/albedo.jpg'

// ---------- component ----------
export default function SolarSystem3D({ onSelect }: { onSelect: (slug: string) => void }) {
  const { camera, scene, gl, clock } = useThree()
  gl.physicallyCorrectLights = true
  gl.shadowMap.enabled = true
  gl.shadowMap.type = THREE.PCFSoftShadowMap
  gl.toneMapping = THREE.ACESFilmicToneMapping
  gl.toneMappingExposure = 1.05
  scene.fog = new THREE.FogExp2(new THREE.Color('#070a15'), 0.018)

  useFrame(() => {
    const dist = camera.position.length()
    const targetExposure = THREE.MathUtils.clamp(1.05 + (dist - 26) * 0.015, 1.0, 1.7)
    gl.toneMappingExposure = THREE.MathUtils.lerp(gl.toneMappingExposure, targetExposure, 0.08)
    const fog = scene.fog as THREE.FogExp2
    if (fog) {
      const targetFog = THREE.MathUtils.clamp(0.012 + (26 - dist) * 0.00015, 0.004, 0.012)
      fog.density = THREE.MathUtils.lerp(fog.density, targetFog, 0.08)
    }
  })

  function OrbitRing({ dist }: { dist: number }) {
    return (
      <mesh rotation={[-Math.PI/2,0,0]}>
        <ringGeometry args={[dist-0.02, dist+0.02, 256]} />
        <meshBasicMaterial color="#7a8092" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false}/>
      </mesh>
    )
  }

  // Single moon instance
  function Moon({ spec }: { spec: MoonSpec }) {
    const g = useRef<THREE.Group>(null!)
    useFrame((_, dt) => { if (g.current) g.current.rotation.y += spec.speed * dt })

    // Earth uses its own moon texture; all others default to Uranus unless overridden
    const texPath = spec.texture ?? DEFAULT_MOON_TEX
    const albedo = useAlbedo(texPath)

    return (
      <group ref={g}>
        <group position={[spec.dist,0,0]}>
          <mesh castShadow receiveShadow onClick={(e)=>{ e.stopPropagation(); onSelect(spec.name) }}>
            <sphereGeometry args={[spec.r, 48, 48]} />
            <meshPhysicalMaterial
              map={albedo as any}
              color={albedo ? '#ffffff' : '#cbd5e1'}
              roughness={0.92}
              metalness={0.02}
              envMapIntensity={0.35}
            />
          </mesh>
        </group>
      </group>
    )
  }

  function Planet({ slug, color, radius, dist, tilt=0 }: P) {
    const orbitRef = useRef<THREE.Group>(null!)
    const spinRef  = useRef<THREE.Mesh>(null!)

    useFrame((_, dt) => {
      const t = clock.getElapsedTime() * ORBIT_SPEED
      const o = ORBITS[slug as keyof typeof ORBITS]
      if (orbitRef.current && o) orbitRef.current.rotation.y = angleFromDays(o.periodDays, t)
      if (spinRef.current) spinRef.current.rotation.y += (0.4 / radius) * dt
    })

    const albedo = useAlbedo(`/textures/${slug}/albedo.jpg`)
    const surface = useMemo(() => {
      if (albedo) return albedo
      const gas = ['jupiter','saturn','uranus','neptune'].includes(slug)
      return gas
        ? makeBandsTexture(shade(color, 0.05), shade(color, -0.08))
        : makeRadialGradientTexture(shade(color,0.35), color, shade(color,-0.3))
    }, [albedo, slug, color])

    const ringMap = slug==='saturn' ? useAlbedo('/textures/saturn/rings.png') : undefined

    return (
      <group ref={orbitRef}>
        <group position={[dist,0,0]} rotation={[0,0,THREE.MathUtils.degToRad(tilt)]}>
          <mesh ref={spinRef} castShadow receiveShadow onClick={(e)=>{ e.stopPropagation(); onSelect(slug) }}>
            <sphereGeometry args={[Math.max(0.45, radius), 96, 96]} />
            <meshPhysicalMaterial map={surface as any} color={albedo ? '#fff' : color} roughness={0.9} metalness={0.02} envMapIntensity={0.4}/>
          </mesh>

          {/* Saturn’s rings */}
          {slug==='saturn' && (
            <mesh rotation={[-Math.PI/2, 0, Math.PI/8]} receiveShadow>
              <ringGeometry args={[radius*0.85, radius*1.55, 128]} />
              <meshPhysicalMaterial transparent opacity={0.9} roughness={0.6} map={ringMap} side={THREE.DoubleSide} depthWrite={false}/>
            </mesh>
          )}

          {/* Moons per spec */}
          {(MOONS[slug] ?? []).map(m => <Moon key={m.name} spec={m} />)}
        </group>
      </group>
    )
  }

  const planets: P[] = [
    { slug: 'mercury', color: '#a3a3a3', radius: .55, dist: 8 },
    { slug: 'venus',   color: '#e7c26a', radius: .95, dist: 12 },
    { slug: 'earth',   color: '#6ee7b7', radius: 1.00, dist: 16, tilt: 23.5 },
    { slug: 'mars',    color: '#ff6b6b', radius: .80, dist: 20 },
    { slug: 'jupiter', color: '#d9a79d', radius: 2.60, dist: 28 },
    { slug: 'saturn',  color: '#f5e3a1', radius: 2.20, dist: 36, tilt: 26.7 },
    { slug: 'uranus',  color: '#93c5fd', radius: 1.60, dist: 44, tilt: 97.8 },
    { slug: 'neptune', color: '#4ea8de', radius: 1.60, dist: 52, tilt: 28.3 },
  ]

  // Sun: textured, not emissive (no glow ring)
  const sunTex = useAlbedo('/textures/sun/albedo.jpg')

  return (
    <>
      {/* BACKDROP */}
      <Stars radius={200} depth={60} count={4000} factor={0.9} saturation={0} fade />
      <Sparkles count={120} scale={[120,40,120]} size={2} speed={0.3} opacity={0.2} />

      {/* SUN (texture only, toneMapped off so colors stay true) */}
      <group>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[3.2, 96, 96]} />
          <meshBasicMaterial map={sunTex as any} toneMapped={false} />
        </mesh>
      </group>

      {/* Global lighting (soft + neutral) */}
      <directionalLight
        position={[20, 15, 10]}
        target-position={[0, 0, 0] as any}
        intensity={2.0}
        color={'#ffffff'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
      />
      <ambientLight intensity={0.18} />
      <hemisphereLight color={'#fff'} groundColor={'#0a0d1f'} intensity={0.22} />

      {/* Orbits + planets */}
      {planets.map(p => <OrbitRing key={'ring-'+p.slug} dist={p.dist} />)}
      {planets.map(p => <Planet key={p.slug} {...p} />)}

      {/* Controls */}
      <OrbitControls enablePan={false} target={[0,0,0]} minDistance={8} maxDistance={90} />

      {/* Post-processing */}
      <Effects disableGamma>
        <Bloom intensity={0.33} luminanceThreshold={0.6} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.6} />
      </Effects>
    </>
  )
}