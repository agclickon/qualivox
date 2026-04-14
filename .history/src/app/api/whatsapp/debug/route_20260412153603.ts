import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/baileys-session"
import { syncProfilePicsOnConnection, clearProfilePicCache } from "@/lib/baileys-listener"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

export const dynamic = "force-dynamic"

// POST /api/whatsapp/debug - Força sync manual de fotos de perfil
export async function POST(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const connection = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
    if (!connection) return NextResponse.json({ error: "No default connection" }, { status: 404 })

    const session = getSession(connection.id)
    if (!session) return NextResponse.json({ error: "Session not active" }, { status: 503 })

    clearProfilePicCache()
    // Roda em background sem bloquear a resposta
    syncProfilePicsOnConnection(session, connection.id).catch((err: unknown) =>
      console.error("[Debug] syncProfilePics error:", err)
    )

    return NextResponse.json({ success: true, message: "Sync de fotos iniciado em background" })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const connection = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
    if (!connection) {
      return NextResponse.json({ error: "No default connection" })
    }

    const session = getSession(connection.id)
    const info: Record<string, unknown> = {
      connectionId: connection.id,
      dbStatus: connection.status,
      hasSession: !!session,
    }

    if (session) {
      const ws = session.ws as any
      info.wsIsOpen = ws?.isOpen
      info.wsIsClosed = ws?.isClosed
      info.wsIsConnecting = ws?.isConnecting
      info._hasListener = (session as any)._hasListener
      info.sessionId = session.id
      info.userJid = session.user?.id || "unknown"

      // Check ev listener count
      const ev = session.ev as any
      info.evKeys = Object.keys(ev || {})

      // Try to list registered event listeners
      if (ev && typeof ev.listenerCount === "function") {
        info.listenerCounts = {
          "messages.upsert": ev.listenerCount("messages.upsert"),
          "messages.update": ev.listenerCount("messages.update"),
          "chats.upsert": ev.listenerCount("chats.upsert"),
        }
      }
    }

    return NextResponse.json({ success: true, debug: info })
  } catch (error) {
    return NextResponse.json({ error: String(error) })
  }
}
