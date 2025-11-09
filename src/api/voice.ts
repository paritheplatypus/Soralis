// src/api/voice.ts
let currentAudio: HTMLAudioElement | null = null
let currentAbort: AbortController | null = null

// Cache: (voice|model|text) -> objectURL
const cache = new Map<string, string>()

// ---- UI sync events (App listens to these) ----
const EVT_NEXT  = 'tts:advance' // advance transcript highlight
const EVT_RESET = 'tts:reset'   // clear/reset highlight

// ---- TTS config ----
const ELEVEN_VOICE_ID =
  (import.meta as any).env?.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel
const ELEVEN_MODEL = 'eleven_turbo_v2'

// If an ElevenLabs key exists (or explicitly set), don't fall back to WebSpeech
const DISABLE_WEBSPEECH =
  ((import.meta as any).env?.VITE_DISABLE_WEBSPEECH === '1') ||
  !!((import.meta as any).env?.VITE_ELEVENLABS_API_KEY)

type QueueItem = { text: string }
const q: QueueItem[] = []
let playing = false
let primed = false

// ----- unlock audio on first user gesture -----
export function prime() {
  if (primed) return
  primed = true
  try {
    const a = new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA') // tiny silent
    a.play().catch(()=>{})
    setTimeout(()=>a.pause(), 50)
  } catch {}
}

function revokeIfBlob(url?: string) {
  try {
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
  } catch {}
}

function playUrl(url: string) {
  // stop previous
  if (currentAudio) {
    try {
      currentAudio.pause()
      revokeIfBlob(currentAudio.src)
    } catch {}
  }
  currentAudio = new Audio(url)
  currentAudio.volume = 0.9

  // On any completion/error, notify UI to advance, then queue next
  currentAudio.onended = () => {
    playing = false
    window.dispatchEvent(new Event(EVT_NEXT))
    next()
  }
  currentAudio.onerror = () => {
    playing = false
    window.dispatchEvent(new Event(EVT_NEXT))
    next()
  }

  // Fire & forget
  currentAudio.play().catch(() => {
    playing = false
    window.dispatchEvent(new Event(EVT_NEXT))
    next()
  })
}

function cacheKeyFor(text: string) {
  // include voice & model so switching voices/models doesn't reuse blobs
  return `${ELEVEN_VOICE_ID}|${ELEVEN_MODEL}|${text}`
}

// ---- fetch audio MP3 from serverless, else ElevenLabs, else optional WebSpeech ----
async function fetchTTS(text: string, signal: AbortSignal): Promise<string | 'webspeech'> {
  const key = cacheKeyFor(text)

  // 0) Cache hit
  const hit = cache.get(key)
  if (hit) return hit

  // 1) Try your own proxy if present
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({ text, voiceId: ELEVEN_VOICE_ID, modelId: ELEVEN_MODEL }),
      signal
    })
    if (r.ok) {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      cache.set(key, url)
      return url
    }
  } catch {}

  // 2) ElevenLabs direct (dev-friendly)
  try {
    const xi = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY
    if (xi) {
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'xi-api-key': xi,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: ELEVEN_MODEL,
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true
          }
        }),
        signal
      })
      if (r.ok) {
        const blob = await r.blob()
        const urlObj = URL.createObjectURL(blob)
        cache.set(key, urlObj)
        return urlObj
      }
    }
  } catch {}

  // 3) Optional fallback to native Web Speech
  if (DISABLE_WEBSPEECH) throw new Error('no-tts')
  return 'webspeech'
}

function speakWithWebSpeech(text: string) {
  // Browser TTS fallback: instant, but no MP3 caching
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.0
    u.pitch = 1.0
    u.volume = 1.0
    window.speechSynthesis.cancel()
    u.onend = () => {
      playing = false
      window.dispatchEvent(new Event(EVT_NEXT))
      next()
    }
    window.speechSynthesis.speak(u)
  } catch {
    playing = false
    window.dispatchEvent(new Event(EVT_NEXT))
    next()
  }
}

async function next() {
  if (playing) return
  const item = q.shift()
  if (!item) return
  playing = true
  currentAbort = new AbortController()
  try {
    const res = await fetchTTS(item.text, currentAbort.signal)
    if (res === 'webspeech') {
      if (DISABLE_WEBSPEECH) { playing = false; window.dispatchEvent(new Event(EVT_NEXT)); return next() }
      speakWithWebSpeech(item.text)
    } else {
      playUrl(res)
    }
  } catch {
    // last-ditch
    if (!DISABLE_WEBSPEECH) speakWithWebSpeech(item.text)
    else { playing = false; window.dispatchEvent(new Event(EVT_NEXT)); next() }
  }
}

export function speak(text: string) {
  q.push({ text })
  if (!playing) next()
}

export function speakBatch(lines: string[]) {
  for (const line of lines) {
    const t = (line || '').trim()
    if (t) q.push({ text: t })
  }
  if (!playing) next()
}

export function stopSpeech() {
  try {
    currentAbort?.abort()
    currentAudio?.pause()
    revokeIfBlob(currentAudio?.src)
    window.speechSynthesis?.cancel?.()
  } catch {}
  currentAudio = null
  playing = false
  q.length = 0
  // notify UI to reset highlight
  window.dispatchEvent(new Event(EVT_RESET))
}

export function pauseSpeech() {
  try {
    if (currentAudio) currentAudio.pause()
    else window.speechSynthesis?.pause?.()
  } catch {}
}

export function resumeSpeech() {
  try {
    if (currentAudio && currentAudio.paused) currentAudio.play().catch(()=>{})
    else window.speechSynthesis?.resume?.()
  } catch {}
}

export function skipSpeech() {
  try {
    if (currentAudio) currentAudio.pause()
    window.speechSynthesis?.cancel?.()
  } catch {}
  // advance the UI step immediately on skip
  window.dispatchEvent(new Event(EVT_NEXT))
  playing = false
  next()
}