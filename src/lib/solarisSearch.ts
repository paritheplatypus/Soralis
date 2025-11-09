// src/lib/solarisSearch.ts
import entitiesData from '../data/entities.json'

// Build lightweight docs from entities.json
type Entity = typeof entitiesData[number]

type Doc = {
  slug: string
  title: string
  text: string
  boost: number
}

const DOCS: Doc[] = (entitiesData as Entity[]).map(e => {
  const facts = Array.isArray((e as any).facts) ? (e as any).facts.join(' ') : ''
  const sections = Array.isArray((e as any).sections)
    ? (e as any).sections.map((s: any) => s?.md || '').join(' ')
    : ''
  const summary = (e as any).summary || ''
  const text = [e.title, summary, facts, sections].filter(Boolean).join(' ')
  return {
    slug: e.slug,
    title: e.title,
    text,
    boost: 1.0
  }
})

// Simple tokenizer
function tokens(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

// Very small scoring: term frequency with field boost, plus title bonus
export function searchSolaris(q: string, k = 5) {
  const qTokens = tokens(q)
  if (!qTokens.length) return []

  const scored = DOCS.map(d => {
    const dtoks = tokens(d.text)
    let score = 0
    for (const t of qTokens) {
      const tf = dtoks.filter(x => x === t).length
      score += tf * d.boost
      // title bonus
      if (d.title.toLowerCase().includes(t)) score += 2
    }
    // small length norm
    score = score / Math.sqrt(1 + dtoks.length / 500)
    return { ...d, score }
  }).filter(r => r.score > 0)

  scored.sort((a,b) => b.score - a.score)
  return scored.slice(0, k)
}

// Build a short answer from top doc: 2-3 sentences near matched tokens
export function answerFromTop(q: string) {
  const top = searchSolaris(q, 1)[0]
  if (!top) return null
  const sentences = (top.text.match(/[^\.!\?]+[\.!\?]/g) || []).map(s => s.trim())
  const qTerms = tokens(q)
  const scoredSentences = sentences.map(s => {
    const stoks = tokens(s)
    const hit = qTerms.reduce((acc,t) => acc + stoks.filter(x => x===t).length, 0)
    return { s, hit }
  })
  scoredSentences.sort((a,b)=> b.hit - a.hit)
  const picked = (scoredSentences[0]?.s || sentences[0] || '').trim()
  const extra = (scoredSentences[1]?.s || '').trim()
  const text = [picked, extra].filter(Boolean).join(' ')
  return { slug: top.slug, title: top.title, text }
}