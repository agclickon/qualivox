import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { fireWebhook, buildLeadConvertedPayload } from "@/lib/webhook-service"

// POST /api/leads/[id]/convert
// Converte um lead em cliente (lifecycleStage = "cliente")
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json().catch(() => ({}))
    const { notes } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma.lead.findUnique as any)({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    if (existing.lifecycleStage === "cliente") {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_CLIENT", message: "Lead já é um cliente" } },
        { status: 400 }
      )
    }

    // Converte em transação: atualiza lead + cria Interaction de registro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma.$transaction as any)(async (tx: any) => {
      const lead = await tx.lead.update({
        where: { id: params.id },
        data: {
          lifecycleStage: "cliente",
          convertedToClientAt: new Date(),
          // Se o status ainda não está fechado, move para fechado_ganho
          ...(existing.status !== "fechado_ganho" ? { status: "fechado_ganho" } : {}),
        },
      })

      await tx.interaction.create({
        data: {
          leadId: params.id,
          type: "conversion",
          content: notes || "Lead convertido em cliente",
          channel: "sistema",
        },
      })

      return lead
    })

    // Dispara webhook lead.converted de forma assíncrona (não bloqueia resposta)
    buildLeadConvertedPayload(params.id, "manual")
      .then((payload) => fireWebhook("lead.converted", payload))
      .catch((err) => console.error("[Webhook] Erro ao disparar lead.converted:", err))

    return NextResponse.json({ success: true, data: { lead: result } })
  } catch (error) {
    console.error("[Convert] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao converter lead" } },
      { status: 500 }
    )
  }
}
