import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { getSession } from "@/lib/baileys-session"
import { deleteMedia } from "@/lib/media-storage"

export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await getPrismaFromRequest(_req)
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { messages: { select: { mediaUrl: true } } },
    })
    if (!conv) return NextResponse.json({ success: false, error: "Não encontrada" }, { status: 404 })

    // Delete media files from Supabase Storage
    for (const msg of conv.messages) {
      if (msg.mediaUrl) {
        try {
          await deleteMedia(msg.mediaUrl)
        } catch { /* ignore */ }
      }
    }

    // Try Baileys delete
    if (conv.whatsappChatId && conv.connectionId) {
      const session = getSession(conv.connectionId)
      if (session) {
        try {
          await session.chatModify({ delete: true, lastMessages: [] }, conv.whatsappChatId)
        } catch (e) { console.warn("[conv delete] Baileys chatModify failed:", e) }
      }
    }

    await prisma.conversation.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[conv delete route]", e)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
