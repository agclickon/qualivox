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

    // Buscar sentimento das análises de IA (mesma lógica do WhatsApp)
    const leadIds = leads.map((l) => l.id)
    let sentimentMap = new Map()

    if (leadIds.length > 0) {
      try {
        // Buscar análises mais recentes por lead (igual ao WhatsApp)
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
          // Mesma lógica de conversão do WhatsApp
          const score = row.sentiment_score
          let sentiment: "positivo" | "neutro" | "negativo" = "neutro"
          if (score >= 30) sentiment = "positivo"
          else if (score <= -30) sentiment = "negativo"

          // Calcular urgência igual ao WhatsApp
          let urgency = 0
          if (score < 0) {
            urgency = Math.min(100, Math.abs(score))
          }

          sentimentMap.set(row.lead_id, { sentiment, urgency })
        }

        // Também tentar buscar de realtime_sentiment se existir (para dados mais recentes)
        try {
          const conversations = await prisma.$queryRawUnsafe<{ lead_id: string; sentiment: string; urgency: number }[]>(`
            SELECT c.lead_id, c.realtime_sentiment as sentiment, c.realtime_urgency as urgency
            FROM conversations c
            INNER JOIN (
              SELECT lead_id, MAX(updated_at) as max_updated
              FROM conversations
              WHERE lead_id IN (${leadIds.map(() => '?').join(',')})
              AND realtime_sentiment IS NOT NULL
              GROUP BY lead_id
            ) latest ON c.lead_id = latest.lead_id AND c.updated_at = latest.max_updated
          `, ...leadIds)

          // Sobrescrever com dados mais recentes das conversações
          for (const row of conversations || []) {
            sentimentMap.set(row.lead_id, { sentiment: row.sentiment, urgency: row.urgency ?? 0 })
          }
        } catch (e2) {
          // Silencioso - usa apenas ai_analyses
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
