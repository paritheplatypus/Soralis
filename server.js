// Plain Node ESM server (no TypeScript).
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PORT = process.env.PORT || 8788;
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---- GEMINI /api/generate ----
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

app.post("/api/generate", async (req, res) => {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return res.status(500).send("Missing GOOGLE_API_KEY");
    }
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).send("prompt is required");
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([
      {
        text:
          "You are Solaris — a calm, ethereal AI guide.\n" +
          "Return 5 short (8–20 words), soothing lines only. No numbering. One line per paragraph.\n" +
          "Avoid repeating the title twice. Prefer imagery + factual hints.",
      },
      { text: prompt },
    ]);

    const text = result.response.text() || "";
    // Normalize to <=5 lines
    const lines = text
      .split(/\r?\n+/)
      .map((s) => s.replace(/^\s*[-•\d.]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    return res.json(lines);
  } catch (err) {
    console.error("generate error:", err);
    return res.status(500).send("generate failed");
  }
});

// ---- ELEVENLABS /api/tts (optional) ----
app.post("/api/tts", async (req, res) => {
  try {
    const XI = process.env.ELEVENLABS_API_KEY;
    if (!XI) return res.status(404).send("TTS proxy disabled (no ELEVENLABS_API_KEY)");
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM", modelId = "eleven_turbo_v2" } = req.body || {};
    if (!text || typeof text !== "string") return res.status(400).send("text is required");

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": XI,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => String(r.status));
      console.error("tts proxy failed:", r.status, msg);
      return res.status(502).send("tts upstream failed");
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const buf = Buffer.from(await r.arrayBuffer());
    return res.send(buf);
  } catch (err) {
    console.error("tts error:", err);
    return res.status(500).send("tts failed");
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});