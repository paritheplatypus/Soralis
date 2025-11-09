// src/components/AskSolaris.tsx
import { useState, useRef, useEffect } from 'react'
import { answerFromTop } from '../lib/solarisSearch'
import { MessageCircle, Send } from 'lucide-react'

type Props = {
  onOpenPlanet?: (slug: string) => void
}

type Msg = { role: 'user'|'assistant', text: string, title?: string, slug?: string }

export default function AskSolaris({ onOpenPlanet }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: 'Ask me about any planet, moon, or orbital concept. Try “Why is Venus so hot?” or “What is Europa famous for?”' }
  ])
  const [q, setQ] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(()=> { endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs])

  function ask(text: string) {
    setMsgs(m => [...m, { role: 'user', text }])
    const ans = answerFromTop(text)
    if (!ans) {
      setMsgs(m => [...m, { role: 'assistant', text: "I couldn't find that in the local guide. Try rephrasing or asking about a specific planet." }])
      return
    }
    setMsgs(m => [...m, {
      role: 'assistant',
      text: ans.text,
      title: ans.title,
      slug: ans.slug
    }])
  }

  return (
    <div className="bg-[#0a0f2b]/60 rounded-2xl p-5 text-gray-100 shadow-md h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Ask Solaris</h2>
      </div>

      {/* messages */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm ${m.role==='user' ? 'text-white' : 'text-white/85'}`}>
            {m.role==='assistant' && m.title ? (
              <div className="mb-1 text-xs text-cyan-200/80">
                Answer based on <button
                  className="underline underline-offset-2 hover:text-cyan-100"
                  onClick={m.slug ? ()=> onOpenPlanet?.(m.slug!) : undefined}
                  title={m.slug ? 'Open planet card' : undefined}
                >{m.title}</button>
              </div>
            ) : null}
            <div className={`rounded-md px-3 py-2 ${m.role==='user' ? 'bg-white/15' : 'bg-white/8'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* input */}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e)=>{ e.preventDefault(); if(q.trim()) { const t=q.trim(); setQ(''); ask(t) } }}
      >
        <input
          value={q}
          onChange={e=>setQ(e.target.value)}
          placeholder="Ask about planets, moons, orbits…"
          className="flex-1 bg-black/30 rounded-md px-3 py-2 text-sm outline-none border border-white/10 focus:border-white/20"
        />
        <button
          type="submit"
          className="glass rounded-md px-3 py-2 text-sm inline-flex items-center gap-2"
          title="Send"
        >
          <Send className="h-4 w-4" /> Ask
        </button>
      </form>

      {/* quick tips */}
      <div className="mt-2 text-[11px] text-white/60">
        Tips: “Why is Venus hot?”, “Does Europa have an ocean?”, “fastest winds?”, “retrograde rotation?”
      </div>
    </div>
  )
}