/**
 * Orquestrador de Agentes IA
 *
 * Responsável por:
 * 1. Identificar o agente ativo para uma conexão WhatsApp
 * 2. Construir contexto (lead + histórico de conversa + RAG)
 * 3. Executar a chamada ao LLM com o prompt correto
 * 4. Processar a resposta (reply, escalada, log)
 * 5. No modo autônomo/híbrido: enviar a resposta automaticamente
 */

import { prisma } from "@/lib/prisma"
import { aiChat, AiMessage } from "@/lib/ai-provider"
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings"
import { getElevenLabsKey, textToSpeech, shouldUseVoice, SMART_VOICE_INSTRUCTION } from "@/lib/elevenlabs"
import { createCalendarEvent, getCalendarIntegration, getBusySlotsForRange, getEventByConversationAndAgent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/calendar-service"
import { scheduleEventReminders, cancelEventReminders } from "@/lib/reminder-service"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface OrchestratorResult {
  handled: boolean          // true se o agente processou a mensagem
  agentId: string | null
  reply: string | null      // texto da resposta gerada
  escalated: boolean        // true se o agente decidiu escalar para humano
  escalationReason: string | null
  mode: string              // autonomous | assisted | hybrid
  sentAutomatically: boolean
}

interface LeadContext {
  id: string
  name: string
  phone: string | null
  email: string | null
  companyName: string | null
  score: number
  qualificationLevel: string
  status: string
  pipelineStageName: string | null
}

interface ConversationMessage {
  direction: "incoming" | "outgoing"
  content: string
  createdAt: string
}

// ── Busca de agente ativo para a conexão ─────────────────────────────────────

async function findActiveAgent(connectionId: string): Promise<any | null> {
  const agents = await (prisma.agent as any).findMany({
    where: { isActive: true },
  })

  for (const agent of agents) {
    try {
      const ids: string[] = JSON.parse(agent.connectionIds || "[]")
      if (ids.includes(connectionId)) return agent
    } catch { /* ignore */ }
  }
  return null
}

// ── Busca de contexto do lead ─────────────────────────────────────────────────

async function getLeadContext(leadId: string): Promise<LeadContext | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { pipelineStage: { select: { name: true } } },
  })
  if (!lead) return null

  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email ?? null,
    companyName: (lead as any).companyName,
    score: lead.score,
    qualificationLevel: lead.qualificationLevel,
    status: lead.status,
    pipelineStageName: (lead as any).pipelineStage?.name ?? null,
  }
}

// ── Histórico de conversa (últimas N mensagens) ───────────────────────────────

async function getConversationHistory(
  conversationId: string,
  limit = 20
): Promise<ConversationMessage[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { direction: true, content: true, createdAt: true, messageType: true, metadata: true },
  })

  return messages
    .reverse()
    .map((m) => {
      let content = m.content

      // Enriquece com transcrição ou descrição de imagem se disponível
      if (m.messageType === "audio" || m.messageType === "image") {
        try {
          const meta = m.metadata ? JSON.parse(m.metadata as string) : {}
          const enrichment = meta.transcript || meta.imageDescription
          if (enrichment) {
            const prefix = m.messageType === "audio" ? "🎤 [áudio transcrito]" : "🖼️ [imagem descrita]"
            content = `${prefix}: ${enrichment}`
          } else {
            content = m.messageType === "audio" ? "🎤 [áudio]" : "🖼️ [imagem]"
          }
        } catch { /* mantém content original */ }
      }

      return {
        direction: m.direction as "incoming" | "outgoing",
        content,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
      }
    })
}

// ── Busca RAG semântica (vector similarity + fallback keyword) ────────────────

interface RankedChunk {
  text: string
  fileName: string
  score: number
}

async function searchKnowledge(agentId: string, query: string): Promise<string> {
  // Tenta busca semântica via embeddings
  const chunks = await (prisma.agentKnowledgeChunk as any).findMany({
    where: { agentId },
    select: { text: true, embedding: true, knowledge: { select: { fileName: true } } },
  })

  if (chunks.length === 0) {
    // Fallback: nenhum chunk indexado — tenta keyword em content raw
    return searchKnowledgeKeyword(agentId, query)
  }

  // Verifica se algum chunk tem embedding real
  const hasEmbeddings = chunks.some((c: any) => {
    try { return JSON.parse(c.embedding).length > 0 } catch { return false }
  })

  if (!hasEmbeddings) {
    return searchKnowledgeKeyword(agentId, query)
  }

  // Gera embedding da query
  const queryVec = await generateEmbedding(query)
  if (queryVec.length === 0) {
    return searchKnowledgeKeyword(agentId, query)
  }

  // Calcula similaridade para cada chunk
  const ranked: RankedChunk[] = []
  for (const chunk of chunks) {
    try {
      const vec: number[] = JSON.parse(chunk.embedding)
      if (vec.length === 0) continue
      const score = cosineSimilarity(queryVec, vec)
      ranked.push({ text: chunk.text, fileName: chunk.knowledge?.fileName ?? "documento", score })
    } catch { /* ignora chunk corrompido */ }
  }

  if (ranked.length === 0) return ""

  // Ordena por score e pega os top-5
  ranked.sort((a, b) => b.score - a.score)
  const TOP_K = 5
  const SIMILARITY_THRESHOLD = 0.3
  const top = ranked.slice(0, TOP_K).filter((c) => c.score >= SIMILARITY_THRESHOLD)

  if (top.length === 0) return ""

  // Formata com nome do arquivo como citação
  return top.map((c) => `[Fonte: ${c.fileName}]\n${c.text.trim()}`).join("\n\n---\n\n")
}

async function searchKnowledgeKeyword(agentId: string, query: string): Promise<string> {
  const files = await (prisma.agentKnowledge as any).findMany({
    where: { agentId, status: "indexed" },
    select: { fileName: true, content: true },
  })

  if (files.length === 0) return ""

  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 4)
  if (tokens.length === 0) return ""

  const relevantChunks: string[] = []
  for (const file of files) {
    if (!file.content) continue
    const paragraphs = file.content.split(/\n{2,}/).filter((p: string) => p.trim().length > 30)
    for (const para of paragraphs) {
      const lc = para.toLowerCase()
      if (tokens.some((t) => lc.includes(t))) {
        relevantChunks.push(`[Fonte: ${file.fileName}]\n${para.trim()}`)
      }
    }
  }

  return relevantChunks.slice(0, 5).join("\n\n---\n\n")
}

// ── Construção do prompt do sistema ──────────────────────────────────────────

function buildSystemPrompt(
  agent: any,
  lead: LeadContext,
  ragContext: string,
  busySlots: { start: string; end: string }[] = [],
  hasAgentEvent: boolean = false
): string {
  const toneMap: Record<string, string> = {
    formal: "formal e profissional, evite abreviações e linguagem informal",
    casual: "casual e amigável, pode usar emojis moderadamente",
    profissional: "profissional e direto, equilibrado entre formal e casual",
  }
  const toneInstruction = toneMap[agent.tone] || toneMap.profissional

  const leadInfo = [
    `- Nome: ${lead.name}`,
    lead.phone ? `- Telefone: ${lead.phone}` : null,
    lead.companyName ? `- Empresa: ${lead.companyName}` : null,
    `- Score de qualificação: ${lead.score}/100 (${lead.qualificationLevel})`,
    `- Status: ${lead.status}`,
    lead.pipelineStageName ? `- Etapa do pipeline: ${lead.pipelineStageName}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const basePrompt = agent.systemPrompt?.trim()
    ? agent.systemPrompt.trim()
    : "Você é um assistente de vendas profissional. Seu objetivo é ajudar a qualificar leads e agendar demonstrações."

  const now = new Date()
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "America/Sao_Paulo" })
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })

  const parts = [
    basePrompt,
    `\n## Data e hora atual\nHoje é ${dateStr}, às ${timeStr} (horário de Brasília). Use esta informação para calcular datas, dias da semana e horários com precisão.`,
    `\n## Estilo de comunicação\nUse um tom ${toneInstruction}. Escreva em Português do Brasil. Mensagens curtas e diretas, como mensagens de WhatsApp — sem markdown.\nIMPORTANTE: Quando a resposta tiver mais de uma ideia ou etapa, separe cada ideia com uma linha em branco (\\n\\n). Nunca escreva um único bloco longo — divida em partes curtas, máximo 2-3 frases por bloco.`,
    `\n## Contexto do lead\n${leadInfo}`,
  ]

  if (ragContext) {
    parts.push(
      `\n## Base de conhecimento\nUse as informações abaixo como referência para responder dúvidas. Cada trecho está identificado com [Fonte: nome_do_arquivo]. Quando usar uma informação desta base, mencione naturalmente de onde veio (ex: "Conforme nosso catálogo..." ou "De acordo com nossa política..."), sem exibir o nome técnico do arquivo.\n\n${ragContext}`
    )
  }

  const followUpInstruction = `Se o lead indicar que vai pensar, pedir para retornar depois, ou se você julgar adequado um acompanhamento futuro, preencha "scheduleFollowUp" com {"delayHours": <número de horas>, "message": "<mensagem de follow-up>"}. Caso contrário, defina como null.`

  const calendarEnabled = Boolean((agent as any).calendar_enabled ?? (agent as any).calendarEnabled)

  let calendarInstruction: string
  if (!calendarEnabled) {
    calendarInstruction = `Defina sempre "calendarEvent": null, "cancelEvent": false, "rescheduleEvent": null.`
  } else {
    // Formata horários ocupados para o prompt
    let busyInfo = ""
    if (busySlots.length > 0) {
      const fmtSlot = (s: { start: string; end: string }) => {
        const start = new Date(s.start).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
        const end = new Date(s.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
        return `  - ${start} até ${end}`
      }
      busyInfo = `\nHorários JÁ OCUPADOS na agenda (não agende nestes períodos):\n${busySlots.map(fmtSlot).join("\n")}\nSe o lead sugerir um horário ocupado, informe educadamente e sugira um horário próximo disponível.`
    }

    const cancelRescheduleInstruction = hasAgentEvent
      ? `Se o lead pedir para CANCELAR a reunião que você agendou nesta conversa, defina "cancelEvent": true. Se pedir para REMARCAR, defina "rescheduleEvent": {"newStartTime": "<ISO 8601>", "newEndTime": "<ISO 8601>"}. Você só pode alterar reuniões que VOCÊ mesmo agendou nesta conversa — nunca tente alterar reuniões criadas por outra pessoa ou diretamente no Google Calendar.`
      : `Defina sempre "cancelEvent": false e "rescheduleEvent": null (nenhuma reunião sua para alterar nesta conversa).`

    calendarInstruction = `REGRA CRÍTICA: Sempre que o lead confirmar, aceitar ou combinar um agendamento (reunião, consulta, apresentação, demo, alinhamento etc.) com data e hora definidas — você DEVE obrigatoriamente preencher "calendarEvent". NÃO omita mesmo que a data seja distante (semanas ou meses). Formato: {"title": "<título>", "startTime": "<ISO 8601 com offset -03:00>", "endTime": "<ISO 8601 com offset -03:00>", "description": "<descrição opcional>", "addMeetLink": true}. Se o lead não especificar duração, assuma 1 hora. Exemplo para dia 21/04 às 10h: "startTime": "2026-04-21T10:00:00-03:00", "endTime": "2026-04-21T11:00:00-03:00". Se nenhum agendamento foi combinado nesta mensagem, defina como null.${busyInfo}\n${cancelRescheduleInstruction}`
  }

  // Modo voz inteligente: injeta instrução para o agente decidir
  const isSmartVoice = agent.voiceEnabled && agent.voiceMode === "smart"
  if (isSmartVoice) {
    parts.push(`\n${SMART_VOICE_INSTRUCTION}`)
  }

  const useVoiceField = isSmartVoice ? `, "useVoice": false` : ""

  if (agent.mode === "autonomous" || agent.mode === "hybrid") {
    parts.push(
      `\n## Instruções de formato\nResponda APENAS com um JSON válido no seguinte formato:\n{"reply": "<sua resposta aqui>", "escalate": false, "escalationReason": null, "scheduleFollowUp": null, "calendarEvent": null, "cancelEvent": false, "rescheduleEvent": null${useVoiceField}}\n\nSe identificar que o lead está muito frustrado, com sentimento muito negativo, ou se a pergunta exige aprovação humana, defina "escalate": true e descreva o motivo em "escalationReason".\n${followUpInstruction}\n${calendarInstruction}\nNunca inclua markdown ou texto fora do JSON.`
    )
  } else {
    parts.push(
      `\n## Instruções de formato\nResponda APENAS com um JSON válido no seguinte formato:\n{"reply": "<sugestão de resposta>", "escalate": false, "escalationReason": null, "scheduleFollowUp": null, "calendarEvent": null, "cancelEvent": false, "rescheduleEvent": null${useVoiceField}}\n\n${followUpInstruction}\n${calendarInstruction}\nNunca inclua markdown ou texto fora do JSON.`
    )
  }

  return parts.join("\n")
}

// ── Construção das mensagens de chat ─────────────────────────────────────────

function buildMessages(
  systemPrompt: string,
  history: ConversationMessage[],
  currentMessage: string
): AiMessage[] {
  const messages: AiMessage[] = [{ role: "system", content: systemPrompt }]

  // Histórico formatado como turns
  for (const msg of history.slice(-10)) {
    // Últimas 10 mensagens
    if (msg.content.trim()) {
      messages.push({
        role: msg.direction === "incoming" ? "user" : "assistant",
        content: msg.content,
      })
    }
  }

  // Mensagem atual (se não estiver já no histórico)
  const lastHistory = history[history.length - 1]
  if (!lastHistory || lastHistory.content !== currentMessage) {
    messages.push({ role: "user", content: currentMessage })
  }

  return messages
}

// ── Splitting de mensagens longas ─────────────────────────────────────────────

function isListBlock(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim())
  if (lines.length < 2) return false
  const listPattern = /^(\s*[-•*]|\s*\d+[.)]\s)/
  const listLines = lines.filter((l) => listPattern.test(l))
  return listLines.length >= lines.length * 0.6 // >= 60% das linhas são lista
}

// Divide um texto longo em sentenças pelo ponto final seguido de espaço ou fim
function splitBySentences(text: string, maxLen: number): string[] {
  const parts: string[] = []
  // Quebra em: ". ", "! ", "? ", ".\n", "!\n", "?\n"
  const sentences = text.split(/(?<=[.!?])\s+/)
  let buffer = ""
  for (const sentence of sentences) {
    if (buffer.length > 0 && buffer.length + sentence.length + 1 > maxLen) {
      parts.push(buffer.trim())
      buffer = sentence
    } else {
      buffer += (buffer ? " " : "") + sentence
    }
  }
  if (buffer.trim()) parts.push(buffer.trim())
  return parts.length > 0 ? parts : [text]
}

export function splitIntoMessages(text: string, enabled: boolean): string[] {
  if (!enabled) return [text]

  // Limite máximo por mensagem (caracteres)
  const MAX_MSG_LEN = 320

  // Passo 1: divide por parágrafos (quebra dupla)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const blocks: string[] = paragraphs.length > 1 ? paragraphs : [text]

  // Passo 2: blocos muito longos sem parágrafo → divide por sentenças
  const expanded: string[] = []
  for (const block of blocks) {
    if (block.length > MAX_MSG_LEN && !isListBlock(block)) {
      expanded.push(...splitBySentences(block, MAX_MSG_LEN))
    } else {
      expanded.push(block)
    }
  }

  if (expanded.length <= 1) return [text]

  // Passo 3: agrupa partes muito curtas consecutivas
  const parts: string[] = []
  let buffer = ""

  for (const part of expanded) {
    const isList = isListBlock(part)

    if (isList) {
      if (buffer.trim()) { parts.push(buffer.trim()); buffer = "" }
      parts.push(part)
    } else if (part.length < 100 && buffer.length + part.length < 180) {
      buffer += (buffer ? " " : "") + part
    } else {
      if (buffer.trim()) { parts.push(buffer.trim()); buffer = "" }
      parts.push(part)
    }
  }

  if (buffer.trim()) parts.push(buffer.trim())

  return parts.length > 0 ? parts : [text]
}

// ── Envio de texto com comportamento humano ───────────────────────────────────

interface SendAsTextOptions {
  reply: string
  jid: string
  connectionId: string
  typingDelay: boolean
  typingDelayMax: number
  splitMessages: boolean
  presenceUpdate: ((presence: string, jid: string) => Promise<void>) | null
  sendFn?: (connectionId: string, jid: string, text: string) => Promise<void>
}

async function sendAsText(options: SendAsTextOptions): Promise<void> {
  const { reply, jid, connectionId, typingDelay, typingDelayMax, splitMessages, presenceUpdate, sendFn } = options

  if (!sendFn) {
    console.warn("[Orchestrator] sendFn não disponível — mensagem não enviada")
    return
  }

  const parts = splitIntoMessages(reply, splitMessages)

  for (const part of parts) {
    if (typingDelay && presenceUpdate) {
      await presenceUpdate("composing", jid).catch(() => {})
      // ~30ms por caractere, limitado ao máximo configurado
      const delayMs = Math.min(part.length * 30, typingDelayMax * 1000)
      await new Promise((r) => setTimeout(r, delayMs))
      await presenceUpdate("paused", jid).catch(() => {})
    }
    await sendFn(connectionId, jid, part)
  }

  console.log(`[Orchestrator] ✓ ${parts.length} parte(s) enviada(s) como texto`)
}

// ── Parser da resposta do LLM ─────────────────────────────────────────────────

function parseAgentResponse(raw: string): {
  reply: string
  escalate: boolean
  escalationReason: string | null
  scheduleFollowUp: { delayHours: number; message: string } | null
  calendarEvent: { title: string; startTime: string; endTime: string; description?: string; addMeetLink?: boolean } | null
  cancelEvent: boolean
  rescheduleEvent: { newStartTime: string; newEndTime: string } | null
  useVoice: boolean
} {
  try {
    const cleaned = raw.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim()
    const parsed = JSON.parse(cleaned)

    let scheduleFollowUp: { delayHours: number; message: string } | null = null
    if (parsed.scheduleFollowUp && typeof parsed.scheduleFollowUp === "object") {
      const delay = Number(parsed.scheduleFollowUp.delayHours)
      const msg = String(parsed.scheduleFollowUp.message || "").trim()
      if (delay > 0 && msg) scheduleFollowUp = { delayHours: delay, message: msg }
    }

    let calendarEvent: { title: string; startTime: string; endTime: string; description?: string; addMeetLink?: boolean } | null = null
    if (parsed.calendarEvent && typeof parsed.calendarEvent === "object") {
      const { title, startTime, endTime, description, addMeetLink } = parsed.calendarEvent
      if (title && startTime && endTime) {
        calendarEvent = { title: String(title), startTime: String(startTime), endTime: String(endTime), description: description ? String(description) : undefined, addMeetLink: Boolean(addMeetLink ?? true) }
      }
    }

    let rescheduleEvent: { newStartTime: string; newEndTime: string } | null = null
    if (parsed.rescheduleEvent && typeof parsed.rescheduleEvent === "object") {
      const { newStartTime, newEndTime } = parsed.rescheduleEvent
      if (newStartTime && newEndTime) {
        rescheduleEvent = { newStartTime: String(newStartTime), newEndTime: String(newEndTime) }
      }
    }

    return {
      reply: String(parsed.reply || "").trim(),
      escalate: Boolean(parsed.escalate),
      escalationReason: parsed.escalationReason ? String(parsed.escalationReason) : null,
      scheduleFollowUp,
      calendarEvent,
      cancelEvent: Boolean(parsed.cancelEvent),
      rescheduleEvent,
      useVoice: Boolean(parsed.useVoice),
    }
  } catch {
    return { reply: raw.trim(), escalate: false, escalationReason: null, scheduleFollowUp: null, calendarEvent: null, cancelEvent: false, rescheduleEvent: null, useVoice: false }
  }
}

// ── Registro de log de decisão na Interaction ────────────────────────────────

async function logAgentDecision(
  leadId: string,
  conversationId: string,
  agentId: string,
  agentName: string,
  reply: string,
  escalated: boolean,
  escalationReason: string | null,
  mode: string
): Promise<void> {
  try {
    const content = escalated
      ? `Agente "${agentName}" escalou para humano. Motivo: ${escalationReason || "não especificado"}`
      : `Agente "${agentName}" ${mode === "assisted" ? "sugeriu" : "enviou"}: ${reply.slice(0, 200)}${reply.length > 200 ? "…" : ""}`

    await prisma.interaction.create({
      data: {
        leadId,
        type: "agent_action",
        content,
        channel: "whatsapp",
        metadata: JSON.stringify({
          agentId,
          agentName,
          mode,
          escalated,
          escalationReason,
          replyPreview: reply.slice(0, 500),
        }),
        conversationId,
      },
    })
  } catch (err) {
    console.error("[Orchestrator] Erro ao registrar log:", err)
  }
}

// ── Sub-agente de follow-up: agenda mensagem automática ──────────────────────

async function scheduleFollowUpIfNeeded(
  leadId: string,
  conversationId: string,
  agentName: string,
  delayHours: number,
  message: string
): Promise<void> {
  try {
    const sendAt = new Date(Date.now() + delayHours * 60 * 60 * 1000)
    await prisma.followUp.create({
      data: {
        leadId,
        conversationId,
        sendAt,
        message,
        status: "scheduled",
      },
    })
    console.log(`[Orchestrator] Follow-up agendado pelo agente "${agentName}" em ${delayHours}h: "${message.slice(0, 80)}…"`)
  } catch (err) {
    console.error("[Orchestrator] Erro ao agendar follow-up:", err)
  }
}

// ── Busca sentimento mais recente da conversa ─────────────────────────────────

async function getLastSentimentScore(conversationId: string): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ sentiment_score: number | null }>>`
      SELECT sentiment_score FROM ai_analyses
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (!rows.length || rows[0].sentiment_score === null || rows[0].sentiment_score === undefined) {
      return null
    }
    return Number(rows[0].sentiment_score)
  } catch {
    return null
  }
}

// ── Escalada: muda status da conversa e notifica ──────────────────────────────

async function escalateConversation(
  conversationId: string,
  reason: string,
  agentName: string,
  leadId: string
): Promise<void> {
  try {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "waiting" },
    })
    console.log(`[Orchestrator] Conversa ${conversationId} escalada para humano. Motivo: ${reason}`)

    // Notifica atendente responsável pela conversa
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { assignedToId: true },
    })
    if (conv?.assignedToId) {
      await (prisma.notification as any).create({
        data: {
          userId: conv.assignedToId,
          type: "escalada_agente",
          title: "Conversa escalada pelo agente",
          message: `O agente "${agentName}" escalou para atendimento humano. Motivo: ${reason}`,
          data: JSON.stringify({ conversationId, agentName, reason }),
        },
      })
    }

    // Registra histórico de escalada na tabela interactions
    await prisma.interaction.create({
      data: {
        leadId,
        type: "escalada",
        content: `Agente "${agentName}" escalou para humano. Motivo: ${reason}`,
        channel: "whatsapp",
        conversationId,
        metadata: JSON.stringify({ agentName, reason, escalatedAt: new Date().toISOString() }),
      },
    })
  } catch (err) {
    console.error("[Orchestrator] Erro ao escalar conversa:", err)
  }
}

// ── Função pública principal ──────────────────────────────────────────────────

export async function processMessageWithAgent(
  connectionId: string,
  conversationId: string,
  leadId: string,
  messageContent: string,
  sendFn?: (connectionId: string, jid: string, text: string) => Promise<void>,
  jid?: string,
  incomingWasAudio?: boolean,
  sendAudioFn?: (connectionId: string, jid: string, buffer: Buffer, mimeType: string, conversationId?: string) => Promise<void>,
  // Chave da mensagem recebida (para marcar como lida)
  incomingKey?: { id: string; remoteJid: string; fromMe: boolean },
  // Funções de sessão passadas diretamente do listener (evita re-import e problemas de timing)
  sessionFns?: {
    sendPresenceUpdate: (presence: string, jid: string) => Promise<void>
    readMessages: (keys: Array<{ id: string; remoteJid: string; fromMe: boolean }>) => Promise<void>
  },
  // Tipo de mídia original — usado para formatar o contexto para o LLM
  incomingMediaType?: "audio" | "image" | "document" | null
): Promise<OrchestratorResult> {
  const noOp: OrchestratorResult = {
    handled: false,
    agentId: null,
    reply: null,
    escalated: false,
    escalationReason: null,
    mode: "none",
    sentAutomatically: false,
  }

  try {
    // 1. Verifica se há agente ativo para esta conexão
    const agent = await findActiveAgent(connectionId)
    if (!agent) return noOp

    // 2. Verifica se a conversa já tem atendente humano ativo (não processa nesses casos)
    const convRows = await prisma.$queryRaw<any[]>`SELECT assigned_to_id, status, agent_paused_until FROM conversations WHERE id = ${conversationId}`
    const conversation = convRows[0] ?? null

    if (!conversation) return noOp
    if (conversation.status === "closed" || conversation.status === "resolved") return noOp

    // Autostop: verifica se o agente está pausado para esta conversa
    if (conversation.agent_paused_until) {
      const pausedUntil = new Date(conversation.agent_paused_until)
      if (pausedUntil > new Date()) {
        console.log(`[Orchestrator] Agente pausado (Autostop) para conversa ${conversationId} até ${pausedUntil.toISOString()}`)
        return noOp
      }
      // Pausa expirou — limpa o campo
      await prisma.$executeRawUnsafe(
        `UPDATE conversations SET agent_paused_until = NULL, updated_at = datetime('now') WHERE id = ?`,
        conversationId
      )
    }

    // 3. Busca contexto
    const [lead, history, ragContext] = await Promise.all([
      getLeadContext(leadId),
      getConversationHistory(conversationId, 20),
      searchKnowledge(agent.id, messageContent),
    ])

    if (!lead) return noOp

    // 3.5. Se calendário habilitado, busca horários ocupados (próximos 7 dias) e
    //      verifica se já existe evento desta conversa criado por este agente
    const agentCalendarEnabled = Boolean((agent as any).calendar_enabled ?? (agent as any).calendarEnabled)
    let busySlots: { start: string; end: string }[] = []
    let hasAgentEvent = false

    if (agentCalendarEnabled) {
      try {
        const agentRow = await prisma.$queryRaw<{ created_by_id: string }[]>`
          SELECT created_by_id FROM agents WHERE id = ${agent.id}
        `
        const ownerId = agentRow[0]?.created_by_id
        if (ownerId) {
          const timeMin = new Date().toISOString()
          const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          const [slots, existingEvent] = await Promise.all([
            getBusySlotsForRange(ownerId, timeMin, timeMax),
            getEventByConversationAndAgent(conversationId, agent.id),
          ])
          busySlots = slots
          hasAgentEvent = !!existingEvent
        }
      } catch (err) {
        console.warn("[Orchestrator] Falha ao buscar disponibilidade do calendário:", err)
      }
    }

    // 4. Monta prompt e chama o LLM
    // Formata o conteúdo com prefixo contextual quando vem de mídia
    const mediaPrefix: Record<string, string> = {
      audio: "🎤 [Mensagem de voz transcrita]:\n",
      image: "🖼️ [Imagem recebida — descrição]:\n",
      document: "📄 [Documento recebido — conteúdo extraído]:\n",
    }
    const formattedContent = incomingMediaType && mediaPrefix[incomingMediaType]
      ? `${mediaPrefix[incomingMediaType]}${messageContent}`
      : messageContent

    const systemPrompt = buildSystemPrompt(agent, lead, ragContext, busySlots, hasAgentEvent)
    const messages = buildMessages(systemPrompt, history, formattedContent)

    console.log(`[Orchestrator] Agente "${agent.name}" (${agent.mode}) processando mensagem de ${lead.name}`)

    const rawResponse = await aiChat(messages, agent.temperature ?? 0.3)
    const { reply: parsedReply, escalate, escalationReason, scheduleFollowUp, calendarEvent, cancelEvent, rescheduleEvent, useVoice: agentDecidedVoice } = parseAgentResponse(rawResponse)
    let reply = parsedReply

    if (!reply) {
      console.warn("[Orchestrator] Agente retornou resposta vazia")
      return noOp
    }

    // 5. Verifica threshold do agente vs sentimento atual da conversa
    let shouldEscalate = escalate
    let finalEscalationReason = escalationReason
    if (!escalate && agent.escalateThreshold) {
      const lastSentiment = await getLastSentimentScore(conversationId)
      if (lastSentiment !== null && lastSentiment <= agent.escalateThreshold) {
        shouldEscalate = true
        finalEscalationReason = finalEscalationReason || `Sentimento muito negativo (score: ${lastSentiment})`
      }
    }

    // 6. Registra log
    await logAgentDecision(
      leadId,
      conversationId,
      agent.id,
      agent.name,
      reply,
      shouldEscalate,
      finalEscalationReason,
      agent.mode
    )

    // 7. Escalada
    if (shouldEscalate) {
      await escalateConversation(conversationId, finalEscalationReason || "Solicitado pelo agente", agent.name, leadId)
      return {
        handled: true,
        agentId: agent.id,
        reply,
        escalated: true,
        escalationReason: finalEscalationReason,
        mode: agent.mode,
        sentAutomatically: false,
      }
    }

    // 8. Operações de calendário ANTES de enviar a resposta
    if (agentCalendarEnabled && (calendarEvent || cancelEvent || rescheduleEvent)) {
      try {
        const agentRow = await prisma.$queryRaw<{
          created_by_id: string
          calendar_add_meet_link: number | null
        }[]>`
          SELECT created_by_id, calendar_add_meet_link FROM agents WHERE id = ${agent.id}
        `
        const agentData = agentRow[0]

        if (agentData?.created_by_id) {
          const ownerId = agentData.created_by_id
          const integration = await getCalendarIntegration(ownerId)

          if (integration?.is_active) {
            // 8a. Cancelar evento que este agente criou nesta conversa
            if (cancelEvent) {
              const existing = await getEventByConversationAndAgent(conversationId, agent.id)
              if (existing?.google_event_id) {
                await deleteCalendarEvent(ownerId, existing.google_event_id)
                await cancelEventReminders(existing.google_event_id).catch(() => {})
                console.log(`[Orchestrator] 🗑 Evento cancelado pelo agente: "${existing.title}"`)
                reply = reply + `\n\n✅ Reunião *${existing.title}* cancelada com sucesso.`
              } else {
                console.warn("[Orchestrator] cancelEvent=true mas nenhum evento deste agente encontrado na conversa")
              }
            }

            // 8b. Remarcar evento que este agente criou nesta conversa
            if (rescheduleEvent) {
              const existing = await getEventByConversationAndAgent(conversationId, agent.id)
              if (existing?.google_event_id) {
                // Verifica disponibilidade do novo horário
                const busyCheck = await getBusySlotsForRange(ownerId, rescheduleEvent.newStartTime, rescheduleEvent.newEndTime)
                const conflict = busyCheck.some(
                  (b) => new Date(b.start) < new Date(rescheduleEvent.newEndTime) && new Date(b.end) > new Date(rescheduleEvent.newStartTime)
                )
                if (conflict) {
                  reply = reply + `\n\n⚠️ O novo horário solicitado está ocupado na agenda. Por favor, escolha outro horário.`
                } else {
                  const updated = await updateCalendarEvent(ownerId, existing.google_event_id, {
                    startTime: rescheduleEvent.newStartTime,
                    endTime: rescheduleEvent.newEndTime,
                  })
                  console.log(`[Orchestrator] 🔄 Evento remarcado: "${updated.title}" para ${updated.startTime}`)
                  const newStartFmt = new Date(updated.startTime).toLocaleString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
                  })
                  reply = reply + `\n\n🔄 *Reunião remarcada!*\n📌 ${updated.title}\n🗓 ${newStartFmt}`
                  if (updated.meetLink) reply += `\n📹 *Link do Google Meet:* ${updated.meetLink}`
                }
              } else {
                console.warn("[Orchestrator] rescheduleEvent definido mas nenhum evento deste agente encontrado na conversa")
              }
            }

            // 8c. Criar novo evento — verifica disponibilidade antes
            if (calendarEvent) {
              const busyCheck = await getBusySlotsForRange(ownerId, calendarEvent.startTime, calendarEvent.endTime)
              const conflict = busyCheck.some(
                (b) => new Date(b.start) < new Date(calendarEvent.endTime) && new Date(b.end) > new Date(calendarEvent.startTime)
              )

              if (conflict) {
                console.warn(`[Orchestrator] ⚠ Horário ${calendarEvent.startTime} ocupado — evento não criado`)
                reply = reply + `\n\n⚠️ O horário solicitado já está ocupado na agenda. Por favor, confirme outro horário disponível.`
              } else {
                const addMeetLink = calendarEvent.addMeetLink ?? (agentData.calendar_add_meet_link !== null ? Boolean(agentData.calendar_add_meet_link) : true)
                const created = await createCalendarEvent(
                  ownerId,
                  { ...calendarEvent, addMeetLink, attendeeEmail: lead.email ?? undefined, attendeeName: lead.name },
                  { leadId, conversationId, createdBy: "agent", agentId: agent.id }
                )
                console.log(`[Orchestrator] 📅 Evento criado: "${created.title}" em ${created.startTime}`)

                const startFormatted = new Date(created.startTime).toLocaleString("pt-BR", {
                  weekday: "long", day: "2-digit", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
                })
                let eventInfo = `\n\n📅 *Reunião agendada!*\n📌 ${created.title}\n🗓 ${startFormatted}`
                if (created.meetLink) eventInfo += `\n📹 *Link do Google Meet:* ${created.meetLink}`
                if (created.htmlLink) eventInfo += `\n🔗 *Evento no Calendar:* ${created.htmlLink}`
                reply = reply + eventInfo

                // Agenda lembretes automáticos de confirmação
                await scheduleEventReminders({
                  calendarEventId: created.googleEventId,
                  googleEventId: created.googleEventId,
                  leadId,
                  conversationId,
                  agentId: agent.id,
                  connectionId,
                  eventStartTime: created.startTime,
                  leadName: lead.name,
                  eventTitle: created.title,
                }).catch((err) => console.warn("[Orchestrator] Erro ao agendar lembretes:", err))
              }
            }
          }
        }
      } catch (err) {
        console.error("[Orchestrator] Erro na operação de calendário:", err)
      }
    }

    // 9. Envio automático (autonomous e hybrid)
    let sentAutomatically = false
    if ((agent.mode === "autonomous" || agent.mode === "hybrid") && jid) {
      try {
        // Resolve funções de sessão: prefere as passadas pelo listener (diretas),
        // caso contrário tenta obter via getSession como fallback
        let presenceUpdate: ((presence: string, jid: string) => Promise<void>) | null = null
        let readMessages: ((keys: any[]) => Promise<void>) | null = null

        if (sessionFns) {
          presenceUpdate = sessionFns.sendPresenceUpdate
          readMessages = sessionFns.readMessages
          console.log("[Orchestrator] Usando sessionFns do listener")
        } else {
          try {
            const { getSession } = await import("@/lib/baileys-session")
            const session = getSession(connectionId)
            if (session) {
              presenceUpdate = (p, j) => (session as any).sendPresenceUpdate(p, j)
              readMessages = (keys) => (session as any).readMessages(keys)
              console.log("[Orchestrator] Usando getSession() como fallback")
            } else {
              console.warn(`[Orchestrator] getSession(${connectionId}) retornou undefined — comportamento humano desabilitado`)
            }
          } catch (importErr) {
            console.warn("[Orchestrator] Falha ao importar baileys-session:", importErr)
          }
        }

        // Lê dados de comportamento via raw SQL para garantir campos novos
        // Prisma $queryRaw com SQLite pode retornar BigInt para inteiros — converte com Number()
        const agentRows = await prisma.$queryRaw<any[]>`SELECT typing_delay, typing_delay_max, mark_as_read, split_messages, voice_enabled, voice_mode, voice_id, voice_speed, voice_stability, voice_similarity FROM agents WHERE id = ${agent.id}`
        const agentBehavior = agentRows[0] ?? {}
        const boolVal = (v: unknown) => Number(v) !== 0
        const typingDelay    = boolVal(agentBehavior.typing_delay ?? 1)
        const typingDelayMax = Number(agentBehavior.typing_delay_max ?? 8)
        const markAsRead     = boolVal(agentBehavior.mark_as_read ?? 1)
        const splitMessages  = boolVal(agentBehavior.split_messages ?? 1)
        const voiceEnabled   = boolVal(agentBehavior.voice_enabled ?? 0)
        const voiceMode      = agentBehavior.voice_mode ?? "if_audio"
        const voiceId        = agentBehavior.voice_id ?? null
        const voiceSpeed     = Number(agentBehavior.voice_speed ?? 1.0)
        const voiceStability = Number(agentBehavior.voice_stability ?? 0.5)
        const voiceSimilarity = Number(agentBehavior.voice_similarity ?? 0.75)

        console.log(`[Orchestrator] Comportamento: typingDelay=${typingDelay} max=${typingDelayMax}s markAsRead=${markAsRead} split=${splitMessages} voice=${voiceEnabled}/${voiceMode} voiceId=${voiceId || 'null'}`)
        console.log(`[Orchestrator] sendAudioFn disponível=${!!sendAudioFn}, sendFn disponível=${!!sendFn}`)

        // 8a. Marca mensagem como lida ("visto azul")
        if (markAsRead && readMessages && incomingKey) {
          await readMessages([incomingKey]).catch((e: any) => console.warn("[Orchestrator] readMessages falhou:", e))
        }

        // 8b. Verifica se deve usar voz
        const useVoice = shouldUseVoice(
          voiceEnabled,
          voiceMode,
          incomingWasAudio ?? false,
          agentDecidedVoice
        )

        console.log(`[Orchestrator] useVoice=${useVoice}, agentDecidedVoice=${agentDecidedVoice}, incomingWasAudio=${incomingWasAudio}`)

        // Decisão de envio: voz ou texto
        console.log(`[Orchestrator] === DECISÃO DE ENVIO === useVoice=${useVoice}, voiceId=${voiceId || 'null'}, sendAudioFn=${!!sendAudioFn}`)
        
        if (useVoice && voiceId && sendAudioFn) {
          console.log("[Orchestrator] → Caminho: Voz (tentar ElevenLabs)")
          // Voz: verifica key ANTES de mostrar qualquer indicador
          const elevenLabsKey = await getElevenLabsKey()

          if (!elevenLabsKey) {
            console.warn("[Orchestrator] ⚠ ElevenLabs key não configurada — indo para texto")
            // Sem API key: vai direto para texto com comportamento normal
            console.warn("[Orchestrator] ElevenLabs key não configurada — enviando como texto")
            await sendAsText({
              reply,
              jid,
              connectionId,
              typingDelay,
              typingDelayMax,
              splitMessages,
              presenceUpdate,
              sendFn,
            })
            sentAutomatically = true
          } else {
            console.log("[Orchestrator] ✓ ElevenLabs key encontrada, iniciando síntese de voz...")
            // Com API key: tenta enviar voz
            try {
              // Só mostra "gravando..." depois de confirmar que a síntese é possível
              if (typingDelay && presenceUpdate) {
                await presenceUpdate("recording", jid).catch(() => {})
                const delayMs = Math.min(reply.length * 25, typingDelayMax * 1000)
                await new Promise((r) => setTimeout(r, delayMs))
              }

              const audioBuffer = await textToSpeech({ 
                voiceId, 
                text: reply, 
                apiKey: elevenLabsKey,
                speed: voiceSpeed,
                stability: voiceStability,
                similarityBoost: voiceSimilarity,
              })
              console.log(`[Orchestrator] ✓ Áudio gerado: ${audioBuffer.length} bytes`)

              // Antes de enviar o áudio, garante que saiu do "recording"
              if (presenceUpdate) {
                await presenceUpdate("paused", jid).catch(() => {})
              }

              console.log(`[Orchestrator] Enviando áudio via sendAudioFn para ${jid}...`)
              await sendAudioFn(connectionId, jid, audioBuffer, "audio/mpeg", conversationId)
              console.log(`[Orchestrator] ✓ sendAudioFn executado com sucesso`)
              sentAutomatically = true
              console.log(`[Orchestrator] ✓ Voz enviada para ${lead.name}`)
            } catch (voiceErr) {
              console.error("[Orchestrator] ✗ Erro na síntese ou envio de voz:", voiceErr)
              console.error("[Orchestrator] voiceErr.message:", (voiceErr as Error).message)

              // Garante que sai do estado "recording" antes de começar a digitar
              if (presenceUpdate) {
                await presenceUpdate("paused", jid).catch(() => {})
              }

              // Fallback para texto
              await sendAsText({
                reply,
                jid,
                connectionId,
                typingDelay,
                typingDelayMax,
                splitMessages,
                presenceUpdate,
                sendFn,
              })
              sentAutomatically = true
            }
          }
        } else if (sendFn) {
          console.log("[Orchestrator] → Caminho: Texto (voz desabilitada ou sem voiceId/sendAudioFn)")
          // Texto: divide em partes e envia com simulação de digitação
          await sendAsText({
            reply,
            jid,
            connectionId,
            typingDelay,
            typingDelayMax,
            splitMessages,
            presenceUpdate,
            sendFn,
          })
          sentAutomatically = true
          console.log(`[Orchestrator] ✓ Mensagem enviada como texto para ${lead.name}`)
        } else {
          console.error("[Orchestrator] ✗ Nenhuma função de envio disponível! sendFn=null, sendAudioFn=null")
        }
      } catch (sendErr) {
        console.error("[Orchestrator] Erro ao enviar resposta automática:", sendErr)
      }
    }

    // 9. Agenda follow-up se o agente solicitou
    if (scheduleFollowUp) {
      await scheduleFollowUpIfNeeded(
        leadId,
        conversationId,
        agent.name,
        scheduleFollowUp.delayHours,
        scheduleFollowUp.message
      )
    }

    return {
      handled: true,
      agentId: agent.id,
      reply,
      escalated: false,
      escalationReason: null,
      mode: agent.mode,
      sentAutomatically,
    }
  } catch (err) {
    console.error("[Orchestrator] Erro inesperado:", err)
    return noOp
  }
}
