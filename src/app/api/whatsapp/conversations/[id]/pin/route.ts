import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"

export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conv = await prisma.conversation.findUnique({ where: { id: params.id } })
    if (!conv) return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })

    const newValue = !conv.isPinned
    await prisma.conversation.update({ where: { id: params.id }, data: { isPinned: newValue } })

    if (conv.whatsappChatId && conv.connectionId) {
      const session = getSession(conv.connectionId)
      if (session) {
        try {
          await session.chatModify({ pin: newValue }, conv.whatsappChatId)
        } catch (e) { console.warn("[pin] Baileys chatModify failed:", e) }
      }
    }

    return NextResponse.json({ success: true, isPinned: newValue })
  } catch (e) {
    console.error("[pin route]", e)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
