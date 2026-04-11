/**
 * POST /api/agents/[id]/chat
 *
 * Permite testar um agente manualmente enviando uma mensagem de texto.
 * Não envia resposta via WhatsApp — apenas retorna o resultado do orquestrador.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processMessageWithAgent } from "@/lib/agent-orchestrator"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { message, conversationId } = body

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: "Mensagem obrigatória" }, { status: 400 })
    }

    // Verifica se o agente existe
    const agent = await prisma.agent.findUnique({ where: { id: params.id } })
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agente não encontrado" }, { status: 404 })
    }

    // Se conversationId for fornecido, usa a conversa real; senão cria contexto mínimo
    let convId = conversationId
    let leadId: string
    let connectionId: string

    if (conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { leadId: true, connectionId: true },
      })
      if (!conv) {
        return NextResponse.json({ success: false, error: "Conversa não encontrada" }, { status: 404 })
      }
      leadId = conv.leadId
      connectionId = conv.connectionId || ""
    } else {
      // Modo de teste direto: usa a primeira conexão associada ao agente
      const connectionIds: string[] = (() => {
        try { return JSON.parse(agent.connectionIds || "[]") } catch { return [] }
      })()
      connectionId = connectionIds[0] || ""

      // Busca ou cria um lead de teste para o chat direto
      const testLead = await prisma.lead.findFirst({
        where: { name: { contains: "Teste" } },
        select: { id: true },
      })
      if (!testLead) {
        return NextResponse.json(
          { success: false, error: "Forneça um conversationId para testar" },
          { status: 400 }
        )
      }
      leadId = testLead.id

      // Cria uma conversa temporária de teste se não existir
      const tempConv = await prisma.conversation.create({
        data: {
          leadId,
          connectionId: connectionId || null,
          status: "open",
          openedAt: new Date(),
        },
      })
      convId = tempConv.id
    }

    const result = await processMessageWithAgent(connectionId, convId, leadId, message.trim())

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[Agent Chat] Erro:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
