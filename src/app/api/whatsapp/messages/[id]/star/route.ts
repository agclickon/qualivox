import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: { conversation: true },
    })
    if (!message) return NextResponse.json({ success: false, error: "Mensagem não encontrada" }, { status: 404 })
    if (!message.externalId) return NextResponse.json({ success: false, error: "Mensagem sem externalId" }, { status: 400 })

    // Toggle star in metadata
    let meta: Record<string, unknown> = {}
    try { meta = message.metadata ? JSON.parse(message.metadata as string) : {} } catch { /* */ }
    const isStarred = !meta.isStarred
    meta.isStarred = isStarred
    await prisma.message.update({ where: { id: params.id }, data: { metadata: JSON.stringify(meta) } })

    // Sync to WhatsApp
    const jid = message.conversation.whatsappChatId
    const connectionId = (message.connectionId ?? message.conversation.connectionId) as string
    const session = getSession(connectionId)
    if (session && jid) {
      try {
        await session.chatModify({
          star: {
            messages: [{ id: message.externalId, fromMe: message.direction === "outgoing" }],
            star: isStarred,
          },
        }, jid)
      } catch (e) { console.warn("[star] Baileys chatModify failed:", e) }
    }

    return NextResponse.json({ success: true, isStarred })
  } catch (e) {
    console.error("[star route]", e)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
