import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTextMessage } from "@/lib/baileys-sender"

function formatJid(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length > 13) {
    return `${digits}@lid`
  }
  return `${digits}@s.whatsapp.net`
}

export type SendMessageResult =
  | { success: true; data: { messageId: string; finalMessage: string } }
  | { success: false; error: string; status: number }

interface SendMessageOptions {
  leadId: string
  message?: string
  templateId?: string
  variables?: Record<string, string> | string
  quoted?: {
    id: string
    fromMe?: boolean
    content?: string
    messageType?: string
  }
  conversationId?: string | null
}

export async function sendMessageToLead(options: SendMessageOptions): Promise<SendMessageResult> {
  const { leadId, message, templateId, variables, quoted, conversationId } = options

  if (!leadId) {
    return { success: false, error: "leadId é obrigatório", status: 400 }
  }

  if (!templateId && (!message || !message.trim())) {
    return { success: false, error: "Informe uma mensagem ou selecione um template", status: 400 }
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) {
    return { success: false, error: "Lead não encontrado", status: 404 }
  }

  const phone = lead.whatsappNumber || lead.phone
  if (!phone) {
    return { success: false, error: "Lead não possui número de telefone", status: 400 }
  }

  let finalMessage = message?.trim() || ""

  if (templateId) {
    const template = await prisma.messageTemplate.findFirst({ where: { id: templateId, isActive: true } })
    if (!template) {
      return { success: false, error: "Template não encontrado", status: 404 }
    }

    let parsedVars: Record<string, string> = {}
    if (typeof variables === "string") {
      try {
        parsedVars = JSON.parse(variables)
      } catch {
        parsedVars = {}
      }
    } else if (variables) {
      parsedVars = variables
    }

    const placeholders: string[] = (() => {
      try {
        return JSON.parse(template.variables || "[]")
      } catch {
        return []
      }
    })()

    const missing = placeholders.filter((name) => !parsedVars[name]?.trim())
    if (missing.length > 0) {
      return { success: false, error: `Preencha todas as variáveis: ${missing.join(", ")}`, status: 400 }
    }

    finalMessage = placeholders.reduce((text, name) => {
      const value = parsedVars[name] || ""
      const pattern = new RegExp(`{{\\s*${name}\\s*}}`, "g")
      return text.replace(pattern, value)
    }, template.content)
  }

  if (!finalMessage) {
    return { success: false, error: "Mensagem vazia", status: 400 }
  }

  let targetConversation = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : null

  const defaultConnection = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
  if (!defaultConnection && !targetConversation?.connectionId) {
    return { success: false, error: "Nenhuma conexão WhatsApp configurada", status: 400 }
  }

  let connectionId = targetConversation?.connectionId || defaultConnection?.id
  let jid = targetConversation?.whatsappChatId || formatJid(phone)

  if (!targetConversation && connectionId) {
    targetConversation = await prisma.conversation.findFirst({ where: { leadId, connectionId } })
    if (targetConversation?.whatsappChatId) {
      jid = targetConversation.whatsappChatId
    }
  }

  if (!connectionId) {
    return { success: false, error: "Não foi possível determinar a conexão do WhatsApp", status: 400 }
  }

  const quotedInfo = quoted?.id
    ? {
        id: quoted.id,
        fromMe: quoted.fromMe ?? false,
        content: quoted.content ?? "",
        messageType: quoted.messageType ?? "text",
        remoteJid: jid,
      }
    : undefined

  const result = await sendTextMessage(connectionId, jid, finalMessage, quotedInfo)
  if (!result.success) {
    return { success: false, error: result.error || "Erro ao enviar mensagem", status: 500 }
  }

  await prisma.lead.update({ where: { id: leadId }, data: { lastInteraction: new Date() } })

  return { success: true, data: { messageId: result.messageId ?? "", finalMessage } }
}
