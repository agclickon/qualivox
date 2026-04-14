import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as globalPrisma } from "@/lib/prisma"

// POST /api/whatsapp/conversations/[id]/assign
// Atribui um atendente a uma conversa (ou remove, passando userId: null)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json().catch(() => ({}))
    const { userId, actorId } = body
    // userId: quem vai atender (null = remover atribuição)
    // actorId: quem está fazendo a ação (para registrar no histórico)

    const conversation = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { lead: { select: { id: true, name: true } } },
    })
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Conversa não encontrada" } },
        { status: 404 }
      )
    }

    if (userId) {
      const user = await globalPrisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } })
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Atendente não encontrado" } },
          { status: 404 }
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.$transaction as any)(async (tx: any) => {
      await tx.conversation.update({
        where: { id: params.id },
        data: {
          assignedToId: userId ?? null,
          assignedAt: userId ? new Date() : null,
          status: userId ? "open" : "waiting",
        },
      })

      // Notificação para o atendente designado
      if (userId) {
        await tx.notification.create({
          data: {
            userId,
            type: "lead_atribuido",
            title: "Nova conversa atribuída",
            message: `Você foi designado para atender ${conversation.lead.name}`,
            data: JSON.stringify({ conversationId: params.id, leadId: conversation.lead.id }),
          },
        })
      }

      // Registrar no histórico do lead
      await tx.interaction.create({
        data: {
          leadId: conversation.lead.id,
          userId: actorId ?? null,
          type: "assignment",
          content: userId ? `Conversa atribuída ao atendente` : "Atribuição removida — conversa em espera",
          channel: "sistema",
          conversationId: params.id,
          connectionId: conversation.connectionId,
        },
      })
    })

    const updated = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return NextResponse.json({ success: true, data: { conversation: updated } })
  } catch (error) {
    console.error("[Assign] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao atribuir conversa" } },
      { status: 500 }
    )
  }
}
