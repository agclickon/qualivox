import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { sendTextMessage } from "@/lib/baileys-sender"

function formatJid(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  // LIDs are typically longer than 13 digits, use @lid suffix for them
  if (digits.length > 13) {
    return `${digits}@lid`
  }
  return `${digits}@s.whatsapp.net`
}

// POST /api/whatsapp/send - Enviar mensagem via WhatsApp (Baileys)
export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()
    const { leadId, message, templateId, quotedMsgId, quotedFromMe, quotedContent, quotedMsgType, connectionId } = body as {
      leadId?: string
      message?: string
      templateId?: string
      variables?: Record<string, string>
      quotedMsgId?: string
      quotedFromMe?: boolean
      quotedContent?: string
      quotedMsgType?: string
      connectionId?: string
    }
    const variablesPayload =
      typeof body.variables === "string" ? JSON.parse(body.variables) : body.variables

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "leadId é obrigatório" } },
        { status: 400 }
      )
    }

    if (!templateId && (!message || !message.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Informe uma mensagem manual ou selecione um template",
          },
        },
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

    let finalMessage = message?.trim() || ""

    if (templateId) {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, isActive: true },
      })

      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Template não encontrado" } },
          { status: 404 }
        )
      }

      const placeholders: string[] = (() => {
        try {
          return JSON.parse(template.variables || "[]")
        } catch {
          return []
        }
      })()

      const provided = (variablesPayload || {}) as Record<string, string>
      const missing = placeholders.filter((name) => !provided[name]?.trim())
      if (missing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Preencha todas as variáveis: ${missing.join(", ")}`,
            },
          },
          { status: 400 }
        )
      }

      finalMessage = placeholders.reduce((text, name) => {
        const value = provided[name] || ""
        const pattern = new RegExp(`{{\s*${name}\s*}}`, "g")
        return text.replace(pattern, value)
      }, template.content)
    }

    if (!finalMessage) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Mensagem vazia" } },
        { status: 400 }
      )
    }

    // Determine which connection should send the message
    const requestedConnectionId = typeof connectionId === "string" && connectionId.length > 0 ? connectionId : undefined

    // First try to reuse the conversation's connection so replies keep same number
    const conversation = await prisma.conversation.findFirst({
      where: requestedConnectionId
        ? { leadId, connectionId: requestedConnectionId }
        : { leadId },
      orderBy: { updatedAt: "desc" },
    })

    const activeConnectionId = requestedConnectionId || conversation?.connectionId

    const connection = activeConnectionId
      ? await prisma.whatsappConnection.findUnique({ where: { id: activeConnectionId } })
      : await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })

    if (!connection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_CONNECTED", message: "Nenhuma conexão WhatsApp configurada" } },
        { status: 400 }
      )
    }

    // Try to find existing conversation to get the correct JID format
    const existingConversation = conversation && conversation.connectionId === connection.id
      ? conversation
      : await prisma.conversation.findFirst({ where: { leadId, connectionId: connection.id } })

    // Use existing whatsappChatId if available, otherwise format the phone
    const jid = existingConversation?.whatsappChatId || formatJid(phone)
    console.log(`[WhatsApp Send] Using JID: ${jid} for lead ${leadId}`)

    const quoted = quotedMsgId ? {
      id: quotedMsgId,
      fromMe: quotedFromMe ?? false,
      content: quotedContent ?? "",
      messageType: quotedMsgType ?? "text",
      remoteJid: jid,
    } : undefined

    const result = await sendTextMessage(connection.id, jid, finalMessage, quoted)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "SEND_ERROR", message: result.error || "Erro ao enviar" } },
        { status: 500 }
      )
    }

    // Atualizar último contato do lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { lastInteraction: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: { messageId: result.messageId, templateId: templateId || null },
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erro ao enviar" } },
      { status: 500 }
    )
  }
}
