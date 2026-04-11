import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * POST /api/ai/apply
 * Aplica sugestões já calculadas sem re-executar a IA.
 *
 * Body: {
 *   leadId: string
 *   tagIds?: string[]        → aplicar tags
 *   stageId?: string         → mover no Kanban
 *   score?: number           → atualizar score
 *   qualificationLevel?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      leadId?: string
      tagIds?: string[]
      stageId?: string
      score?: number
      qualificationLevel?: string
    }

    if (!body.leadId) {
      return NextResponse.json({ success: false, error: "leadId obrigatório" }, { status: 400 })
    }

    const applied: string[] = []

    if (body.tagIds && body.tagIds.length > 0) {
      for (const tagId of body.tagIds) {
        const tag = await prisma.tag.findUnique({ where: { id: tagId } })
        if (tag?.isActive) {
          await prisma.leadTag.upsert({
            where: { leadId_tagId: { leadId: body.leadId, tagId } },
            create: { leadId: body.leadId, tagId, source: "ai", appliedBy: "classifier" },
            update: { source: "ai", appliedBy: "classifier", appliedAt: new Date() },
          })
        }
      }
      applied.push("tags")
    }

    if (body.stageId) {
      await prisma.lead.update({
        where: { id: body.leadId },
        data: { pipelineStageId: body.stageId },
      })
      applied.push("stage")
    }

    if (body.score !== undefined || body.qualificationLevel !== undefined) {
      const data: Record<string, unknown> = {}
      if (body.score !== undefined) data.score = body.score
      if (body.qualificationLevel !== undefined) data.qualificationLevel = body.qualificationLevel
      await prisma.lead.update({ where: { id: body.leadId }, data })
      applied.push("score")
    }

    // Retornar lead atualizado para o frontend sincronizar o estado
    const lead = await prisma.lead.findUnique({
      where: { id: body.leadId },
      select: { id: true, score: true, qualificationLevel: true, pipelineStageId: true },
    })

    return NextResponse.json({ success: true, data: { applied, lead } })
  } catch (e: unknown) {
    console.error("[ai/apply]", e)
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : "Erro interno",
    }, { status: 500 })
  }
}
