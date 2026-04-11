import { getSession } from "@/lib/baileys-session"
import crypto from "crypto"
import path from "path"
import { prisma } from "@/lib/prisma"
import { saveMedia, getMediaRoot } from "@/lib/media-storage"

export type SendMediaOptions = {
  connectionId: string
  jid: string
  buffer: Buffer
  mimeType: string
  fileName: string
  /** "image" | "video" | "audio" | "document" | "sticker" */
  mediaType: string
  caption?: string
  /** true = PTT voice note */
  ptt?: boolean
  /** 64-value waveform for PTT display */
  waveform?: Uint8Array
  /** audio duration in seconds */
  seconds?: number
  conversationId?: string
}

export async function sendMediaMessage(opts: SendMediaOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { connectionId, jid, buffer, mimeType, fileName, mediaType, caption, ptt, waveform, seconds, conversationId: providedConversationId } = opts
  console.log(`[sendMediaMessage] START — type=${mediaType} ptt=${ptt} mime=${mimeType} size=${buffer.byteLength} jid=${jid}`)
  const session = getSession(connectionId)
  if (!session) {
    console.error("[sendMediaMessage] Sessão não encontrada para connectionId:", connectionId)
    return { success: false, error: "Session not connected" }
  }

  try {
    // Verificar se a sessão está ativa (user é definido quando logado)
    if (!session.user) {
      console.error("[sendMediaMessage] Sessão sem usuário — WhatsApp não está logado")
      return { success: false, error: "WhatsApp não está logado" }
    }

    // Resolve conversation first — need conversationId to save the file
    let conversationId: string | null = providedConversationId ?? null
    if (!conversationId) {
      // LID format: 213391826243778@lid — need to find by lead's whatsapp_number
      // Standard format: 554896565857@s.whatsapp.net
      let phoneNumber = jid.replace("@s.whatsapp.net", "").replace("@lid", "")
      
      // If jid ends with @lid, we need to find the lead differently
      if (jid.endsWith("@lid")) {
        // Search by the mapped phone number if available, or try to find lead by other means
        // For LID, we need to search in leads where whatsapp_number might be stored
        const lead = await prisma.lead.findFirst({
          where: { 
            OR: [
              { whatsappNumber: { contains: phoneNumber } },
              { phone: { contains: phoneNumber } },
            ]
          },
        })
        if (lead) {
          let conversation = await prisma.conversation.findFirst({ 
            where: { leadId: lead.id, connectionId },
            orderBy: { createdAt: 'desc' }
          })
          if (!conversation) {
            conversation = await prisma.conversation.create({ 
              data: { leadId: lead.id, whatsappChatId: jid, connectionId } 
            })
          }
          conversationId = conversation.id
        }
      } else {
        // Standard phone number format
        const lead = await prisma.lead.findFirst({
          where: { 
            OR: [
              { whatsappNumber: { contains: phoneNumber } },
              { phone: { contains: phoneNumber } },
            ]
          },
        })
        if (lead) {
          let conversation = await prisma.conversation.findFirst({ 
            where: { leadId: lead.id, connectionId },
            orderBy: { createdAt: 'desc' }
          })
          if (!conversation) {
            conversation = await prisma.conversation.create({ 
              data: { leadId: lead.id, whatsappChatId: jid, connectionId } 
            })
          }
          conversationId = conversation.id
        }
      }
    }

    if (!conversationId) {
      console.warn(`[sendMediaMessage] Conversa não encontrada para jid=${jid}`)
      return { success: false, error: "Conversa não encontrada" }
    }

    // Save buffer to disk BEFORE sending — Baileys reads the file directly via
    // createReadStream(path), which is more reliable than passing a raw Buffer.
    // Derive extension from mimeType for audio so OGG conversion is reflected on disk.
    const ext = mediaType === "audio"
      ? (mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm")
      : (fileName.split(".").pop() || mimeType.split("/")[1] || "bin")
    const relativePath = saveMedia({ conversationId, extension: ext, buffer, prefix: mediaType })
    const absolutePath = path.join(getMediaRoot(), relativePath)
    console.log(`[sendMediaMessage] Arquivo salvo em ${absolutePath} (${buffer.byteLength} bytes)`)

    // Build Baileys message content using file path (not Buffer)
    // Baileys getStream: { url: path } → createReadStream(path)
    const mediaSource = { url: absolutePath }
    let content: Record<string, unknown>
    if (mediaType === "image" || mediaType === "sticker") {
      content = mediaType === "sticker"
        ? { sticker: mediaSource, mimetype: mimeType }
        : { image: mediaSource, mimetype: mimeType, caption: caption || undefined }
    } else if (mediaType === "video") {
      content = { video: mediaSource, mimetype: mimeType, caption: caption || undefined }
    } else if (mediaType === "audio") {
      content = {
        audio: mediaSource,
        mimetype: mimeType,
        ptt: Boolean(ptt),
        ...(waveform ? { waveform } : {}),
        ...(seconds ? { seconds } : {}),
      }
    } else {
      content = { document: mediaSource, mimetype: mimeType, fileName }
    }

    console.log(`[sendMediaMessage] session.user=${session.user.id} — enviando via file path`)
    const sentMsg = await session.sendMessage(jid, content as Parameters<typeof session.sendMessage>[1])

    // Log the full message to diagnose missing CDN URL
    const msgContent = sentMsg?.message
    const mediaMsg = msgContent?.audioMessage ?? msgContent?.imageMessage ?? msgContent?.videoMessage ?? msgContent?.documentMessage ?? null
    console.log(`[sendMediaMessage] sentMsg.key=`, JSON.stringify(sentMsg?.key ?? null))
    console.log(`[sendMediaMessage] mediaMsg.url=`, (mediaMsg as any)?.url ?? "N/A")
    console.log(`[sendMediaMessage] mediaMsg.directPath=`, (mediaMsg as any)?.directPath ?? "N/A")

    if (!sentMsg?.key?.id) {
      console.error("[sendMediaMessage] FALHA: Baileys retornou sentMsg sem key")
      return { success: false, error: "Baileys não confirmou o envio da mensagem" }
    }

    const msgId = sentMsg.key.id
    const timestamp = sentMsg?.messageTimestamp ? new Date(Number(sentMsg.messageTimestamp) * 1000) : new Date()
    const waveformB64 = waveform && waveform.length > 0 ? Buffer.from(waveform).toString("base64") : undefined
    const metadata = JSON.stringify({
      mimeType, fileName, fileSize: buffer.byteLength, ptt: ptt || false,
      seconds,
      ...(waveformB64 ? { waveform: waveformB64 } : {}),
    })

    const newId = crypto.randomUUID()
    await prisma.$executeRawUnsafe(
      `INSERT INTO messages (id, conversation_id, connection_id, direction, content, message_type, media_url, metadata, external_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(external_id) DO UPDATE SET
         media_url = excluded.media_url,
         metadata = excluded.metadata,
         message_type = excluded.message_type,
         content = excluded.content`,
      newId, conversationId, connectionId, "outgoing", caption || "", mediaType,
      relativePath, metadata, msgId, true, timestamp.toISOString()
    )
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: timestamp } })
    console.log(`[sendMediaMessage] Concluído — msgId=${msgId} conversationId=${conversationId}`)
    return { success: true, messageId: msgId }
  } catch (err) {
    console.error("[sendMediaMessage] ERRO:", err)
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

type QuotedInfo = { id: string; fromMe: boolean; content: string; messageType: string; remoteJid: string }

export async function sendTextMessage(
  connectionId: string,
  jid: string,
  text: string,
  quoted?: QuotedInfo
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  console.log(`[Baileys Sender] Attempting to send to ${jid} via connection ${connectionId}`)
  const session = getSession(connectionId)
  if (!session) {
    console.error(`[Baileys Sender] No session found for connection ${connectionId}`)
    return { success: false, error: "Session not connected" }
  }
  console.log(`[Baileys Sender] Session found, sending message...`)

  try {
    console.log(`[Baileys Sender] Calling session.sendMessage to ${jid}...`)

    // Build quoted message context so WhatsApp shows the reply bubble
    const quotedMsg = quoted?.id ? {
      key: { remoteJid: quoted.remoteJid || jid, fromMe: quoted.fromMe, id: quoted.id },
      message: { conversation: quoted.content },
    } : undefined

    const sentMsg = await session.sendMessage(jid, { text }, { quoted: quotedMsg } as any)
    console.log(`[Baileys Sender] sendMessage returned:`, JSON.stringify(sentMsg?.key || null))
    const msgId = sentMsg?.key?.id || crypto.randomUUID()
    const timestamp = sentMsg?.messageTimestamp
      ? new Date(Number(sentMsg.messageTimestamp) * 1000)
      : new Date()
    console.log(`[Baileys Sender] Message sent successfully, msgId: ${msgId}`)

    // Find conversation for this jid
    const phoneNumber = jid.replace("@s.whatsapp.net", "").replace("@lid", "")

    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { whatsappNumber: { contains: phoneNumber } },
          { phone: { contains: phoneNumber } },
        ],
      },
    })

    if (lead) {
      let conversation = await prisma.conversation.findFirst({
        where: { leadId: lead.id, connectionId },
      })

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            leadId: lead.id,
            whatsappChatId: jid,
            connectionId,
          },
        })
      }

      // Save outgoing message (INSERT OR IGNORE in case listener already saved it)
      const newId = crypto.randomUUID()
      const metadata = quoted ? JSON.stringify({
        quotedContent: quoted.content,
        quotedMessageType: quoted.messageType,
        quotedMsgId: quoted.id,
      }) : null
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO messages (id, conversation_id, connection_id, direction, content, message_type, metadata, external_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId,
        conversation.id,
        connectionId,
        "outgoing",
        text,
        "text",
        metadata,
        msgId,
        true,
        timestamp.toISOString()
      )

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      })
    }

    return { success: true, messageId: msgId }
  } catch (err) {
    console.error("[Baileys] Error sending message:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}
