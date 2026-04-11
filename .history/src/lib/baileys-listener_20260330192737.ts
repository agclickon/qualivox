import {
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  jidNormalizedUser,
  getContentType,
} from "@whiskeysockets/baileys"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { Session, subscribeSSE } from "@/lib/baileys-session"

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

// Cache para evitar buscar foto de perfil repetidamente
const profilePicFetchedSet = new Set<string>()

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
  leadId: string
): Promise<void> {
  // Evitar buscar múltiplas vezes para o mesmo lead
  if (profilePicFetchedSet.has(leadId)) {
    console.log(`[Baileys] Profile pic already fetched for lead ${leadId}, skipping`)
    return
  }
  profilePicFetchedSet.add(leadId)

  console.log(`[Baileys] Fetching profile pic for lead ${leadId}, jid: ${jid}`)

  // Extrair número do JID e tentar ambos formatos (@lid e @s.whatsapp.net)
  const phoneNumber = jid.replace("@s.whatsapp.net", "").replace("@lid", "")
  const jidsToTry = [
    jid, // Formato original
    `${phoneNumber}@s.whatsapp.net`, // Formato padrão
  ]

  try {
    let url: string | null = null

    for (const tryJid of jidsToTry) {
      if (url) break
      console.log(`[Baileys] Trying profilePictureUrl with jid: ${tryJid}`)
      
      url = await Promise.race([
        wbot.profilePictureUrl(tryJid, "preview").catch((err: any) => {
          console.log(`[Baileys] profilePictureUrl error for ${tryJid}:`, err?.message || err)
          return null
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
    }

    console.log(`[Baileys] Profile pic URL result:`, url ? url.substring(0, 50) + '...' : 'NULL')

    if (url) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { profilePicUrl: url },
      })
      console.log(`[Baileys] ✓ Profile pic saved for lead ${leadId}`)
    } else {
      console.log(`[Baileys] No profile pic available for ${phoneNumber}`)
    }
  } catch (err: any) {
    console.error(`[Baileys] Error fetching profile pic for ${jid}:`, err?.message || err)
  }
}

function normalizeJid(jid?: string | null) {
  if (!jid) return null
  if (jid === "status@broadcast") return null
  if (jid.endsWith("@g.us")) return null
  // Keep the original format (@lid or @s.whatsapp.net) as WhatsApp needs it
  return jid
}

function jidToPhone(remoteJid: string): string {
  return remoteJid.replace("@s.whatsapp.net", "").replace("@lid", "")
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

// Get message body from Baileys message (like suia's getBodyMessage)
function getBodyMessage(msg: proto.IWebMessageInfo): string | null {
  try {
    const type = getContentType(msg.message!)
    if (!type) return null

    const types: Record<string, unknown> = {
      conversation: msg.message?.conversation,
      extendedTextMessage: msg.message?.extendedTextMessage?.text,
      imageMessage: msg.message?.imageMessage?.caption,
      videoMessage: msg.message?.videoMessage?.caption,
      documentMessage: msg.message?.documentMessage?.title,
      audioMessage: "Áudio",
      stickerMessage: "Sticker",
      contactMessage: msg.message?.contactMessage?.vcard,
      locationMessage: msg.message?.locationMessage
        ? `Lat: ${msg.message.locationMessage.degreesLatitude}, Lng: ${msg.message.locationMessage.degreesLongitude}`
        : null,
      listResponseMessage: msg.message?.listResponseMessage?.title,
      buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedButtonId,
    }

    return (types[type] as string) || null
  } catch {
    return null
  }
}

// Check if message is valid
function isValidMsg(msg: proto.IWebMessageInfo): boolean {
  if (msg.key.remoteJid === "status@broadcast") return false
  try {
    const msgType = getContentType(msg.message!)
    if (!msgType) return false

    const validTypes = [
      "conversation", "extendedTextMessage", "imageMessage", "videoMessage",
      "audioMessage", "documentMessage", "stickerMessage", "contactMessage",
      "locationMessage", "listResponseMessage", "buttonsResponseMessage",
      "reactionMessage", "contactsArrayMessage",
    ]
    return validTypes.includes(msgType)
  } catch {
    return false
  }
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
    ].includes(msg.messageStubType as WAMessageStubType)
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
  const fromMe = msg.key.fromMe || false
  console.log(`[Baileys] Raw message JID: ${msg.key.remoteJid}`)
  const remoteJid = normalizeJid(msg.key.remoteJid)
  if (!remoteJid) return
  
  const phoneNumber = jidToPhone(remoteJid)
  const pushName = msg.pushName || null
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
    // para garantir que buscamos a foto mesmo para mensagens já processadas
    console.log(`[Baileys] Check profile pic: wbot=${!!wbot}, fromMe=${fromMe}, hasProfilePic=${!!lead.profilePicUrl}`)
    if (wbot && !fromMe && !lead.profilePicUrl) {
      console.log(`[Baileys] Triggering profile pic fetch for ${lead.name}`)
      fetchAndSaveProfilePic(wbot, remoteJid, lead.id).catch((err) => {
        console.error(`[Baileys] fetchAndSaveProfilePic error:`, err)
      })
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
}
