import { useCallback, useEffect, useMemo, useState } from 'react'
import { generateTour } from './api/tour'
import { speakBatch, stopSpeech } from './api/voice'

export const useTour = (slug?: string | null, contextMD: string = '', seed = 0) => {
  const [steps, setSteps] = useState<string[]>([])
  const [activeStep, setActiveStep] = useState<number>(-1)
  const [busy, setBusy] = useState(false)
  const safeSlug = slug ?? 'unknown'

  useEffect(() => { stopSpeech(); setSteps([]); setActiveStep(-1) }, [safeSlug])
  useEffect(() => () => stopSpeech(), [])

  const start = useCallback(async () => {
    if (!slug || busy) return
    setBusy(true)
    try {
      const ai = await generateTour(safeSlug, contextMD, seed)
      if (ai && ai.length) {      // only set if we actually got lines
        setSteps(ai)
        stopSpeech()
        speakBatch(ai)
        setActiveStep(0)
      }
    } finally {
      setBusy(false)
    }
  }, [slug, busy, safeSlug, contextMD, seed])

  return {
    steps, activeStep, start,
    next: () => setActiveStep(p => Math.min((p < 0 ? 0 : p) + 1, steps.length - 1)),
    reset: () => { stopSpeech(); setActiveStep(-1) },
    currentLine: activeStep >= 0 ? steps[activeStep] : undefined,
  }
}