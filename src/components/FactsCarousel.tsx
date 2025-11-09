import { useEffect, useState } from "react";

const FACTS = [
  "Mercury’s surface shows billions of years of cratering because it lacks weathering.",
  "Venus rotates retrograde—its day is longer than its year.",
  "Europa may hide a global ocean beneath ~10–30 km of ice.",
  "Saturn’s rings are mostly water ice with dust-sized to meter-scale chunks.",
  "Neptune’s winds can exceed 2,000 km/h—fastest in the Solar System.",
  "Kepler’s 3rd Law links period² to distance³ for all planets."
];

export default function FactsCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % FACTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
  <div className="relative bg-[#0a0f2b]/60 rounded-2xl p-5 text-gray-100 shadow-md h-full flex items-center justify-center overflow-hidden">
    {/* rotating faint planet */}
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        className="animate-spin-slow opacity-10"
        width="180"
        height="180"
        viewBox="0 0 180 180"
      >
        <defs>
          <radialGradient id="planetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#77aaff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0a0f2b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="90" r="80" fill="url(#planetGlow)" />
      </svg>
    </div>

    <div className="relative text-center">
      <h2 className="text-xs tracking-widest text-gray-400 mb-2">CELESTIAL FACT</h2>
      <p key={i} className="text-base leading-relaxed animate-fade-in">
        {FACTS[i]}
      </p>
    </div>
  </div>
);
}