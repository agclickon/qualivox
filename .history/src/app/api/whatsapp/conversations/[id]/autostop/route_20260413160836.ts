import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { emitConversationUpdate } from "@/lib/baileys-listener"

export const dynamic = "force-dynamic"

// POST /api/whatsapp/conversations/[id]/autostop
// body: { minutes: 15 | 30 | 60 }  → pausa o agente por N minutos
// body: { resume: true }            → retoma imediatamente
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(req)
  try {
    const body = await req.json()
    const conversationId = params.id

    let agentPausedUntil: string | null = null

    if (body.resume) {
      // Retoma imediatamente
      await prisma.$executeRawUnsafe(
        `UPDATE conversations SET agent_paused_until = NULL, updated_at = NOW() WHERE id = $1`,
        conversationId
      )
      agentPausedUntil = null
    } else {
      const minutes = Number(body.minutes)
      if (!minutes || minutes <= 0) {
        return NextResponse.json({ success: false, error: "minutes inválido" }, { status: 400 })
      }
      const pauseUntil = new Date(Date.now() + minutes * 60 * 1000)
      agentPausedUntil = pauseUntil.toISOString()
      await prisma.$executeRawUnsafe(
        `UPDATE conversations SET agent_paused_until = $1, updated_at = NOW() WHERE id = $2`,
        agentPausedUntil,
        conversationId
      )
    }

    // Emite evento SSE para todos os clientes conectados
    emitConversationUpdate({ conversationId, agentPausedUntil })

    return NextResponse.json({ success: true, agentPausedUntil })
  } catch (error) {
    console.error("[Autostop] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
