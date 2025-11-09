// src/components/TourHUD.tsx
import { useEffect, useState } from 'react'
import { pauseSpeech, resumeSpeech, skipSpeech, stopSpeech } from '../api/voice'

export default function TourHUD({
  total, active, currentLine,
}: { total: number; active: number; currentLine?: string }) {
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    // auto-hide transcript when step changes
    setShowTranscript(false)
  }, [active])

  if (total <= 0 || active < 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass rounded-xl px-3 py-2 flex items-center gap-3 text-sm">
        <span className="opacity-80">Guide</span>
        <span className="opacity-60">{active + 1} / {total}</span>
        <button className="underline" onClick={()=>setShowTranscript(v=>!v)}>
          {showTranscript ? 'Hide transcript' : 'Show transcript'}
        </button>
        <div className="flex items-center gap-2 ml-2">
          <button onClick={pauseSpeech}>Pause</button>
          <button onClick={resumeSpeech}>Resume</button>
          <button onClick={skipSpeech}>Skip</button>
          <button onClick={stopSpeech}>Stop</button>
        </div>
      </div>

      {showTranscript && currentLine && (
        <div className="mt-2 max-w-[520px] text-sm glass rounded-xl p-3">
          {currentLine}
        </div>
      )}
    </div>
  )
}