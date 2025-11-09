export default function ConceptOfDay() {
  return (
  <div className="bg-[#0a0f2b]/60 rounded-2xl p-5 text-gray-100 shadow-md relative overflow-hidden">
    <h2 className="text-lg font-semibold mb-2">Concept of the Day</h2>
    <p className="text-sm leading-relaxed mb-4 relative z-10">
      <strong>Albedo:</strong> the fraction of incoming sunlight a body reflects.
      Worlds with high albedo (e.g., fresh ice) appear brighter and cooler,
      while low-albedo bodies (e.g., basalt) absorb heat and look darker.
      Albedo helps explain visual appearance and climate feedbacks across the Solar System.
    </p>

    {/* orbit illustration */}
    <svg className="absolute bottom-0 right-0 opacity-10" width="200" height="120" viewBox="0 0 200 120">
      <circle cx="100" cy="60" r="55" stroke="#ffffff" strokeWidth="1" fill="none" />
      <circle cx="100" cy="60" r="3" fill="#fff" />
      <circle className="animate-orbit" r="6" fill="#91e5ff" />
      <defs>
        <style>{`
          @keyframes orbit {
            0% { transform: rotate(0deg) translate(55px) rotate(0deg); }
            100% { transform: rotate(360deg) translate(55px) rotate(-360deg); }
          }
          .animate-orbit {
            transform-origin: 100px 60px;
            animation: orbit 12s linear infinite;
          }
        `}</style>
      </defs>
    </svg>
  </div>
);
}