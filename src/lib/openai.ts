import { aiChat } from "@/lib/ai-provider"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

// Delega para o provedor configurado em Configurações → Integrações
async function openAIFetch(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  return aiChat(messages, temperature)
}

interface LeadQualificationResult {
  score: number
  classification: "quente" | "morno" | "frio" | "nao_qualificado"
  sentimentScore: number
  reasons: string[]
  recommendations: string[]
  extractedData: {
    budget?: string
    timeline?: string
    needs?: string[]
    objections?: string[]
    decisionMaker?: boolean
  }
}

export async function qualifyLead(
  leadName: string,
  conversationHistory: string,
  leadContext?: string
): Promise<LeadQualificationResult> {
  const systemPrompt = `Você é um especialista em qualificação de leads para um CRM de vendas B2B.
Analise a conversa fornecida e retorne um JSON com a seguinte estrutura:
{
  "score": <número de 0-100 indicando qualidade do lead>,
  "classification": <"quente" | "morno" | "frio" | "nao_qualificado">,
  "sentimentScore": <número de -100 a 100 indicando sentimento>,
  "reasons": [<lista de razões para a classificação>],
  "recommendations": [<lista de ações recomendadas>],
  "extractedData": {
    "budget": <orçamento mencionado ou null>,
    "timeline": <prazo mencionado ou null>,
    "needs": [<necessidades identificadas>],
    "objections": [<objeções identificadas>],
    "decisionMaker": <true/false se é decisor>
  }
}

Critérios de classificação:
- QUENTE (score 75-100): Interesse explícito, orçamento definido, decisor, prazo urgente
- MORNO (score 50-74): Interesse moderado, pesquisando opções, sem urgência
- FRIO (score 25-49): Pouco interesse, sem orçamento definido, estágio inicial
- NÃO QUALIFICADO (score 0-24): Sem fit, spam, ou sem informação suficiente

Retorne APENAS o JSON, sem markdown ou texto adicional.`

  const userPrompt = `Lead: ${leadName}
${leadContext ? `Contexto: ${leadContext}\n` : ""}Histórico da conversa:
${conversationHistory}`

  try {
    const result = await openAIFetch([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ])
    const parsed = JSON.parse(result.trim()) as LeadQualificationResult
    return {
      score: Math.max(0, Math.min(100, parsed.score || 0)),
      classification: parsed.classification || "nao_qualificado",
      sentimentScore: Math.max(-100, Math.min(100, parsed.sentimentScore || 0)),
      reasons: parsed.reasons || [],
      recommendations: parsed.recommendations || [],
      extractedData: parsed.extractedData || {},
    }
  } catch (error) {
    console.error("Erro ao qualificar lead com IA:", error)
    return { score: 0, classification: "nao_qualificado", sentimentScore: 0, reasons: ["Erro na análise por IA"], recommendations: ["Analisar manualmente"], extractedData: {} }
  }
}

export async function generateReply(
  conversationHistory: string,
  leadContext: string,
  tone: "formal" | "casual" | "profissional" = "profissional"
): Promise<string> {
  return openAIFetch([
    { role: "system", content: `Você é um assistente de vendas profissional para um CRM.\nGere uma resposta adequada para a conversa de vendas em Português do Brasil.\nTom: ${tone}.\nSeja conciso, direto e orientado a avançar a negociação.\nNÃO use markdown. Responda em texto puro como se fosse uma mensagem de WhatsApp.` },
    { role: "user", content: `Contexto do lead: ${leadContext}\n\nHistórico da conversa:\n${conversationHistory}\n\nGere a próxima resposta do vendedor:` },
  ], 0.7)
}

export async function summarizeConversation(conversationHistory: string): Promise<string> {
  return openAIFetch([
    { role: "system", content: `Você é um assistente de CRM. Faça um resumo conciso da conversa em Português do Brasil.\nInclua: pontos principais discutidos, interesse do lead, próximos passos mencionados.\nMáximo 3 parágrafos curtos.` },
    { role: "user", content: `Resuma esta conversa:\n${conversationHistory}` },
  ], 0.3)
}
