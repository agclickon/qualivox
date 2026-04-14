import { NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { removeSession } from "@/lib/baileys-session"

// POST /api/whatsapp/disconnect - Desconectar WhatsApp (Baileys)
export async function POST(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const connection = await prisma.whatsappConnection.findFirst({
      where: { isDefault: true },
    })

    if (!connection) {
      return NextResponse.json({
        success: false,
        error: { code: "NOT_FOUND", message: "Nenhuma conexão encontrada" },
      }, { status: 404 })
    }

    await removeSession(connection.id, true)

    await prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: { status: "disconnected", session: "", qrcode: "", retries: 0 },
    })

    return NextResponse.json({
      success: true,
      data: { message: "WhatsApp desconectado com sucesso" },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Erro ao desconectar",
      },
    }, { status: 500 })
  }
}
