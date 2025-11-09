// src/api/gemini.ts
type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}

function usedFactsSet(slug: string): Set<string> {
  const key = `aurora:usedfacts:${slug}`
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')) }
  catch { return new Set() }
}
function saveUsedFacts(slug: string, lines: string[]) {
  const key = `aurora:usedfacts:${slug}`
  const s = usedFactsSet(slug)
  lines.forEach(t => s.add(t.toLowerCase()))
  localStorage.setItem(key, JSON.stringify([...s].slice(-120)))
}

function fallbackFrom(md: string, slug: string): string[] {
  // only real sentences from the MD – no “You’re viewing…” / “Learn more…”
  const base = md.replace(/\s+/g, ' ').trim()
  const picks = base.split(/[.?!]\s+/).map(s => s.trim()).filter(Boolean)
  const used = usedFactsSet(slug)
  const clean = picks
    .map(s => (s.length > 180 ? s.slice(0, 177) + '…' : s))
    .filter(t => !used.has(t.toLowerCase()))
  return clean.slice(0, 6)
}

export async function genTourSteps(
  slug: string,
  md: string,
  style: 'explorer'|'scientist'|'storyteller'
): Promise<string[]> {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  const persona =
    style==='explorer'   ? 'Curious, vivid, but factual' :
    style==='scientist'  ? 'Concise and numeric where possible' :
                           'Gentle narrative with simple metaphors, still factual'

  // facts we’ve already used for this planet
  const already = [...usedFactsSet(slug)]

  if (!key) {
    const steps = fallbackFrom(md, slug)
    saveUsedFacts(slug, steps)
    return steps
  }

  const prompt = `
You are generating a SHORT guided-audio tour for the planet "${slug}".
Return STRICT JSON with the key "steps": an array of 3–6 short sentences (10–22 words each).
Do NOT include introductions, outros, calls to action, or UI hints.
Do NOT include any item that appears in this exclude list (case-insensitive match): ${JSON.stringify(already.slice(-200))}
Tone/style: ${persona}.
Content basis (markdown excerpt): """${md.slice(0, 2000)}"""
Output JSON ONLY:
{"steps":[ "...", "...", "..." ]}
  `.trim()

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(key),
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }]}] }) }
    )
    if (!res.ok) throw new Error(String(res.status))
    const data = (await res.json()) as GeminiResponse
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"
    text = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(text)
    let steps: string[] = Array.isArray(parsed.steps) ? parsed.steps : []
    steps = steps
      .map((s:string)=>s.replace(/\s+/g,' ').trim())
      .filter(Boolean)

    // final de-dup against history, and save
    const used = usedFactsSet(slug)
    steps = steps.filter(s => !used.has(s.toLowerCase()))
    if (!steps.length) steps = fallbackFrom(md, slug)

    saveUsedFacts(slug, steps)
    return steps.slice(0, 6)
  } catch {
    const steps = fallbackFrom(md, slug)
    saveUsedFacts(slug, steps)
    return steps
  }
}