// /api/generate.ts
// Node/Serverless handler that returns an array<string> narration steps.
//
// ENV required (server-side):
//   OPENAI_API_KEY=sk-... (do NOT expose to client)
// Optional:
//   SOLARIS_MODEL=gpt-4o-mini (default below)

import type { IncomingMessage, ServerResponse } from "http"

type Body = { prompt?: string }
type Json = (obj: any, status?: number) => void

async function readBody(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve) => {
    let data = ""
    req.on("data", (chunk) => (data += chunk))
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")) }
      catch { resolve({}) }
    })
  })
}

// Minimal OpenAI client (no SDK to keep it portable)
async function openaiChat(messages: {role: "user"|"system"|"assistant"; content: string}[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")
  const model = process.env.SOLARIS_MODEL || "gpt-4o-mini"

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 })
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`OpenAI error ${r.status}: ${text}`)
  }
  const j = await r.json()
  return j?.choices?.[0]?.message?.content ?? ""
}

// Normalized export for Vercel/Netlify/Node
export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse & { json?: Json }) {
  try {
    if (req.method && req.method.toUpperCase() !== "POST") {
      res.statusCode = 405
      res.setHeader?.("Content-Type", "application/json")
      res.end?.(JSON.stringify({ error: "Method Not Allowed" }))
      return
    }

    const { prompt = "" } = await readBody(req)

    const content = await openaiChat([
      {
        role: "system",
        content:
`You are Solaris — a calm, ethereal AI guide to the cosmos.
Speak in short, vivid sentences (8–20 words each).
Balance poetry with clear facts. Never list numbers unless essential.
Return exactly 5 bullet-like lines separated by newlines.`
      },
      { role: "user", content: prompt }
    ])

    // Turn the model output into an array of lines
    const lines = String(content)
      .split(/\r?\n+/)
      .map(s => s.replace(/^\s*[-•]\s*/,'').trim())
      .filter(Boolean)
      .slice(0, 5)

    const payload = lines.length ? lines : ["Let’s explore this world together.", "I’ll guide you through its most striking features."]

    res.statusCode = 200
    res.setHeader?.("Content-Type", "application/json")
    res.end?.(JSON.stringify(payload))
  } catch (err: any) {
    res.statusCode = 500
    res.setHeader?.("Content-Type", "application/json")
    res.end?.(JSON.stringify({ error: err?.message || "Internal Error" }))
  }
}