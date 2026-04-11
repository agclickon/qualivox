import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, initSession, registerSessionHook } from "@/lib/baileys-session"
import { startMessageListener } from "@/lib/baileys-listener"

export const dynamic = "force-dynamic"

async function ensureWhatsAppSession() {
  try {
    const connection = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
    if (!connection) return

    registerSessionHook(connection.id, (session) => {
      startMessageListener(session, connection.id)
    })

    if (!getSession(connection.id)) {
      await initSession(connection.id)
    }
  } catch (err) {
    console.error("[WhatsApp Conversations] ensureSession error:", err)
  }
}

// GET /api/whatsapp/conversations - Listar conversas com mensagens
export async function GET() {
  try {
    await ensureWhatsAppSession()
    const conversations = await prisma.conversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, whatsappNumber: true, companyName: true, profilePicUrl: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            direction: true,
            content: true,
            createdAt: true,
            isRead: true,
            messageType: true,
            mediaUrl: true,
            metadata: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { conversations },
    })
  } catch (error) {
    console.error("Erro ao listar conversas:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
