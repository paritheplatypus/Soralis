import { useMemo } from 'react'

export default function Starfield() {
  const stars = useMemo(() => {
    // Many small stars + a few larger "glints"
    const arr: { x: number; y: number; r: number; d: number }[] = []
    const N = 800
    for (let i = 0; i < N; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: Math.random() < 0.08 ? Math.random() * 0.05 + 0.05 : Math.random() * 0.05 + 0.02,
        d: Math.random() * 6 + 3, // twinkle duration
      })
    }
    return arr
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      {/* tiny CSS for twinkle */}
      <style>{`
        @keyframes aurora-twinkle {
          0% { opacity: .25 }
          50% { opacity: 1 }
          100% { opacity: .25 }
        }
      `}</style>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect width="100" height="100" fill="url(#bg-grad)"/>
        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020617"/>
            <stop offset="100%" stopColor="#0b1024"/>
          </linearGradient>
        </defs>
        {stars.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="white"
            style={{
              opacity: 0.65,
              animation: `aurora-twinkle ${s.d}s ease-in-out ${Math.random() * 6}s infinite`,
            }}
          />
        ))}
      </svg>
    </div>
  )
}