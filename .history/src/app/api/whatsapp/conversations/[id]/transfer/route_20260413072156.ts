import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { prisma as globalPrisma } from "@/lib/prisma"

// POST /api/whatsapp/conversations/[id]/transfer
// Transfere a conversa de um atendente para outro
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json().catch(() => ({}))
    const { toUserId, reason, notes, fromUserId } = body

    if (!toUserId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "toUserId é obrigatório" } },
        { status: 400 }
      )
    }

    const [conversation, toUser] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: params.id },
        include: { lead: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
      }),
      globalPrisma.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true } }),
    ])

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Conversa não encontrada" } },
        { status: 404 }
      )
    }
    if (!toUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Atendente destino não encontrado" } },
        { status: 404 }
      )
    }

    const effectiveFromUserId = fromUserId ?? conversation.assignedToId

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.$transaction as any)(async (tx: any) => {
      // Atualizar atendente da conversa
      await tx.conversation.update({
        where: { id: params.id },
        data: {
          assignedToId: toUserId,
          assignedAt: new Date(),
          status: "open",
        },
      })

      // Registrar a transferência
      await tx.conversationTransfer.create({
        data: {
          conversationId: params.id,
          fromUserId: effectiveFromUserId ?? null,
          toUserId,
          reason: reason ?? null,
          notes: notes ?? null,
        },
      })

      // Notificar o atendente receptor
      await tx.notification.create({
        data: {
          userId: toUserId,
          type: "lead_atribuido",
          title: "Conversa transferida para você",
          message: `${conversation.assignedTo?.name ?? "Sistema"} transferiu a conversa com ${conversation.lead.name}${reason ? `: ${reason}` : ""}`,
          data: JSON.stringify({ conversationId: params.id, leadId: conversation.lead.id }),
        },
      })

      // Registrar no histórico do lead
      await tx.interaction.create({
        data: {
          leadId: conversation.lead.id,
          userId: effectiveFromUserId ?? null,
          type: "transfer",
          content: `Conversa transferida para ${toUser.name}${reason ? ` — ${reason}` : ""}`,
          channel: "sistema",
          conversationId: params.id,
          connectionId: conversation.connectionId,
          metadata: JSON.stringify({
            fromUserId: effectiveFromUserId,
            toUserId,
            reason,
            notes,
          }),
        },
      })
    })

    const updated = await prisma.conversation.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    })

    return NextResponse.json({ success: true, data: { conversation: updated } })
  } catch (error) {
    console.error("[Transfer] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao transferir conversa" } },
      { status: 500 }
    )
  }
}
