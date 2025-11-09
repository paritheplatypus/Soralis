import { useEffect, useMemo, useRef, useState } from "react";

// keep a small rolling history for a sparkline
const MAX_POINTS = 40;

type Iss = { latitude: number; longitude: number; velocity: number; altitude: number };

function orthographicXY(latDeg: number, lonDeg: number, size = 160) {
  // simple orthographic projection onto a circle
  const r = size / 2;
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const x = r * Math.cos(lat) * Math.sin(lon);
  const y = -r * Math.sin(lat);
  // only show points on the visible hemisphere
  const visible = Math.cos(lat) * Math.cos(lon) >= 0;
  return { x: r + x, y: r + y, visible };
}

export default function LiveOrbit() {
  const [iss, setIss] = useState<Iss | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [altHist, setAltHist] = useState<number[]>([]);
  const globeSize = 180;

  useEffect(() => {
    let alive = true;

    const fetchISS = async () => {
      try {
        const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        const next: Iss = {
          latitude: data.latitude,
          longitude: data.longitude,
          velocity: data.velocity, // km/h
          altitude: data.altitude, // km
        };
        setIss(next);
        setAltHist((h) => {
          const v = [...h, next.altitude];
          if (v.length > MAX_POINTS) v.shift();
          return v;
        });
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError("Could not fetch live orbital data.");
      }
    };

    fetchISS();
    const t = setInterval(fetchISS, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // sparkline path
  const spark = useMemo(() => {
    if (!altHist.length) return "";
    const w = 220, h = 50;
    const min = Math.min(...altHist);
    const max = Math.max(...altHist);
    const rng = Math.max(1, max - min);
    const step = w / Math.max(1, altHist.length - 1);
    return altHist
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / rng) * h;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [altHist]);

  const p = iss ? orthographicXY(iss.latitude, iss.longitude, globeSize) : null;

  // normalize velocity to a gauge (0–30000 km/h typical LEO)
  const vPct = iss ? Math.min(1, iss.velocity / 30000) : 0;
  // normalize altitude to a gauge (0–600 km typical LEO)
  const aPct = iss ? Math.min(1, iss.altitude / 600) : 0;

  return (
    <div className="bg-[#0a0f2b]/60 rounded-2xl p-5 text-gray-100 shadow-md">
      <h2 className="text-lg font-semibold mb-1">Live Orbital Data</h2>
      <p className="text-xs text-gray-400 mb-4">International Space Station (ISS)</p>

      {error && <p className="text-red-300 text-sm">{error}</p>}
      {!error && !iss && <p className="text-sm">Fetching satellite data…</p>}

      {iss && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Mini globe */}
          <div className="flex items-center justify-center">
            <svg width={globeSize} height={globeSize} viewBox={`0 0 ${globeSize} ${globeSize}`}>
              {/* sphere */}
              <defs>
                <radialGradient id="glow" cx="50%" cy="45%" r="60%">
                  <stop offset="0%" stopColor="#2a3b7a" />
                  <stop offset="100%" stopColor="#0b1538" />
                </radialGradient>
              </defs>
              <circle cx={globeSize/2} cy={globeSize/2} r={globeSize/2} fill="url(#glow)" stroke="rgba(255,255,255,0.1)" />
              {/* simple graticule */}
              {[-60,-30,0,30,60].map(lat=>(
                <path key={lat}
                  d={latArcPath(lat, globeSize/2)}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                />
              ))}
              {[ -120,-60,0,60,120].map(lon=>(
                <path key={lon}
                  d={lonArcPath(lon, globeSize/2)}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                />
              ))}
              {/* ISS dot (only if on visible hemisphere) */}
              {p?.visible && <circle cx={p.x} cy={p.y} r="4" className="animate-pulse" fill="#91e5ff" />}
            </svg>
          </div>

          {/* Numbers + gauges + sparkline */}
          <div>
            <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
              <span className="text-gray-400">Latitude</span>
              <span>{iss.latitude.toFixed(2)}°</span>
              <span className="text-gray-400">Longitude</span>
              <span>{iss.longitude.toFixed(2)}°</span>
              <span className="text-gray-400">Altitude</span>
              <span>{iss.altitude.toFixed(0)} km</span>
              <span className="text-gray-400">Velocity</span>
              <span>{iss.velocity.toFixed(0)} km/h</span>
            </div>

            {/* Gauges */}
            <div className="space-y-3">
              <Gauge label="Velocity" pct={vPct} />
              <Gauge label="Altitude" pct={aPct} />
            </div>

            {/* Sparkline */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-gray-400">Altitude trend (last {Math.min(altHist.length, MAX_POINTS)} samples)</span>
                {altHist.length >= 2 && (
                  <span className="text-xs text-gray-300">
                    Δ {(altHist[altHist.length-1] - altHist[0]).toFixed(0)} km
                  </span>
                )}
              </div>
              <svg viewBox="0 0 220 50" className="w-full mt-1">
                <path d={spark} fill="none" stroke="rgba(145,229,255,0.9)" strokeWidth="2"/>
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Gauge({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-cyan-300/80"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}

// helper arcs for graticule (very lightweight approximation)
function latArcPath(lat: number, r: number) {
  const phi = (lat * Math.PI) / 180;
  const ry = r * Math.cos(phi);
  const cx = r, cy = r;
  // ellipse horizontal line
  return `M ${cx - r},${cy + (r - ry)} A ${r},${ry} 0 0 0 ${cx + r},${cy + (r - ry)}`;
}
function lonArcPath(lon: number, r: number) {
  const lambda = (lon * Math.PI) / 180;
  const rx = r * Math.cos(lambda);
  const cx = r, cy = r;
  return `M ${cx + rx},${cy - r} A ${rx},${r} 0 0 0 ${cx + rx},${cy + r}`;
}