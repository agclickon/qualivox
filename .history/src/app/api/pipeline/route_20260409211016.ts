import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/pipeline - Obter pipeline com leads agrupados por estágio
export async function GET() {
  try {
    // Buscar estágios
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    })

    // Buscar todos os leads com seus dados relacionados
    const leads = await prisma.lead.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true },
        },
        leadTags: {
          include: { tag: true },
          orderBy: { appliedAt: "asc" },
        },
        pipelineStage: {
          select: { id: true },
        },
      },
    })

    // Buscar sentimento da tabela AiAnalysis (mais recente por lead)
    const leadIds = leads.map((l) => l.id)
    let sentimentMap = new Map()

    if (leadIds.length > 0) {
      try {
        // Buscar análises mais recentes por lead
        const analyses = await prisma.$queryRawUnsafe<{ lead_id: string; sentiment_score: number }[]>(`
          SELECT lead_id, sentiment_score
          FROM ai_analyses
          WHERE id IN (
            SELECT MAX(id)
            FROM ai_analyses
            WHERE lead_id IN (${leadIds.map(() => '?').join(',')})
            AND sentiment_score IS NOT NULL
            GROUP BY lead_id
          )
        `, ...leadIds)

        for (const row of analyses || []) {
          // Converter sentiment_score (-100 a 100) para categoria
          const score = row.sentiment_score
          let sentiment = "neutro"
          if (score >= 30) sentiment = "positivo"
          else if (score <= -30) sentiment = "negativo"

          // Calcular urgência baseada no score negativo
          let urgency = 0
          if (score < 0) {
            urgency = Math.min(100, Math.abs(score))
          }

          sentimentMap.set(row.lead_id, { sentiment, urgency })
        }
      } catch (e) {
        console.warn("[Pipeline] Erro ao buscar sentimentos:", e)
      }
    }

    // Agrupar leads por estágio
    const leadsByStage = new Map()
    for (const stage of stages) {
      leadsByStage.set(stage.id, [])
    }

    for (const lead of leads) {
      const stageId = lead.pipelineStageId || lead.pipelineStage?.id
      if (stageId && leadsByStage.has(stageId)) {
        const sentimentData = sentimentMap.get(lead.id)
        leadsByStage.get(stageId).push({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          score: lead.score,
          companyName: lead.companyName,
          lifecycleStage: lead.lifecycleStage,
          qualificationLevel: lead.qualificationLevel,
          status: lead.status,
          source: lead.source,
          profilePicUrl: lead.profilePicUrl,
          createdAt: lead.createdAt,
          lastInteraction: lead.lastInteraction,
          updatedAt: lead.updatedAt,
          assignedTo: lead.assignedTo,
          realtimeSentiment: sentimentData?.sentiment ?? null,
          realtimeUrgency: sentimentData?.urgency ?? null,
          tags: lead.leadTags.map((lt) => ({
            id: lt.tag.id,
            name: lt.tag.name,
            colorHex: lt.tag.colorHex,
            source: lt.source,
          })),
        })
      }
    }

    const parsed = stages.map((stage) => ({
      ...stage,
      leads: leadsByStage.get(stage.id) || [],
    }))

    return NextResponse.json({
      success: true,
      data: { stages: parsed },
    })
  } catch (error) {
    console.error("Erro ao buscar pipeline:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar pipeline" } },
      { status: 500 }
    )
  }
}
