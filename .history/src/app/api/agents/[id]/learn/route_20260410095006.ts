import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { indexConversation } from "@/lib/agent-learner"

// POST /api/agents/[id]/learn
// Dispara indexação manual de uma conversa para este agente
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userRole = req.headers.get("x-user-role")
  if (userRole !== "super_admin" && userRole !== "admin") {
    return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { conversationId } = body

    if (!conversationId) {
      return NextResponse.json({ success: false, error: "conversationId é obrigatório" }, { status: 400 })
    }

    // Verifica se o agente existe
    const agent = await prisma.agent.findUnique({ where: { id: params.id } })
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agente não encontrado" }, { status: 404 })
    }

    // Disparo manual sempre aprova imediatamente
    const result = await indexConversation(params.id, conversationId, true)

    if (!result) {
      return NextResponse.json({ success: false, error: "Nenhuma mensagem encontrada na conversa" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { knowledgeId: result.knowledgeId, chunkCount: result.chunkCount },
    })
  } catch (error) {
    console.error("[Learn] POST error:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
