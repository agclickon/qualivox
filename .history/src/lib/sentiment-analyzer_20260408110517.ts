/**
 * Análise de sentimento em tempo real — roda por mensagem individual.
 * Usa o provedor ativo (ai-provider.ts), não hardcoded OpenAI.
 */
import { aiChat } from "@/lib/ai-provider"

export interface SentimentResult {
  score: number         // -100 a 100
  label: "positivo" | "neutro" | "negativo"
  urgency: number       // 0-100
  flags: string[]
}

export async function analyzeSentiment(
  lastMessages: string[],
  leadName: string
): Promise<SentimentResult | null> {
  if (lastMessages.length === 0) return null

  const msgs = lastMessages.slice(-5).join("\n")

  const prompt = `Analise o sentimento do lead "${leadName}" com base nas últimas mensagens dele:\n\n${msgs}\n\nRetorne APENAS JSON:\n{"score": 0, "label": "neutro", "urgency": 0, "flags": []}\n\nscore: -100 a 100 | label: positivo/neutro/negativo | urgency: 0-100 | flags: array com termos como "frustrado", "impaciente", "satisfeito", "ameaca_cancelamento", "elogio"`

  try {
    const raw = await aiChat([{ role: "user", content: prompt }], 0)
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "")
    const parsed = JSON.parse(cleaned) as SentimentResult
    return {
      score: typeof parsed.score === "number" ? Math.max(-100, Math.min(100, parsed.score)) : 0,
      label: (["positivo", "neutro", "negativo"].includes(parsed.label) ? parsed.label : "neutro") as SentimentResult["label"],
      urgency: typeof parsed.urgency === "number" ? Math.max(0, Math.min(100, parsed.urgency)) : 0,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    }
  } catch (err) {
    console.warn("[Sentiment] Erro:", err)
    return null
  }
}
