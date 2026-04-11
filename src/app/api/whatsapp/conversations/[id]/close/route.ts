import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { triggerLearningForConversation } from "@/lib/agent-learner"

// POST /api/whatsapp/conversations/[id]/close
// Fecha/resolve a conversa e dispara aprendizado se configurado
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = params.id

    // Verifica se a conversa existe
    const conv = await (prisma.conversation as any).findUnique({
      where: { id: conversationId },
      select: { id: true, status: true },
    })

    if (!conv) {
      return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })
    }

    // Atualiza status para "resolved" e registra closedAt
    await (prisma.conversation as any).update({
      where: { id: conversationId },
      data: {
        status: "resolved",
        closedAt: new Date(),
      },
    })

    // Dispara aprendizado de forma fire-and-forget
    triggerLearningForConversation(conversationId).catch((err) => {
      console.error("[ConvClose] triggerLearningForConversation erro:", err)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ConvClose] POST error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
