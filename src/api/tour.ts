// Client-side helper that calls /api/generate and returns up to 5 short lines.
type GenerateOpts = { slug: string; context: string; seed?: number; timeoutMs?: number }

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  // @ts-expect-error
  return Promise.race([p, new Promise<T>((_, rej) => ctl.signal.addEventListener('abort', () => rej(new Error('timeout'))))])
    .finally(() => clearTimeout(t))
}

function normalize(anyText: unknown): string[] {
  if (Array.isArray(anyText)) {
    return anyText.map(String).map(s => s.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean).slice(0,5)
  }
  const text = String(anyText ?? '')
  if (!text.trim()) return []
  return text.split(/\r?\n+/).map(s => s.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean).slice(0,5)
}

async function callGenerate(prompt: string, timeoutMs: number): Promise<string[]> {
  const res = await withTimeout(
    fetch('/api/generate', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ prompt }) }),
    timeoutMs
  )
  if (!res.ok) throw new Error(`generate failed: ${res.status}`)
  const data = await res.json().catch(() => [])
  return normalize(data)
}

export async function generateTour(slug: string, context: string, seed = 0): Promise<string[]> {
  const prompt = `
Planet: ${slug}
Seed (vary phrasing): ${seed}

Context (facts/notes, may include markdown):
${context}
`.trim()

  try {
    const lines = await callGenerate(prompt, 15000)
    return lines // <- no forced fallback here
  } catch {
    return [] // <- if AI fails, UI will show your facts/summary instead of those 3 generic lines
  }
}