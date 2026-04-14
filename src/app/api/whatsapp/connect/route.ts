import { NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"
import { getPrismaFromRequest, getPrismaForConnection } from "@/lib/prisma-tenant"

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || ""

async function connectViaRailway(connectionId: string) {
  if (!WHATSAPP_SERVICE_URL) {
    console.error("[WhatsApp Connect] WHATSAPP_SERVICE_URL não configurado")
    return null
  }

  try {
    // Chama Railway para iniciar conexão
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/connect/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    if (!response.ok) {
      console.error("[WhatsApp Connect] Railway error:", response.status)
      return null
    }

    const data = await response.json()
    console.log("[WhatsApp Connect] Railway response:", data)
    return data
  } catch (err) {
    console.error("[WhatsApp Connect] Fetch error:", err)
    return null
  }
}

// GET /api/whatsapp/connect?connectionId=xxx
export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const connectionIdParam = searchParams.get("connectionId")

    let connectionId = connectionIdParam
    
    if (!connectionId) {
      // fallback: default connection
      let conn = await prisma.whatsappConnection.findFirst({ where: { isDefault: true } })
      if (!conn) {
        conn = await prisma.whatsappConnection.create({
          data: { name: "WhatsApp Principal", provider: "baileys", isDefault: true, status: "disconnected" },
        })
      }
      connectionId = conn.id
    }

    // Chama Railway para conectar
    await connectViaRailway(connectionId)

    // Aguarda e busca status do banco
    await new Promise((r) => setTimeout(r, 2000))
    const db = await getPrismaForConnection(connectionId)
    let connection = await db.whatsappConnection.findUnique({ where: { id: connectionId } })
    
    // Poll por até 8s esperando QR ou CONNECTED
    for (let i = 0; i < 8 && connection; i++) {
      if (connection.status === "CONNECTED" || (connection.status === "qrcode" && connection.qrcode)) break
      await new Promise((r) => setTimeout(r, 1000))
      connection = await db.whatsappConnection.findUnique({ where: { id: connectionId } })
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
