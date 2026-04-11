import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

// POST /api/whatsapp/react
// Body: { messageId, emoji } — messageId is our internal DB id, emoji="" removes reaction
export async function POST(request: NextRequest) {
  try {
    const { messageId, emoji } = await request.json() as { messageId?: string; emoji?: string }
    if (!messageId) return NextResponse.json({ success: false, error: "messageId obrigatório" }, { status: 400 })

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    })
    if (!message) return NextResponse.json({ success: false, error: "Mensagem não encontrada" }, { status: 404 })
    if (!message.externalId) return NextResponse.json({ success: false, error: "Mensagem sem externalId" }, { status: 400 })

    const jid = message.conversation.whatsappChatId as string
    const connectionId = (message.connectionId ?? message.conversation.connectionId) as string
    const session = getSession(connectionId)
    if (!session) return NextResponse.json({ success: false, error: "Sessão WhatsApp não conectada" }, { status: 503 })

    await session.sendMessage(jid, {
      react: {
        text: emoji ?? "",
        key: {
          remoteJid: jid,
          fromMe: message.direction === "outgoing",
          id: message.externalId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[react route]", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Erro interno" }, { status: 500 })
  }
}
