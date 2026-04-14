import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { getSession } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

// POST /api/whatsapp/messages/[id]/forward
// Body: { targetLeadId } — forward to another lead's conversation
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const { targetLeadId } = await req.json() as { targetLeadId?: string }
    if (!targetLeadId) return NextResponse.json({ success: false, error: "targetLeadId obrigatório" }, { status: 400 })

    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: { conversation: { include: { connection: true } } },
    })
    if (!message) return NextResponse.json({ success: false, error: "Mensagem não encontrada" }, { status: 404 })
    if (!message.externalId) return NextResponse.json({ success: false, error: "Mensagem sem externalId" }, { status: 400 })

    const targetLead = await prisma.lead.findUnique({ where: { id: targetLeadId } })
    if (!targetLead) return NextResponse.json({ success: false, error: "Lead destino não encontrado" }, { status: 404 })

    const connectionId = (message.connectionId ?? message.conversation.connectionId) as string
    const session = getSession(connectionId)
    if (!session) return NextResponse.json({ success: false, error: "Sessão WhatsApp não conectada" }, { status: 503 })

    // Find target conversation to get the correct JID
    const targetConv = await prisma.conversation.findFirst({ where: { leadId: targetLeadId, connectionId } })
    const phone = targetLead.whatsappNumber || targetLead.phone
    if (!phone && !targetConv) return NextResponse.json({ success: false, error: "Lead sem número de telefone" }, { status: 400 })
    const digits = (phone || "").replace(/\D/g, "")
    const targetJid = targetConv?.whatsappChatId || (digits.length > 13 ? `${digits}@lid` : `${digits}@s.whatsapp.net`)

    // Baileys forward: fetch the WAMessage from the original chat
    // We build a minimal WAMessage for forwarding text/media
    const srcJid = message.conversation.whatsappChatId
    await session.sendMessage(targetJid, {
      forward: {
        key: {
          remoteJid: srcJid,
          fromMe: message.direction === "outgoing",
          id: message.externalId,
        },
        message: message.messageType === "text"
          ? { conversation: message.content }
          : { conversation: message.content || "" },
      } as any,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[forward route]", e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Erro interno" }, { status: 500 })
  }
}
