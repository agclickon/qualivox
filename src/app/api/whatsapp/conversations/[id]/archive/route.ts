import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: params.id } })
    if (!conv) return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })

    const newValue = !conv.isArchived
    await prisma.conversation.update({ where: { id: params.id }, data: { isArchived: newValue } })

    if (conv.whatsappChatId && conv.connectionId) {
      const session = getSession(conv.connectionId)
      if (session) {
        try {
          await session.chatModify({ archive: newValue, lastMessages: [] }, conv.whatsappChatId)
        } catch (e) { console.warn("[archive] Baileys chatModify failed:", e) }
      }
    }

    return NextResponse.json({ success: true, isArchived: newValue })
  } catch (e) {
    console.error("[archive route]", e)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
