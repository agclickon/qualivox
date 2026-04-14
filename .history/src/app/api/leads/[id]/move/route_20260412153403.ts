import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { fireWebhook, buildLeadConvertedPayload } from "@/lib/webhook-service"

// Estágios que representam "fechado ganho" (case-insensitive)
const WIN_STAGE_NAMES = ["fechado ganho", "fechado_ganho", "won", "closed won", "ganho"]

function isWinStage(stageName: string): boolean {
  return WIN_STAGE_NAMES.includes(stageName.toLowerCase().trim())
}

// PATCH /api/leads/:id/move - Mover lead no pipeline
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()
    const { stageId } = body

    if (!stageId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "stageId é obrigatório" } },
        { status: 400 }
      )
    }

    const [stage, existingLead] = await Promise.all([
      prisma.pipelineStage.findUnique({ where: { id: stageId } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (prisma.lead.findUnique as any)({ where: { id: params.id } }),
    ])

    if (!stage) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Estágio não encontrado" } },
        { status: 404 }
      )
    }

    // Verificar se deve converter automaticamente para cliente
    const movingToWin = isWinStage(stage.name)
    const alreadyClient = existingLead?.lifecycleStage === "cliente"
    let shouldAutoConvert = false

    if (movingToWin && !alreadyClient) {
      // Consultar setting de conversão automática
      const setting = await prisma.setting.findUnique({ where: { key: "autoConvertOnWin" } })
      shouldAutoConvert = setting?.value === "true"
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await (prisma.$transaction as any)(async (tx: any) => {
      const updateData: Record<string, unknown> = { pipelineStageId: stageId }
      if (movingToWin) updateData.status = "fechado_ganho"
      if (shouldAutoConvert) {
        updateData.lifecycleStage = "cliente"
        updateData.convertedToClientAt = new Date()
      }

      const updated = await tx.lead.update({
        where: { id: params.id },
        data: updateData,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          pipelineStage: { select: { id: true, name: true, color: true } },
        },
      })

      // Registrar movimento no histórico
      await tx.interaction.create({
        data: {
          leadId: params.id,
          type: "pipeline_move",
          content: `Movido para: ${stage.name}`,
          channel: "sistema",
          metadata: JSON.stringify({ stageId, stageName: stage.name }),
        },
      })

      // Registrar conversão se automática
      if (shouldAutoConvert) {
        await tx.interaction.create({
          data: {
            leadId: params.id,
            type: "conversion",
            content: "Convertido automaticamente em cliente ao fechar negócio",
            channel: "sistema",
          },
        })
      }

      return updated
    })

    // Dispara webhook lead.converted se houve conversão automática
    if (shouldAutoConvert) {
      buildLeadConvertedPayload(params.id, "automatic")
        .then((payload) => fireWebhook("lead.converted", payload))
        .catch((err) => console.error("[Webhook] Erro ao disparar lead.converted:", err))
    }

    return NextResponse.json({
      success: true,
      data: lead,
      ...(movingToWin && !alreadyClient && !shouldAutoConvert ? { requiresConversionConfirm: true } : {}),
    })
  } catch (error) {
    console.error("Erro ao mover lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao mover lead" } },
      { status: 500 }
    )
  }
}
