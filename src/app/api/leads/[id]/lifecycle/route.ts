import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const VALID_STAGES = ["prospect", "lead_qualificado", "oportunidade", "cliente", "pos_venda", "churned"]

// PATCH /api/leads/[id]/lifecycle
// Atualiza manualmente o lifecycleStage de um lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    const { lifecycleStage, notes } = body

    if (!lifecycleStage || !VALID_STAGES.includes(lifecycleStage)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STAGE", message: `Stage inválido. Use: ${VALID_STAGES.join(", ")}` } },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma.lead.findUnique as any)({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    const isConvertingToClient = lifecycleStage === "cliente" && existing.lifecycleStage !== "cliente"

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma.$transaction as any)(async (tx: any) => {
      const lead = await tx.lead.update({
        where: { id: params.id },
        data: {
          lifecycleStage,
          ...(isConvertingToClient ? { convertedToClientAt: new Date() } : {}),
        },
      })

      await tx.interaction.create({
        data: {
          leadId: params.id,
          type: isConvertingToClient ? "conversion" : "status_change",
          content: notes || `Ciclo de vida alterado para: ${lifecycleStage}`,
          channel: "sistema",
          metadata: JSON.stringify({ from: existing.lifecycleStage, to: lifecycleStage }),
        },
      })

      return lead
    })

    return NextResponse.json({ success: true, data: { lead: result } })
  } catch (error) {
    console.error("[Lifecycle] Erro:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar ciclo de vida" } },
      { status: 500 }
    )
  }
}
