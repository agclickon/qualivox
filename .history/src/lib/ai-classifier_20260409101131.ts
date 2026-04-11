import { prisma } from "@/lib/prisma"
import { aiChat } from "@/lib/ai-provider"

export interface ClassifyInput {
  leadId: string
  messages: { direction: string; content: string; createdAt: string; messageType: string }[]
  pipelineStages: { id: string; name: string; order: number }[]
  availableTags: { id: string; name: string; description: string | null }[]
  currentStageId: string | null
  leadName: string
}

export interface ClassifyResult {
  summary: string
  keyPoints: string[]
  suggestedStageId: string | null
  suggestedStageName: string | null
  confidence: number // 0-100
  suggestedTagIds: string[]
  suggestedTagNames: string[]
  score: number // 0-100
  qualificationLevel: "quente" | "morno" | "frio" | "nao_qualificado"
  sentiment: "positivo" | "neutro" | "negativo"
  nextAction: string
  reasoning: string
}

function buildPrompt(input: ClassifyInput): string {
  const msgs = input.messages
    .slice(-60) // últimas 60 mensagens para não estourar contexto
    .map((m) => `[${m.direction === "outgoing" ? "Atendente" : "Lead"}] ${m.content}`)
    .join("\n")

  const stages = input.pipelineStages
    .map((s) => `- id: "${s.id}" | nome: "${s.name}"`)
    .join("\n")

  const tags = input.availableTags.length > 0
    ? input.availableTags.map((t) => `- id: "${t.id}" | nome: "${t.name}"${t.description ? ` | desc: ${t.description}` : ""}`).join("\n")
    : "Nenhuma tag disponível no catálogo."

  return `Você é um assistente de CRM especializado em análise de conversas de vendas em WhatsApp.
Analise a conversa abaixo e retorne um JSON com a classificação do lead.

# Lead: ${input.leadName}

# Conversa:
${msgs}

# Estágios do pipeline disponíveis:
${stages}

# Tags disponíveis no catálogo:
${tags}

# Instruções:
- Analise o interesse, urgência, objeções e intenção de compra do lead
- Sugira o estágio do pipeline mais adequado com base no conteúdo
- Selecione as tags relevantes do catálogo (apenas as que realmente se aplicam)
- Gere um resumo claro e objetivo em português
- Liste os pontos-chave da conversa (máximo 5)
- Sugira a próxima ação que o atendente deveria tomar
- Avalie o sentimento geral do lead na conversa

Retorne APENAS um JSON válido com esta estrutura exata (sem markdown, sem explicações):
{
  "summary": "resumo em 2-3 frases",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "suggestedStageId": "id do estágio ou null",
  "suggestedStageName": "nome do estágio ou null",
  "confidence": 85,
  "suggestedTagIds": ["id1", "id2"],
  "suggestedTagNames": ["nome1", "nome2"],
  "score": 72,
  "qualificationLevel": "quente",
  "sentiment": "positivo",
  "nextAction": "Enviar proposta comercial com os valores discutidos",
  "reasoning": "Motivo resumido da classificação em 1 frase"
}`
}

export async function classifyConversation(input: ClassifyInput): Promise<ClassifyResult> {
  const prompt = buildPrompt(input)

  const raw = await aiChat([{ role: "user", content: prompt }], 0.2)

  const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "")

  let result: ClassifyResult
  try {
    result = JSON.parse(cleaned) as ClassifyResult
  } catch {
    throw new Error("Resposta inválida do provedor IA — não foi possível parsear o JSON.")
  }

  // Garantir campos obrigatórios com fallbacks
  return {
    summary: result.summary ?? "Sem resumo disponível.",
    keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
    suggestedStageId: result.suggestedStageId ?? null,
    suggestedStageName: result.suggestedStageName ?? null,
    confidence: typeof result.confidence === "number" ? Math.min(100, Math.max(0, result.confidence)) : 0,
    suggestedTagIds: Array.isArray(result.suggestedTagIds) ? result.suggestedTagIds : [],
    suggestedTagNames: Array.isArray(result.suggestedTagNames) ? result.suggestedTagNames : [],
    score: typeof result.score === "number" ? Math.min(100, Math.max(0, result.score)) : 0,
    qualificationLevel: result.qualificationLevel ?? "nao_qualificado",
    sentiment: result.sentiment ?? "neutro",
    nextAction: result.nextAction ?? "",
    reasoning: result.reasoning ?? "",
  }
}
