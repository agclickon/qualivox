import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendMediaMessage } from "@/lib/baileys-sender"
import { webmOpusToOgg } from "@/lib/webm-to-ogg"

async function resolveConnectionForLead(leadId: string, requestedConnectionId?: string | null) {
  const requestedId = typeof requestedConnectionId === "string" && requestedConnectionId.length > 0 ? requestedConnectionId : undefined
  const conversation = await prisma.conversation.findFirst({
    where: requestedId ? { leadId, connectionId: requestedId } : { leadId },
    orderBy: { updatedAt: "desc" },
  })

  const activeConnectionId = requestedId || conversation?.connectionId
  const connection = activeConnectionId
    ? await prisma.whatsappConnection.findUnique({ where: { id: activeConnectionId } })
    : await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })

  if (!connection) return null

  const existingConversation = conversation && conversation.connectionId === connection.id
    ? conversation
    : await prisma.conversation.findFirst({ where: { leadId, connectionId: connection.id } })

  return { connection, conversation: existingConversation }
}

function formatJid(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length > 13 ? `${digits}@lid` : `${digits}@s.whatsapp.net`
}

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/", "application/", "text/"]
const MAX_FILE_SIZE = 64 * 1024 * 1024 // 64 MB

function detectMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return "document"
}

export const dynamic = "force-dynamic"

// POST /api/whatsapp/send/media
export async function POST(request: NextRequest) {
  console.log("\n========== [MEDIA ROUTE] POST recebido ==========")
  try {
    const formData = await request.formData()
    const leadId = formData.get("leadId") as string | null
    const incomingConnectionId = formData.get("connectionId") as string | null
    const caption = (formData.get("caption") as string | null) || ""
    const ptt = formData.get("ptt") === "true"
    const file = formData.get("file") as File | null
    console.log(`[MEDIA ROUTE] leadId=${leadId} ptt=${ptt} file=${file?.name} size=${file?.size}`)

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId é obrigatório" } },
        { status: 400 }
      )
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Arquivo é obrigatório" } },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Arquivo muito grande (máx 64 MB)" } },
        { status: 400 }
      )
    }

    const mimeType = file.type || "application/octet-stream"
    const isAllowed = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))
    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Tipo de arquivo não suportado" } },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    const phone = lead.whatsappNumber || lead.phone
    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Lead não possui número de telefone" } },
        { status: 400 }
      )
    }

    const resolved = await resolveConnectionForLead(leadId, incomingConnectionId)
    if (!resolved?.connection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_CONNECTED", message: "Nenhuma conexão WhatsApp configurada" } },
        { status: 400 }
      )
    }
    const connection = resolved.connection
    const existingConversation = resolved.conversation
    const jid = existingConversation?.whatsappChatId || formatJid(phone)

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    const mediaType = detectMediaType(mimeType)

    // WhatsApp PTT requires audio/ogg;codecs=opus — Chrome records audio/webm;codecs=opus.
    // Convert the container (WebM→OGG) without re-encoding; the Opus frames are identical.
    let finalMimeType = mimeType
    let finalPtt = ptt
    let waveform: Uint8Array | undefined
    let seconds: number | undefined
    if (ptt && mimeType.includes("webm")) {
      const converted = await webmOpusToOgg(buffer)
      const conversionWorked = converted.mimeType.includes("ogg")
      buffer = Buffer.from(converted.buffer)
      finalMimeType = converted.mimeType
      waveform = converted.waveform
      seconds = converted.seconds
      if (!conversionWorked) {
        console.warn("[MEDIA ROUTE] Conversão WebM→OGG falhou, enviando como áudio regular (não PTT)")
        finalPtt = false
      }
      console.log(`[MEDIA ROUTE] ptt=${ptt} finalPtt=${finalPtt} finalMimeType=${finalMimeType} bufferSize=${buffer.length} seconds=${seconds}`)
    }
    const fileName = file.name || `file.${mimeType.split("/")[1] || "bin"}`

    const result = await sendMediaMessage({
      connectionId: connection.id,
      jid,
      buffer,
      mimeType: finalMimeType,
      fileName,
      mediaType,
      caption: caption || undefined,
      ptt: finalPtt,
      waveform,
      seconds,
      conversationId: existingConversation?.id,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "SEND_ERROR", message: result.error || "Erro ao enviar mídia" } },
        { status: 500 }
      )
    }

    await prisma.lead.update({ where: { id: leadId }, data: { lastInteraction: new Date() } })

    return NextResponse.json({ success: true, data: { messageId: result.messageId } })
  } catch (error) {
    console.error("[WhatsApp Send Media]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erro interno" } },
      { status: 500 }
    )
  }
}
