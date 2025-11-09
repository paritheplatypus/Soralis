// src/components/PlanetQA.tsx
import { useMemo, useRef, useState, useEffect } from 'react'
import entitiesData from '../data/entities.json'
import { MessageCircle, Send } from 'lucide-react'

type Props = { slug: string }

type Entity = typeof entitiesData[number]
type Msg = { role: 'user' | 'assistant'; text: string }

function buildPlanetText(slug: string) {
  const e = (entitiesData as Entity[]).find(x => x.slug === slug)
  if (!e) return ''
  const facts = Array.isArray((e as any).facts) ? (e as any).facts.join(' ') : ''
  const sections = Array.isArray((e as any).sections)
    ? (e as any).sections.map((s: any) => s?.md || '').join(' ')
    : ''
  const summary = (e as any).summary || ''
  return [e.title, summary, facts, sections].filter(Boolean).join(' ')
}

function tokens(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export default function PlanetQA({ slug }: Props) {
  const [q, setQ] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: 'Ask about this world—composition, atmosphere, moons, climate, orbits…' }
  ])

  const corpus = useMemo(() => buildPlanetText(slug), [slug])
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  function answerPlanet(q: string) {
    // naive sentence selection from this planet only
    const sentences = (corpus.match(/[^\.!\?]+[\.!\?]/g) || []).map(s => s.trim())
    if (!sentences.length) return null
    const qTok = tokens(q)
    const scored = sentences.map(s => {
      const hit = tokens(s).reduce((acc, t) => acc + (qTok.includes(t) ? 1 : 0), 0)
      return { s, hit }
    })
    scored.sort((a,b)=> b.hit - a.hit)
    const main = (scored[0]?.s || sentences[0]).trim()
    const extra = (scored[1]?.s || '').trim()
    return [main, extra].filter(Boolean).join(' ')
  }

  function submit(text: string) {
    setMsgs(m => [...m, { role: 'user', text }])
    const a = answerPlanet(text)
    if (!a) {
      setMsgs(m => [...m, { role: 'assistant', text: "I couldn't find that in the local notes for this planet. Try rephrasing or asking a narrower question." }])
      return
    }
    setMsgs(m => [...m, { role: 'assistant', text: a }])
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="flex items-center gap-2 text-sm mb-2 text-white/85">
        <MessageCircle className="h-4 w-4" />
        <span className="font-medium">Ask about this planet</span>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`text-[13px] ${m.role==='user' ? 'text-white' : 'text-white/85'}`}>
            <div className={`rounded-md px-3 py-2 ${m.role==='user' ? 'bg-white/15' : 'bg-white/8'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e)=>{ e.preventDefault(); const t=q.trim(); if(!t) return; setQ(''); submit(t) }}
      >
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="e.g., What makes its atmosphere unique?"
          className="flex-1 bg-black/30 rounded-md px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/20"
        />
        <button
          type="submit"
          className="glass rounded-md px-3 py-2 text-sm inline-flex items-center gap-2"
          title="Ask"
        >
          <Send className="h-4 w-4" /> Ask
        </button>
      </form>

      {/* quick chips */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
        {['atmosphere','moons','temperature','surface','magnetic field'].map((t)=>(
          <button
            key={t}
            type="button"
            className="px-2 py-1 rounded-full bg-white/10 hover:bg-white/15"
            onClick={()=> submit(`Tell me about its ${t}.`) }
          >{t}</button>
        ))}
      </div>
    </div>
  )
}