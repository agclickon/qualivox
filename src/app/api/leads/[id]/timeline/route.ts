import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// GET /api/leads/[id]/timeline
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type")
    const channelFilter = searchParams.get("channel")

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true },
    })
    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    // Filtro de follow_up_sent vai buscar na tabela FollowUp, não em Interaction
    const wantFollowUps = !typeFilter || typeFilter === "follow_up_sent"
    const wantInteractions = !typeFilter || typeFilter !== "follow_up_sent"

    // Busca interactions (exceto quando filtro é exclusivamente follow_up_sent)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interactions = wantInteractions ? await (prisma.interaction.findMany as any)({
      where: {
        leadId: params.id,
        ...(typeFilter && typeFilter !== "follow_up_sent" ? { type: typeFilter } : {}),
        ...(channelFilter ? { channel: channelFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        conversation: {
          select: {
            id: true,
            connection: { select: { id: true, name: true } },
          },
        },
      },
    }) : []

    // Busca follow-ups enviados ou agendados
    const followUps = wantFollowUps ? await prisma.followUp.findMany({
      where: { leadId: params.id },
      orderBy: { sendAt: "desc" },
      include: {
        conversation: {
          select: {
            id: true,
            connection: { select: { id: true, name: true } },
          },
        },
      },
    }) : []

    type RawInteraction = {
      id: string; type: string; content: string; channel: string | null
      metadata: string | null; createdAt: Date
      user: { id: string; name: string; avatarUrl: string | null } | null
      conversation: { id: string; connection: { id: string; name: string } | null } | null
    }

    const interactionItems = interactions.map((i: RawInteraction) => ({
      id: i.id,
      type: i.type,
      content: i.content,
      channel: i.channel,
      metadata: i.metadata ? JSON.parse(i.metadata) : null,
      createdAt: i.createdAt,
      user: i.user ?? null,
      connectionName: i.conversation?.connection?.name ?? null,
      conversationId: i.conversation?.id ?? null,
    }))

    type RawFollowUp = {
      id: string; message: string; sendAt: Date; status: string; sentAt: Date | null
      conversation: { id: string; connection: { id: string; name: string } | null }
    }

    const followUpItems = followUps.map((f: RawFollowUp) => {
      const statusLabel = f.status === "sent" ? "enviado" : f.status === "failed" ? "falhou" : "agendado"
      const dateLabel = new Date(f.sentAt ?? f.sendAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      return {
        id: `fu_${f.id}`,
        type: "follow_up_sent",
        content: `Follow-up ${statusLabel} em ${dateLabel}: "${f.message.slice(0, 60)}${f.message.length > 60 ? "…" : ""}"`,
        channel: "whatsapp",
        metadata: { status: f.status, sendAt: f.sendAt },
        createdAt: f.sentAt ?? f.sendAt,
        user: null,
        connectionName: f.conversation?.connection?.name ?? null,
        conversationId: f.conversation?.id ?? null,
      }
    })

    // Merge e ordena por data decrescente
    const items = [...interactionItems, ...followUpItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ success: true, data: { items } })
  } catch (error) {
    console.error("[Timeline] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
