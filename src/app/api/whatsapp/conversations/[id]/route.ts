import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/baileys-session"
import { getMediaRoot } from "@/lib/media-storage"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { messages: { select: { mediaUrl: true } } },
    })
    if (!conv) return NextResponse.json({ success: false, error: "Não encontrada" }, { status: 404 })

    // Delete media files from disk
    for (const msg of conv.messages) {
      if (msg.mediaUrl) {
        try {
          const filePath = path.join(getMediaRoot(), msg.mediaUrl)
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
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
