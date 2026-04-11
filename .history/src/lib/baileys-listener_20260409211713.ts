import {
  proto,
  WAMessage,
  WAMessageStatus,
  WAMessageStubType,
  WAMessageUpdate,
} from "@whiskeysockets/baileys"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { Session, getSession } from "@/lib/baileys-session"
import { processIncomingMedia } from "@/lib/whatsapp-media"
import { resolveMediaPath } from "@/lib/media-storage"
import { analyzeSentiment } from "@/lib/sentiment-analyzer"
import fs from "fs"

// SSE emitter helper (re-export from session for convenience)
type SSECallback = (event: string, data: unknown) => void
const messageSubscribers: Set<SSECallback> = new Set()
const messageStatusSubscribers: Set<SSECallback> = new Set()
const conversationUpdateSubscribers: Set<SSECallback> = new Set()

export function onNewMessage(cb: SSECallback) {
  messageSubscribers.add(cb)
  return () => { messageSubscribers.delete(cb) }
}

export function onMessageStatus(cb: SSECallback) {
  messageStatusSubscribers.add(cb)
  return () => { messageStatusSubscribers.delete(cb) }
}

export function onConversationUpdate(cb: SSECallback) {
  conversationUpdateSubscribers.add(cb)
  return () => { conversationUpdateSubscribers.delete(cb) }
}

export function emitNewMessage(data: unknown) {
  for (const cb of messageSubscribers) {
    try { cb("new_message", data) } catch { /* ignore */ }
  }
}

function emitMessageStatus(data: unknown) {
  for (const cb of messageStatusSubscribers) {
    try { cb("message_status", data) } catch { /* ignore */ }
  }
}

export function emitConversationUpdate(data: unknown) {
  for (const cb of conversationUpdateSubscribers) {
    try { cb("conversation_update", data) } catch { /* ignore */ }
  }
}

// No module-level guard needed — we tag the socket object directly

let cachedDefaultStageId: string | null | undefined

async function getDefaultStageId(): Promise<string | null> {
  if (cachedDefaultStageId !== undefined) {
    return cachedDefaultStageId
  }
  const defaultStage = await prisma.pipelineStage.findFirst({
    where: { isDefault: true },
    orderBy: { order: "asc" },
  })
  cachedDefaultStageId = defaultStage?.id ?? null
  return cachedDefaultStageId
}

// TTL cache: { ts, success } — 6h se foto encontrada, 10min se falhou (retry automático)
const PROFILE_PIC_TTL_SUCCESS = 6 * 60 * 60 * 1000
const PROFILE_PIC_TTL_FAIL    = 10 * 60 * 1000
const profilePicCacheMap = new Map<string, { ts: number; success: boolean }>()

function profilePicCacheHit(leadId: string): boolean {
  const entry = profilePicCacheMap.get(leadId)
  if (!entry) return false
  const ttl = entry.success ? PROFILE_PIC_TTL_SUCCESS : PROFILE_PIC_TTL_FAIL
  if (Date.now() - entry.ts > ttl) {
    profilePicCacheMap.delete(leadId)
    return false
  }
  return true
}

// Exportar função para limpar cache (útil para forçar nova busca)
export function clearProfilePicCache() {
  profilePicCacheMap.clear()
  console.log("[Baileys] Profile pic cache cleared")
}

// Normaliza JID para o formato @s.whatsapp.net que profilePictureUrl exige
// JIDs @lid (Live ID) não funcionam — convertemos para o formato padrão
function toProfilePicJid(jid: string): string {
  if (jid.endsWith("@s.whatsapp.net")) return jid
  const number = jid.replace(/@.*$/, "")
  return `${number}@s.whatsapp.net`
}

// ── Sistema de Debounce para agrupar mensagens em sequência ──────────────────
// Quando um lead envia várias mensagens seguidas, aguardamos um tempo antes
// de processar, juntando tudo em uma única resposta do agente (comportamento humano)

interface MessageBuffer {
  content: string
  messages: { key: { id: string; remoteJid: string; fromMe: boolean }; timestamp: number }[]
  mediaType: ("audio" | "image" | "document" | null)
  timer: NodeJS.Timeout | null
}

const messageBuffers = new Map<string, MessageBuffer>()
const DEBOUNCE_DELAY_MS = 6000 // Aguarda 6 segundos após última mensagem

function getMessageBufferKey(connectionId: string, conversationId: string): string {
  return `${connectionId}:${conversationId}`
}

function flushMessageBuffer(key: string): void {
  const buffer = messageBuffers.get(key)
  if (!buffer) return

  // Limpa o buffer
  messageBuffers.delete(key)

  // Extrai dados necessários do buffer
  const { content, messages, mediaType } = buffer
  if (!content.trim()) return

  // Extrai connectionId e conversationId da key
  const [connectionId, conversationId] = key.split(":")

  // Busca a última mensagem para obter dados de contexto
  const lastMsg = messages[messages.length - 1]

  // Processa a mensagem acumulada (chamada assíncrona em background)
  processAccumulatedMessage(
    connectionId,
    conversationId,
    content,
    messages,
    mediaType,
    lastMsg.key.remoteJid,
    lastMsg.key.id
  ).catch((err) => console.error("[Debounce] Erro ao processar mensagem acumulada:", err))
}

async function processAccumulatedMessage(
  connectionId: string,
  conversationId: string,
  accumulatedContent: string,
  messages: { key: { id: string; remoteJid: string; fromMe: boolean }; timestamp: number }[],
  mediaType: ("audio" | "image" | "document" | null),
  remoteJid: string,
  lastMessageId: string
): Promise<void> {
  // Busca dados do lead e conversa
  const convRows = await prisma.$queryRaw<{ lead_id: string; assigned_to_id: string | null; status: string }[]>`
    SELECT lead_id, assigned_to_id, status FROM conversations WHERE id = ${conversationId}
  `
  const conversation = convRows[0]
  if (!conversation) return

  // Verifica se deve processar (não processa se tem atendente humano ou está fechada)
  if (conversation.status === "closed" || conversation.status === "resolved") return
  if (conversation.assigned_to_id) return // Já tem atendente humano

  // Busca ou cria lead
  const leadId = conversation.lead_id

  // Verifica se há agente ativo para esta conexão
  const { processMessageWithAgent } = await import("@/lib/agent-orchestrator")

  // Obtém a sessão para funções de presença
  const wbot = await getSession(connectionId)
  const sessionFns = wbot ? {
    sendPresenceUpdate: (presence: string, jid: string) =>
      (wbot as any).sendPresenceUpdate(presence, jid),
    readMessages: (keys: any[]) =>
      (wbot as any).readMessages(keys),
  } : undefined

  // Verifica se alguma mensagem era áudio
  const hasAudio = messages.some((_, idx) => {
    // Simplificação: usamos a flag mediaType passada
    return mediaType === "audio"
  })

  // Processa com o agente
  await processMessageWithAgent(
    connectionId,
    conversationId,
    leadId,
    accumulatedContent,
    async (connId, jid, text) => {
      const { sendTextMessage } = await import("@/lib/baileys-sender")
      await sendTextMessage(connId, jid, text)
    },
    remoteJid,
    hasAudio,
    async (connId, jid, buffer, mimeType, convId) => {
      const { sendMediaMessage } = await import("@/lib/baileys-sender")
      await sendMediaMessage({
        connectionId: connId,
        jid,
        buffer,
        mimeType,
        mediaType: "audio",
        fileName: "voice.mp3",
        ptt: true,
        conversationId: convId || conversationId
      })
    },
    { id: lastMessageId, remoteJid, fromMe: false },
    sessionFns,
    mediaType
  )

  // Marca todas as mensagens como lidas
  if (sessionFns && messages.length > 0) {
    const keys = messages.map(m => ({
      id: m.key.id,
      remoteJid: m.key.remoteJid,
      fromMe: false
    }))
    await sessionFns.readMessages(keys).catch(() => {})
  }
}

function accumulateMessage(
  connectionId: string,
  conversationId: string,
  content: string,
  messageKey: { id: string; remoteJid: string; fromMe: boolean },
  mediaType: ("audio" | "image" | "document" | null) = null
): void {
  const key = getMessageBufferKey(connectionId, conversationId)
  const existing = messageBuffers.get(key)

  if (existing) {
    // Já existe buffer ativo — acumula mensagem
    existing.content += (existing.content ? "\n\n" : "") + content
    existing.messages.push({ key: messageKey, timestamp: Date.now() })
    if (mediaType && !existing.mediaType) {
      existing.mediaType = mediaType
    }

    // Reseta o timer
    if (existing.timer) clearTimeout(existing.timer)
    existing.timer = setTimeout(() => flushMessageBuffer(key), DEBOUNCE_DELAY_MS)
  } else {
    // Cria novo buffer
    const buffer: MessageBuffer = {
      content,
      messages: [{ key: messageKey, timestamp: Date.now() }],
      mediaType,
      timer: setTimeout(() => flushMessageBuffer(key), DEBOUNCE_DELAY_MS)
    }
    messageBuffers.set(key, buffer)
  }

  console.log(`[Debounce] Mensagem acumulada para ${key} (${messageBuffers.get(key)?.messages.length} msgs, aguardando ${DEBOUNCE_DELAY_MS}ms)`)
}

// Busca URL da foto tentando: JID original → @s.whatsapp.net (fallback)
// preview é mais confiável que image para contatos não salvos na agenda
async function callProfilePictureUrl(wbot: any, jid: string): Promise<string | null> {
  const jidsToTry = [jid]
  const asPhone = toProfilePicJid(jid)
  if (asPhone !== jid) jidsToTry.push(asPhone)

  for (const j of jidsToTry) {
    for (const type of ["preview", "image"] as const) {
      try {
        const url = await Promise.race<string | null>([
          wbot.profilePictureUrl(j, type),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ])
        if (url) {
          console.log(`[Baileys] ✓ foto encontrada (${type}) para ${j}`)
          return url
        }
      } catch (err: any) {
        const reason = err?.output?.payload?.error || err?.message || String(err)
        console.warn(`[Baileys] profilePictureUrl(${type}) falhou para ${j}: ${reason}`)
      }
    }
  }
  return null
}

async function findOrCreateLead(phoneNumber: string, pushName?: string | null, connectionId?: string | null) {
  let lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { whatsappNumber: { contains: phoneNumber } },
        { phone: { contains: phoneNumber } },
      ],
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any

  if (!lead) {
    lead = await db.lead.create({
      data: {
        name: pushName || `WhatsApp ${phoneNumber}`,
        whatsappNumber: phoneNumber,
        phone: phoneNumber,
        source: "whatsapp",
        pipelineStageId: await getDefaultStageId(),
        ...(connectionId ? { firstConnectionId: connectionId } : {}),
      },
    })
    console.log(`[Baileys] New lead: ${lead!.name} (${phoneNumber}) via connectionId=${connectionId}`)
  } else {
    const updates: Record<string, unknown> = {}
    if (pushName && lead.name.startsWith("WhatsApp ")) updates.name = pushName
    if (connectionId && !(lead as any).firstConnectionId) updates.firstConnectionId = connectionId
    if (Object.keys(updates).length > 0) {
      lead = await db.lead.update({ where: { id: lead.id }, data: updates })
    }
  }

  return lead!
}

// Buscar e salvar foto de perfil em background (não bloqueia)
async function fetchAndSaveProfilePic(
  wbot: any,
  jid: string,
  leadId: string,
  _connectionId?: string
): Promise<void> {
  // Respeitar TTL cache — evita chamadas repetidas enquanto não expirar
  if (profilePicCacheHit(leadId)) return
  // Marca como "em progresso" com sucesso=false (TTL curto); sobrescreve se encontrar
  profilePicCacheMap.set(leadId, { ts: Date.now(), success: false })

  try {
    let url: string | null = null

    // Chamar a API do WhatsApp (tenta JID original + @s.whatsapp.net como fallback)
    if (wbot?.profilePictureUrl) {
      url = await callProfilePictureUrl(wbot, jid)
    }

    if (url) {
      profilePicCacheMap.set(leadId, { ts: Date.now(), success: true }) // TTL de sucesso (6h)
      await prisma.lead.update({
        where: { id: leadId },
        data: { profilePicUrl: url },
      })
      console.log(`[Baileys] ✓ Profile pic salva para lead ${leadId}`)
    }
  } catch (err) {
    console.warn(`[Baileys] fetchAndSaveProfilePic erro para ${jid}:`, err)
  }
}

// Sincroniza fotos de perfil de todos os leads sem foto, em batch com delay
// Chamada após connection === 'open' para cobrir leads históricos
export async function syncProfilePicsOnConnection(wbot: any, connectionId: string): Promise<void> {
  // Aguarda o WA estabilizar antes de iniciar batch
  await new Promise((r) => setTimeout(r, 8000))

  // Busca leads sem foto, incluindo o JID original da conversa (whatsappChatId)
  // O whatsappChatId preserva o formato @lid ou @s.whatsapp.net original
  const conversations = await prisma.conversation.findMany({
    where: {
      lead: { profilePicUrl: null },
      whatsappChatId: { not: null },
    },
    select: {
      whatsappChatId: true,
      lead: { select: { id: true } },
    },
    distinct: ["leadId"],
    take: 200,
  })

  if (conversations.length === 0) {
    console.log("[Baileys] syncProfilePics: nenhum lead sem foto encontrado")
    return
  }

  console.log(`[Baileys] syncProfilePics: iniciando para ${conversations.length} leads`)

  for (const conv of conversations) {
    const jid = conv.whatsappChatId!
    await fetchAndSaveProfilePic(wbot, jid, conv.lead.id, connectionId)
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log("[Baileys] syncProfilePics: concluído")
}

function normalizeJid(jid?: string | null) {
  if (!jid) return null
  if (jid === "status@broadcast") return null
  if (jid.endsWith("@g.us")) return null
  // Keep the original format (@lid or @s.whatsapp.net) as WhatsApp needs it
  return jid
}

// Atualizar foto de perfil do lead a partir do JID
async function updateLeadProfilePic(jid: string, imgUrl: string): Promise<void> {
  if (!jid || !imgUrl) return
  
  const phoneNumber = jidToPhone(jid)
  if (!phoneNumber) return

  try {
    // Buscar lead pelo número ou JID
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { whatsappNumber: phoneNumber },
          { whatsappNumber: { contains: phoneNumber } },
          { phone: { contains: phoneNumber } },
        ],
      },
    })

    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { profilePicUrl: imgUrl },
      })
      console.log(`[Baileys] ✓ Profile pic updated for ${lead.name} from contact event`)
    }
  } catch (err) {
    console.error(`[Baileys] Error updating profile pic for ${jid}:`, err)
  }
}

function jidToPhone(remoteJid: string): string {
  return remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "")
}

// Remove sufixo de dispositivo (:0, :1, etc) do JID
function stripDeviceSuffix(jid: string): string {
  return jid.replace(/:\d+(@|$)/, "$1")
}

// Tenta obter o número real (PN) a partir de um LID usando o mapeamento do Baileys
async function resolveRealPhoneNumber(wbot: any, jid: string): Promise<string | null> {
  // Se já é um PN (@s.whatsapp.net), extrair o número diretamente
  if (jid.endsWith("@s.whatsapp.net")) {
    return stripDeviceSuffix(jid).replace("@s.whatsapp.net", "")
  }

  // Se é um LID, tentar obter o PN do mapeamento
  if (jid.endsWith("@lid") && wbot?.signalRepository?.lidMapping) {
    try {
      const pn = await wbot.signalRepository.lidMapping.getPNForLID(jid)
      if (pn) {
        const cleanPn = stripDeviceSuffix(pn).replace("@s.whatsapp.net", "")
        console.log(`[Baileys] LID ${jid} -> PN ${cleanPn}`)
        return cleanPn
      }
    } catch (err) {
      console.warn(`[Baileys] Erro ao resolver LID para PN:`, err)
    }
  }

  // Fallback: retornar o número do LID (não é o número real, mas é o que temos)
  return stripDeviceSuffix(jidToPhone(jid))
}

async function upsertConversationFromChat(chat: any, connectionId: string, wbot?: any) {
  const remoteJid = normalizeJid(chat?.id)
  if (!remoteJid) return

  // Tentar obter o número real (PN) a partir do LID
  const phoneNumber = wbot
    ? await resolveRealPhoneNumber(wbot, remoteJid) || jidToPhone(remoteJid)
    : jidToPhone(remoteJid)
  const lead = await findOrCreateLead(phoneNumber, chat?.name || chat?.pushName, connectionId)

  const timestamp = chat?.conversationTimestamp
    ? new Date(Number(chat.conversationTimestamp) * 1000)
    : new Date()
  const unreadCount = typeof chat?.unreadCount === "number" ? chat.unreadCount : 0

  // Use composite unique (whatsappChatId + connectionId) — each connection has its own conversation
  // Cast needed until prisma generate runs with updated schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.conversation.upsert as any)({
    where: { whatsappChatId_connectionId: { whatsappChatId: remoteJid, connectionId } },
    update: {
      leadId: lead.id,
      lastMessageAt: timestamp,
      unreadCount,
    },
    create: {
      leadId: lead.id,
      whatsappChatId: remoteJid,
      connectionId,
      lastMessageAt: timestamp,
      unreadCount,
    },
  })
}


// Filter system/protocol messages
function filterMessages(msg: WAMessage): boolean {
  if (msg.message?.protocolMessage) return false
  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT,
    ].includes(msg.messageStubType as typeof WAMessageStubType[keyof typeof WAMessageStubType])
  ) {
    return false
  }
  return true
}

// Extrai conteúdo rico da mídia para o agente IA e para exibição na UI.
// Retorna { agentText, enrichmentKey, enrichmentValue } ou null se não aplicável.
async function extractMediaForAgent(
  mediaUrl: string,
  messageType: string,
  metadata: Record<string, unknown>
): Promise<{ agentText: string; key: string; value: string } | null> {
  try {
    const filePath = resolveMediaPath(mediaUrl)
    if (!fs.existsSync(filePath)) return null
    const buffer = fs.readFileSync(filePath)

    if (messageType === "audio") {
      const fileName = mediaUrl.split("/").pop() || "audio.ogg"
      const { transcribeAudio } = await import("@/lib/transcription")
      const transcript = await transcribeAudio(buffer, fileName)
      if (transcript) {
        console.log(`[MediaEnrich] Transcrição: "${transcript.slice(0, 80)}"`)
        return { agentText: transcript, key: "transcript", value: transcript }
      }
    } else if (messageType === "image") {
      const mimeType = (metadata.mimeType as string) || "image/jpeg"
      const { describeImage } = await import("@/lib/vision")
      const description = await describeImage(buffer, mimeType)
      if (description) {
        console.log(`[MediaEnrich] Imagem descrita: "${description.slice(0, 80)}"`)
        return { agentText: description, key: "imageDescription", value: description }
      }
    } else if (messageType === "document") {
      const mimeType = (metadata.mimeType as string) || ""
      const fileName = (metadata.fileName as string) || mediaUrl
      const ext = fileName.split(".").pop()?.toLowerCase() || mimeType.split("/").pop()?.toLowerCase() || ""

      let fileType: string | null = null
      if (mimeType.includes("pdf") || ext === "pdf") fileType = "pdf"
      else if (mimeType.includes("text/plain") || ext === "txt") fileType = "txt"
      else if (ext === "md" || ext === "markdown") fileType = "md"
      else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword") || ext === "docx") fileType = "docx"

      if (fileType) {
        const { extractText } = await import("@/lib/text-extractor")
        const text = await extractText(buffer, fileType)
        if (text?.trim()) {
          const preview = text.slice(0, 80)
          console.log(`[MediaEnrich] Documento extraído (${fileType}): "${preview}"`)
          // Limita a 4000 chars para não estourar o contexto do LLM
          const truncated = text.length > 4000 ? text.slice(0, 4000) + "\n[...conteúdo truncado]" : text
          return { agentText: truncated, key: "extractedText", value: truncated }
        }
      }
    }
  } catch (err) {
    console.error(`[MediaEnrich] Erro ao extrair ${messageType}:`, err)
  }
  return null
}

// Análise de sentimento em tempo real e persistência
async function sendSupervisorAlert(
  conversationId: string,
  connectionId: string,
  leadName: string,
  score: number,
  urgency: number,
  flags: string[],
  texts: string[]
): Promise<void> {
  try {
    // Busca agentes ativos com supervisor configurado
    const allAgents = await prisma.$queryRaw<{ supervisor_phone: string | null; name: string; connection_ids: string }[]>`
      SELECT name, supervisor_phone, connection_ids FROM agents
      WHERE is_active = 1 AND supervisor_phone IS NOT NULL AND supervisor_phone != ''
    `
    const matchingAgent = allAgents.find((a) => {
      try { return (JSON.parse(a.connection_ids || "[]") as string[]).includes(connectionId) } catch { return false }
    })
    if (!matchingAgent?.supervisor_phone) return

    const supervisorPhone = matchingAgent.supervisor_phone.replace(/\D/g, "")
    const supervisorJid = `${supervisorPhone}@s.whatsapp.net`

    const session = getSession(connectionId)
    if (!session) return

    // Resumo das últimas mensagens (apenas incoming)
    const summary = texts.filter((t) => t.startsWith(leadName)).slice(-3).join("\n")
    const flagsStr = flags.length ? ` Sinais detectados: ${flags.join(", ")}.` : ""

    const alertMsg = `⚠️ *Alerta de Sentimento Negativo*\n\nLead: *${leadName}*\nScore: ${score} | Urgência: ${urgency}%${flagsStr}\n\n*Últimas mensagens:*\n${summary}\n\n_Este alerta foi gerado automaticamente pelo agente ${matchingAgent.name}._`

    await session.sendMessage(supervisorJid, { text: alertMsg })
    console.log(`[Sentiment] Alerta enviado ao supervisor ${supervisorPhone} para lead ${leadName}`)
  } catch (err) {
    console.error("[Sentiment] Erro ao enviar alerta ao supervisor:", err)
  }
}

// Análise de sentimento em tempo real e persistência
async function analyzeSentimentAndPersist(
  conversationId: string,
  leadId: string,
  _messageContent: string,
  leadName: string,
  _sseId: string,
  connectionId: string
): Promise<void> {
  // Busca as últimas 10 mensagens da conversa (ambas direções para contexto bilateral)
  const recentMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true, metadata: true, messageType: true, direction: true },
  })

  const texts = recentMessages.reverse().map((m) => {
    const prefix = m.direction === "incoming" ? `${leadName}: ` : "Atendente: "
    // Para áudio: usa transcrição do metadata se disponível
    if (m.messageType === "audio" && m.metadata) {
      try {
        const meta = JSON.parse(m.metadata as string)
        if (meta.transcript) return prefix + (meta.transcript as string)
      } catch { /* ignora */ }
    }
    // Para imagem: usa descrição do metadata se disponível
    if (m.messageType === "image" && m.metadata) {
      try {
        const meta = JSON.parse(m.metadata as string)
        if (meta.imageDescription) return prefix + (meta.imageDescription as string)
      } catch { /* ignora */ }
    }
    return m.content ? prefix + m.content : ""
  }).filter(Boolean)
  if (!texts.length) return

  const result = await analyzeSentiment(texts, leadName)
  if (!result) return

  // Normaliza score de -100..100 para 0..100 para compatibilidade com sentimentScore existente
  // Mantém o valor original (pode ser negativo) — ai_analyses aceita qualquer número
  const { score, label, urgency, flags } = result

  const analysisId = crypto.randomUUID()
  const extractedData = JSON.stringify({
    label,
    urgency,
    flags,
    triggeredBy: "realtime",
    messageContent: texts[texts.length - 1]?.slice(0, 100) ?? "",
  })

  await prisma.$executeRawUnsafe(
    `INSERT INTO ai_analyses (id, conversation_id, lead_id, sentiment_score, extracted_data, created_at)
     VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%f000Z', 'now'))`,
    analysisId,
    conversationId,
    leadId,
    score,
    extractedData
  )

  // Persiste sentimento na tabela conversations (lazy migration)
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE conversations SET realtime_sentiment = ?, realtime_urgency = ?, updated_at = datetime('now') WHERE id = ?`,
      label,
      urgency,
      conversationId
    )
  } catch (e) {
    console.warn("[Sentiment] Erro ao salvar realtime_sentiment:", e)
  }

  // Emite atualização SSE com sentimento
  emitConversationUpdate({
    conversationId,
    sentiment: label,
    sentimentScore: score,
    urgency,
    flags,
  })

  // Emite alerta de frustração se urgência alta ou flag específica
  if (urgency >= 80 || flags.includes("frustrado")) {
    emitConversationUpdate({
      conversationId,
      alert: "frustration_detected",
      urgency,
    })
  }

  // Envia alerta WhatsApp ao supervisor quando sentimento negativo
  if (label === "negativo") {
    sendSupervisorAlert(conversationId, connectionId, leadName, score, urgency, flags, texts)
      .catch((err) => console.error("[Sentiment] Erro no alerta supervisor:", err))
  }
}

// Handle a single incoming message
async function handleMessage(
  msg: proto.IWebMessageInfo,
  connectionId: string,
  wbot?: any
): Promise<void> {
  if (!msg.key) return
  const fromMe = msg.key.fromMe || false
  console.log(`[Baileys] Raw message JID: ${msg.key.remoteJid}`)

  const remoteJid = normalizeJid(msg.key.remoteJid)
  if (!remoteJid) return

  // Tentar obter o número real (PN) a partir do LID, se disponível
  const phoneNumber = wbot 
    ? await resolveRealPhoneNumber(wbot, remoteJid) || jidToPhone(remoteJid)
    : jidToPhone(remoteJid)
  const pushName = msg.pushName || msg.verifiedBizName || null
  const msgId = msg.key.id!
  const timestamp = msg.messageTimestamp
    ? new Date(Number(msg.messageTimestamp) * 1000)
    : new Date()

  // Extract message body
  const body =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ""

  try {
    // Buscar ou criar lead primeiro (para poder buscar foto de perfil)
    const lead = await findOrCreateLead(phoneNumber, pushName, connectionId)

    // Buscar foto de perfil em background (não bloqueia) - ANTES do check de duplicação
    if (wbot && !fromMe) {
      fetchAndSaveProfilePic(wbot, remoteJid, lead.id, connectionId).catch(() => {})
    }

    // Check if message already exists (dedup)
    const existing = await prisma.$queryRawUnsafe<Array<{ external_id: string | null }>>(
      `SELECT external_id FROM messages WHERE external_id = ?`,
      msgId
    )
    if (existing.length > 0) {
      if (fromMe) {
        const persisted = await prisma.message.findFirst({
          where: { externalId: msgId },
          include: { conversation: { include: { lead: true } } },
        })
        if (persisted && persisted.conversation?.lead) {
          let parsedMeta: Record<string, unknown> | null = null
          if (persisted.metadata) {
            try { parsedMeta = typeof persisted.metadata === "string" ? JSON.parse(persisted.metadata) : (persisted.metadata as any) }
            catch { parsedMeta = null }
          }

          emitNewMessage({
            id: persisted.id,
            content: persisted.content || "",
            direction: "outgoing",
            createdAt: persisted.createdAt instanceof Date ? persisted.createdAt.toISOString() : new Date(persisted.createdAt).toISOString(),
            conversationId: persisted.conversationId,
            isRead: Boolean(persisted.isRead),
            messageType: persisted.messageType || "text",
            mediaUrl: persisted.mediaUrl,
            metadata: parsedMeta,
            lead: {
              id: persisted.conversation.lead.id,
              name: persisted.conversation.lead.name,
              phone: persisted.conversation.lead.phone,
              profilePicUrl: persisted.conversation.lead.profilePicUrl,
            },
          })
        }
      }
      return
    }

    // Find or create conversation scoped to this connection (composite unique)
    let conversation = await prisma.conversation.findFirst({
      where: { whatsappChatId: remoteJid, connectionId },
    })

    if (!conversation) {
      // Verificar atendente padrão da conexão para atribuição automática
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connRecord = connectionId ? await (prisma.whatsappConnection.findUnique as any)({
        where: { id: connectionId },
        select: { defaultAssignedToId: true },
      }) : null
      const defaultAssignedToId = connRecord?.defaultAssignedToId ?? null

      // Verificar limite de conversas simultâneas se houver atendente padrão
      let assignToId: string | null = defaultAssignedToId
      if (assignToId) {
        const limitSetting = await prisma.setting.findUnique({ where: { key: "maxConvSimultaneous" } })
        const maxLimit = limitSetting?.value ? parseInt(limitSetting.value) : null
        if (maxLimit) {
          const openCount = await prisma.conversation.count({
            where: { assignedToId: assignToId, status: "open" },
          })
          if (openCount >= maxLimit) assignToId = null // manda para fila de espera
        }
      }

      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          whatsappChatId: remoteJid,
          connectionId,
          assignedToId: assignToId,
          assignedAt: assignToId ? new Date() : null,
          status: assignToId ? "open" : "waiting",
          openedAt: new Date(),
        },
      })
    }

    let mediaResult: Awaited<ReturnType<typeof processIncomingMedia>> = null
    if (!fromMe) {
      mediaResult = await processIncomingMedia(msg, conversation.id).catch((err) => {
        console.error("[Baileys] Error processing media", err)
        return null
      })
    }

    const messageContent = body || mediaResult?.displayText || ""
    if (!messageContent && !mediaResult) {
      console.log("[Baileys] Ignoring message without content/media", msgId)
      return
    }

    // Extract quoted/reply context from contextInfo
    const msgContent = msg.message
    const contextInfo =
      msgContent?.extendedTextMessage?.contextInfo ||
      msgContent?.imageMessage?.contextInfo ||
      msgContent?.videoMessage?.contextInfo ||
      msgContent?.audioMessage?.contextInfo ||
      msgContent?.documentMessage?.contextInfo ||
      null
    const quotedMsg = contextInfo?.quotedMessage
    const quotedContent = quotedMsg
      ? (quotedMsg.conversation ||
         quotedMsg.extendedTextMessage?.text ||
         quotedMsg.imageMessage?.caption ||
         quotedMsg.videoMessage?.caption ||
         (quotedMsg.audioMessage ? "🎤 Áudio" :
          quotedMsg.imageMessage ? "🖼️ Imagem" :
          quotedMsg.documentMessage ? "📄 Documento" : ""))
      : null
    const quotedMessageType = quotedMsg
      ? (quotedMsg.audioMessage ? "audio"
        : quotedMsg.imageMessage ? "image"
        : quotedMsg.videoMessage ? "video"
        : quotedMsg.documentMessage ? "document"
        : "text")
      : null

    const quotedMsgId = contextInfo?.stanzaId ?? null

    const baseMetadata = mediaResult?.metadata ? { ...mediaResult.metadata } : {}
    const fullMetadata = quotedContent != null
      ? { ...baseMetadata, quotedContent, quotedMessageType, quotedMsgId }
      : Object.keys(baseMetadata).length > 0 ? baseMetadata : null

    // Insert message (INSERT OR IGNORE to handle duplicates gracefully)
    const newId = crypto.randomUUID()
    const isRead = !fromMe
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO messages (id, conversation_id, connection_id, direction, content, message_type, media_url, metadata, external_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId,
      conversation.id,
      connectionId,
      fromMe ? "outgoing" : "incoming",
      messageContent,
      mediaResult?.messageType || "text",
      mediaResult?.mediaUrl ?? null,
      fullMetadata ? JSON.stringify(fullMetadata) : null,
      msgId,
      isRead,
      timestamp.toISOString()
    )

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: timestamp },
    })

    console.log(
      `[Baileys] ${fromMe ? "→" : "←"} ${phoneNumber}: ${body.substring(0, 50)}...`
    )

    // For outgoing messages, INSERT OR IGNORE may have skipped (sendTextMessage already inserted).
    // Fetch the real DB row to get the correct id and metadata for the SSE event.
    let sseId: string = newId
    let sseMetadata: Record<string, unknown> | null = fullMetadata
    let sseMessageType: string = mediaResult?.messageType || "text"
    let sseMediaUrl: string | null = mediaResult?.mediaUrl ?? null
    if (fromMe) {
      const row = await prisma.message.findFirst({
        where: { externalId: msgId },
        select: { id: true, metadata: true, messageType: true, mediaUrl: true },
      })
      if (row) {
        sseId = row.id
        sseMessageType = row.messageType || "text"
        sseMediaUrl = row.mediaUrl ?? null
        try { sseMetadata = row.metadata ? JSON.parse(row.metadata as string) : null } catch { sseMetadata = null }
      }
    }

    // Emit to SSE subscribers com dados completos para atualização em tempo real
    emitNewMessage({
      id: sseId,
      content: messageContent,
      direction: fromMe ? "outgoing" : "incoming",
      createdAt: timestamp.toISOString(),
      conversationId: conversation.id,
      isRead,
      messageType: sseMessageType,
      mediaUrl: sseMediaUrl,
      metadata: sseMetadata,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        profilePicUrl: lead.profilePicUrl,
      },
    })

    // Disparar análise automática (fire-and-forget, sem bloquear)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    fetch(`${baseUrl}/api/ai/auto-classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id }),
    }).catch(() => { /* silencioso — não deve impactar o fluxo principal */ })

    // Análise de sentimento em tempo real (fire-and-forget)
    if (!fromMe) {
      analyzeSentimentAndPersist(conversation.id, lead.id, messageContent, lead.name, sseId, connectionId)
        .catch((err) => console.error("[Sentiment] Erro:", err))
    }

    // Processar mensagem com agente IA (apenas mensagens recebidas)
    const incomingWasAudio = mediaResult?.messageType === "audio"
    if (!fromMe) {
      // Extrai conteúdo rico da mídia ANTES de chamar o agente:
      // áudio → transcrição, imagem → descrição, documento → texto extraído
      let agentContent = messageContent || ""
      if (mediaResult?.mediaUrl && ["audio", "image", "document"].includes(mediaResult.messageType)) {
        const extracted = await extractMediaForAgent(
          mediaResult.mediaUrl,
          mediaResult.messageType,
          mediaResult.metadata
        )
        if (extracted) {
          agentContent = extracted.agentText
          // Persiste o resultado no banco e emite SSE para a UI
          try {
            const row = await prisma.message.findUnique({ where: { id: sseId }, select: { metadata: true } })
            if (row) {
              const current = row.metadata ? JSON.parse(row.metadata as string) : {}
              await prisma.message.update({
                where: { id: sseId },
                data: { metadata: JSON.stringify({ ...current, [extracted.key]: extracted.value }) },
              })
              emitNewMessage({ type: "metadata_update", messageId: sseId, enrichment: { [extracted.key]: extracted.value } })
            }
          } catch (err) { console.error("[MediaEnrich] Erro ao salvar metadata:", err) }
        } else {
          // Sem extração: usa fallback para que o agente saiba que recebeu mídia
          agentContent = messageContent || mediaResult.displayText || ""
        }
      }

      if (agentContent) {
        // Usa sistema de debounce: acumula mensagens e aguarda 6s antes de processar
        // Isso permite que mensagens em sequência sejam contextualizadas juntas (comportamento humano)
        const incomingMediaType = (
          mediaResult?.messageType === "audio" ||
          mediaResult?.messageType === "image" ||
          mediaResult?.messageType === "document"
        ) ? mediaResult.messageType as "audio" | "image" | "document" : null

        accumulateMessage(
          connectionId,
          conversation.id,
          agentContent,
          { id: msg.key.id!, remoteJid: remoteJid, fromMe: false },
          incomingMediaType
        )
      }
    }
  } catch (err) {
    console.error(`[Baileys] Error handling message from ${phoneNumber}:`, err)
  }
}

// Handle message ack updates
async function handleMsgAck(msg: WAMessageUpdate): Promise<void> {
  try {
    const messageId = msg.key?.id
    if (!messageId || !msg.key?.fromMe) return

    const updateStatus = (msg as { update?: { status?: number } }).update?.status
    const directStatus = (msg as { status?: number }).status
    const status = typeof updateStatus === "number"
      ? updateStatus
      : typeof directStatus === "number"
        ? directStatus
        : null

    if (status === null || status < WAMessageStatus.READ) return

    const message = await prisma.message.findFirst({
      where: { externalId: messageId },
      select: { id: true, isRead: true, conversationId: true },
    })

    if (!message || message.isRead) return

    await prisma.message.update({
      where: { id: message.id },
      data: { isRead: true },
    })

    emitMessageStatus({
      id: message.id,
      conversationId: message.conversationId,
      externalId: messageId,
      isRead: true,
      status: "read",
    })
  } catch (err) {
    console.error("[Baileys] Error handling msg ack:", err)
  }
}

// Module init timestamp - changes when code is reloaded
const MODULE_INIT_TIME = Date.now()

// Main listener - attach to a Baileys session
export function startMessageListener(
  wbot: Session,
  connectionId: string
): void {
  // Guard: prevent duplicate listener registration
  // But allow re-attach if module was reloaded (different init time)
  const socketInitTime = (wbot as any)._listenerInitTime
  if ((wbot as any)._hasListener && socketInitTime === MODULE_INIT_TIME) {
    console.log(`[Baileys] Listener already active on this socket for ${connectionId}, skipping`)
    // Mesmo com listener ativo, roda sync de fotos (pode ter leads novos sem foto)
    syncProfilePicsOnConnection(wbot, connectionId).catch((err: unknown) =>
      console.error("[Baileys] syncProfilePics error:", err)
    )
    return
  }
  
  if ((wbot as any)._hasListener && socketInitTime !== MODULE_INIT_TIME) {
    console.log(`[Baileys] Module reloaded, removing old listeners for ${connectionId}...`)
    // Remove old listeners to prevent memory leak
    const ev = wbot.ev as any
    if (typeof ev.removeAllListeners === 'function') {
      ev.removeAllListeners('chats.set')
      ev.removeAllListeners('chats.upsert')
      ev.removeAllListeners('chats.update')
      ev.removeAllListeners('messages.upsert')
      ev.removeAllListeners('messages.set')
      ev.removeAllListeners('messages.update')
    }
  }
  
  console.log(`[Baileys] Attaching message listener for connection ${connectionId}...`)

  const ev = wbot.ev as any

  const syncChats = async (chats: any[]) => {
    for (const chat of chats) {
      try {
        await upsertConversationFromChat(chat, connectionId, wbot)
      } catch (error) {
        console.error("[Baileys] Error syncing chat", chat?.id, error)
      }
    }
  }

  // --- Contact events (para capturar fotos de perfil) ---
  ev.on("contacts.set", async (payload: unknown) => {
    const contacts = (payload as { contacts?: any[] })?.contacts ?? []
    console.log(`[Baileys] Event: contacts.set (${contacts.length} contacts)`)
    for (const contact of contacts) {
      if (contact.imgUrl) {
        await updateLeadProfilePic(contact.id, contact.imgUrl)
      }
    }
  })

  ev.on("contacts.upsert", async (contacts: any[]) => {
    console.log(`[Baileys] Event: contacts.upsert (${contacts?.length || 0} contacts)`)
    for (const contact of contacts || []) {
      if (contact.imgUrl) {
        await updateLeadProfilePic(contact.id, contact.imgUrl)
      }
    }
  })

  ev.on("contacts.update", async (updates: any[]) => {
    console.log(`[Baileys] Event: contacts.update (${updates?.length || 0} updates)`)
    for (const update of updates || []) {
      if (update.imgUrl) {
        await updateLeadProfilePic(update.id, update.imgUrl)
      }
    }
  })

  // --- Chat events ---
  ev.on("chats.set", async (payload: unknown) => {
    console.log("[Baileys] Event: chats.set")
    const chats = (payload as { chats?: any[] })?.chats ?? []
    if (chats.length === 0) return
    await syncChats(chats)
  })

  ev.on("chats.upsert", async (chats: any[]) => {
    console.log(`[Baileys] Event: chats.upsert (${chats?.length || 0} chats)`)
    if (!chats || chats.length === 0) return
    await syncChats(chats)
  })

  ev.on("chats.update", async (updates: any[]) => {
    console.log(`[Baileys] Event: chats.update (${updates?.length || 0} updates)`)
    for (const update of updates) {
      const remoteJid = normalizeJid(update.id)
      if (!remoteJid) continue
      const data: Record<string, unknown> = {}
      if (update.conversationTimestamp) {
        data.lastMessageAt = new Date(Number(update.conversationTimestamp) * 1000)
      }
      if (typeof update.unreadCount === "number") {
        data.unreadCount = update.unreadCount
      }
      if (Object.keys(data).length === 0) continue
      try {
        await prisma.conversation.updateMany({
          where: { whatsappChatId: remoteJid },
          data,
        })
      } catch (error) {
        console.error("[Baileys] Error updating chat", remoteJid, error)
      }
    }
  })

  // --- Message events ---
  ev.on("messages.upsert", async (messageUpsert: any) => {
    const msgs = messageUpsert?.messages ?? []
    console.log(`[Baileys] Event: messages.upsert (${msgs.length} msgs, type: ${messageUpsert?.type})`)
    const messages = msgs.filter(filterMessages)
    if (!messages || messages.length === 0) return

    for (const message of messages) {
      await handleMessage(message, connectionId, wbot)
    }
  })

  ev.on("messages.set", async (payload: unknown) => {
    const messages = (payload as { messages?: WAMessage[] })?.messages ?? []
    console.log(`[Baileys] Event: messages.set (${messages.length} msgs)`)
    if (!messages || messages.length === 0) return
    for (const message of messages.filter(filterMessages)) {
      await handleMessage(message, connectionId, wbot)
    }
  })

  ev.on("messages.update", (messageUpdate: WAMessageUpdate[]) => {
    console.log(`[Baileys] Event: messages.update (${messageUpdate?.length || 0})`)
    if (!messageUpdate || messageUpdate.length === 0) return
    for (const update of messageUpdate) {
      handleMsgAck(update)
    }
  })

  // Mark this socket as having listeners attached with init time
  ;(wbot as any)._hasListener = true
  ;(wbot as any)._listenerInitTime = MODULE_INIT_TIME
  console.log(`[Baileys] ✓ All event listeners attached for ${connectionId}`)

  // Sync fotos de perfil de leads históricos em background (sem importação circular)
  syncProfilePicsOnConnection(wbot, connectionId).catch((err: unknown) =>
    console.error("[Baileys] syncProfilePics error:", err)
  )
}
