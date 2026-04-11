/**
 * Geração de embeddings vetoriais para RAG.
 * Suporte: OpenAI text-embedding-3-small | Google Gemini text-embedding-004
 * Fallback: se nenhuma chave disponível, retorna vetor vazio (busca cai para keyword).
 */
import { prisma } from "@/lib/prisma"

// ── Busca config do provedor ─────────────────────────────────────────────────

async function getEmbeddingConfig(): Promise<{
  provider: "openai" | "gemini" | null
  apiKey: string
  model: string
}> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["aiDefaultProvider", "openaiKey", "geminiKey"] } },
  })
  const s: Record<string, string> = {}
  for (const r of settings) s[r.key] = r.value

  const provider = s.aiDefaultProvider || "openai"

  if (provider === "gemini" && (s.geminiKey || process.env.GEMINI_API_KEY)) {
    return { provider: "gemini", apiKey: s.geminiKey || process.env.GEMINI_API_KEY || "", model: "text-embedding-004" }
  }

  const openaiKey = s.openaiKey || process.env.OPENAI_API_KEY || ""
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, model: "text-embedding-3-small" }
  }

  return { provider: null, apiKey: "", model: "" }
}

// ── Chamadas de API ───────────────────────────────────────────────────────────

async function embedOpenAI(texts: string[], apiKey: string, model: string): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: texts }),
  })
  if (!res.ok) throw new Error(`OpenAI embeddings error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

async function embedGemini(texts: string[], apiKey: string, model: string): Promise<number[][]> {
  const results: number[][] = []
  // Gemini embeddings API processa um texto por vez
  for (const text of texts) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      }
    )
    if (!res.ok) throw new Error(`Gemini embeddings error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    results.push(data.embedding?.values || [])
  }
  return results
}

// ── Função pública: gerar embedding(s) ───────────────────────────────────────

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const config = await getEmbeddingConfig()
  if (!config.provider) {
    console.warn("[Embeddings] Nenhuma chave disponível — retornando vetores vazios")
    return texts.map(() => [])
  }

  try {
    if (config.provider === "gemini") {
      return await embedGemini(texts, config.apiKey, config.model)
    }
    return await embedOpenAI(texts, config.apiKey, config.model)
  } catch (err) {
    console.error("[Embeddings] Erro ao gerar embeddings:", err)
    return texts.map(() => [])
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddings([text])
  return results[0] || []
}

// ── Similaridade de cosseno ───────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}
