import {
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
} from "@whiskeysockets/baileys"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { Session } from "@/lib/baileys-session"

// SSE emitter helper (re-export from session for convenience)
type SSECallback = (event: string, data: unknown) => void
const messageSubscribers: Set<SSECallback> = new Set()

export function onNewMessage(cb: SSECallback) {
  messageSubscribers.add(cb)
  return () => { messageSubscribers.delete(cb) }
}

function emitNewMessage(data: unknown) {
  for (const cb of messageSubscribers) {
    try { cb("new_message", data) } catch { /* ignore */ }
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

async function findOrCreateLead(phoneNumber: string, pushName?: string | null) {
  let lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { whatsappNumber: { contains: phoneNumber } },
        { phone: { contains: phoneNumber } },
      ],
    },
  })

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        name: pushName || `WhatsApp ${phoneNumber}`,
        whatsappNumber: phoneNumber,
        phone: phoneNumber,
        source: "whatsapp",
        pipelineStageId: await getDefaultStageId(),
      },
    })
    console.log(`[Baileys] New lead: ${lead.name} (${phoneNumber})`)
  } else if (pushName && lead.name.startsWith("WhatsApp ")) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: { name: pushName },
    })
  }

  return lead
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

// Tenta obter o número real (PN) a partir de um LID usando o mapeamento do Baileys
async function resolveRealPhoneNumber(wbot: any, jid: string): Promise<string | null> {
  // Se já é um PN (@s.whatsapp.net), extrair o número diretamente
  if (jid.endsWith("@s.whatsapp.net")) {
    return jid.replace("@s.whatsapp.net", "")
  }

  // Se é um LID, tentar obter o PN do mapeamento
  if (jid.endsWith("@lid") && wbot?.signalRepository?.lidMapping) {
    try {
      const pn = await wbot.signalRepository.lidMapping.getPNForLID(jid)
      if (pn) {
        console.log(`[Baileys] LID ${jid} -> PN ${pn}`)
        return pn.replace("@s.whatsapp.net", "")
      }
    } catch (err) {
      console.warn(`[Baileys] Erro ao resolver LID para PN:`, err)
    }
  }

  // Fallback: retornar o número do LID (não é o número real, mas é o que temos)
  return jidToPhone(jid)
}

async function upsertConversationFromChat(chat: any, connectionId: string) {
  const remoteJid = normalizeJid(chat?.id)
  if (!remoteJid) return

  const phoneNumber = jidToPhone(remoteJid)
  const lead = await findOrCreateLead(phoneNumber, chat?.name || chat?.pushName)

  const timestamp = chat?.conversationTimestamp
    ? new Date(Number(chat.conversationTimestamp) * 1000)
    : new Date()
  const unreadCount = typeof chat?.unreadCount === "number" ? chat.unreadCount : 0

  await prisma.conversation.upsert({
    where: { whatsappChatId: remoteJid },
    update: {
      leadId: lead.id,
      connectionId,
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

  if (!body) return

  try {
    // Buscar ou criar lead primeiro (para poder buscar foto de perfil)
    const lead = await findOrCreateLead(phoneNumber, pushName)

    // Buscar foto de perfil em background (não bloqueia) - ANTES do check de duplicação
    if (wbot && !fromMe) {
      fetchAndSaveProfilePic(wbot, remoteJid, lead.id, connectionId).catch(() => {})
    }

    // Check if message already exists (dedup)
    const existing = await prisma.$queryRawUnsafe<Array<{ external_id: string | null }>>(
      `SELECT external_id FROM messages WHERE external_id = ?`,
      msgId
    )
    if (existing.length > 0) return

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { leadId: lead.id, connectionId },
    })

    if (!conversation) {
      conversation = await prisma.conversation.findUnique({
        where: { whatsappChatId: remoteJid },
      })
      if (conversation) {
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: { connectionId, leadId: lead.id },
        })
      }
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          leadId: lead.id,
          whatsappChatId: remoteJid,
          connectionId,
        },
      })
    }

    // Insert message (INSERT OR IGNORE to handle duplicates gracefully)
    const newId = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO messages (id, conversation_id, connection_id, direction, content, message_type, external_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId,
      conversation.id,
      connectionId,
      fromMe ? "outgoing" : "incoming",
      body,
      "text",
      msgId,
      fromMe,
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

    // Emit to SSE subscribers com dados completos para atualização em tempo real
    emitNewMessage({
      id: newId,
      content: body,
      direction: fromMe ? "outgoing" : "incoming",
      createdAt: timestamp.toISOString(),
      conversationId: conversation.id,
      lead: { 
        id: lead.id, 
        name: lead.name, 
        phone: lead.phone,
        profilePicUrl: lead.profilePicUrl 
      },
    })
  } catch (err) {
    console.error(`[Baileys] Error handling message from ${phoneNumber}:`, err)
  }
}

// Handle message ack updates
async function handleMsgAck(msg: WAMessageUpdate): Promise<void> {
  try {
    if (!msg.key.id) return
    // We could update read status here if needed
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
        await upsertConversationFromChat(chat, connectionId)
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
