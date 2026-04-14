import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { Prisma } from "@prisma/client"
import { getPrismaFromRequest, getPrismaForConnection } from "@/lib/prisma-tenant"
import { initSession, getSession, registerSessionHook } from "@/lib/baileys-session"
import { startMessageListener } from "@/lib/baileys-listener"

type WaConn = Prisma.WhatsappConnectionGetPayload<Record<string, never>>

async function connectConnection(connectionId: string) {
  // Resolve o banco correto para esta conexão (banco isolado do tenant ou default)
  const db = await getPrismaForConnection(connectionId)

  let connection: WaConn | null = await db.whatsappConnection.findUnique({ where: { id: connectionId } })
  if (!connection) return null

  registerSessionHook(connection.id, (session) => {
    startMessageListener(session, connection!.id)
  })

  if (!getSession(connection.id)) {
    try {
      await initSession(connection.id)
    } catch (err) {
      console.error("[WhatsApp Connect] initSession error:", err)
    }
  }

  // Poll por até 10s esperando QR ou CONNECTED
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const polled: WaConn | null = await db.whatsappConnection.findUnique({ where: { id: connection!.id } })
    if (!polled) break
    connection = polled
    if (polled.status === "CONNECTED") break
    if (polled.status === "qrcode" && polled.qrcode) break
  }

  return connection
}

// GET /api/whatsapp/connect?connectionId=xxx
export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const connectionIdParam = searchParams.get("connectionId")

    let connection
    if (connectionIdParam) {
      connection = await connectConnection(connectionIdParam)
    } else {
      // fallback: default connection
      let conn = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
      if (!conn) {
        conn = await prisma.whatsappConnection.create({
          data: { name: "WhatsApp Principal", provider: "baileys", isDefault: true, status: "disconnected" },
        })
      }
      connection = await connectConnection(conn.id)
    }

    if (!connection) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Conexão não encontrada" } }, { status: 404 })
    }

    let qrBase64: string | null = null
    if (connection.qrcode) {
      try {
        const dataUrl = await QRCode.toDataURL(connection.qrcode, { width: 300, margin: 2 })
        qrBase64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "")
      } catch {
        qrBase64 = null
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        state: connection.status === "CONNECTED" ? "open" : connection.status,
        connected: connection.status === "CONNECTED",
        connectionId: connection.id,
        instanceName: connection.name,
        phoneNumber: connection.phoneNumber ?? null,
        qrCode: qrBase64,
      },
    })
  } catch (error) {
    console.error("[WhatsApp Connect] Error:", error)
    return NextResponse.json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Erro ao conectar" },
    }, { status: 500 })
  }
}
