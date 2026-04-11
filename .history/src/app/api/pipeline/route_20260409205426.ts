import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/pipeline - Obter pipeline com leads agrupados por estágio
export async function GET() {
  try {
    // Buscar estágios com leads (sem realtimeSentiment que é lazy migration)
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: "asc" },
      include: {
        leads: {
          orderBy: { updatedAt: "desc" },
          include: {
            assignedTo: {
              select: { id: true, name: true, avatarUrl: true },
            },
            leadTags: {
              include: { tag: true },
              orderBy: { appliedAt: "asc" },
            },
            conversations: {
              select: {
                id: true,
              },
              orderBy: { updatedAt: "desc" },
              take: 1,
            },
          },
        },
        _count: {
          select: { leads: true },
        },
      },
    })

    // Buscar realtimeSentiment via raw SQL para cada lead
    const leadIds = stages.flatMap((s: any) => s.leads.map((l: any) => l.id))
    let sentimentMap = new Map()

    if (leadIds.length > 0) {
      const sentiments = await prisma.$queryRawUnsafe<{ lead_id: string; sentiment: string; urgency: number }[]>(`
        SELECT c.lead_id, c.realtime_sentiment as sentiment, c.realtime_urgency as urgency
        FROM conversations c
        INNER JOIN (
          SELECT lead_id, MAX(updated_at) as max_updated
          FROM conversations
          WHERE lead_id IN (${leadIds.map(() => '?').join(',')})
          GROUP BY lead_id
        ) latest ON c.lead_id = latest.lead_id AND c.updated_at = latest.max_updated
      `, ...leadIds)

      for (const row of sentiments || []) {
        sentimentMap.set(row.lead_id, { sentiment: row.sentiment, urgency: row.urgency })
      }
    }

    const parsed = stages.map((stage: any) => ({
      ...stage,
      leads: stage.leads.map((lead: any) => {
        const sentimentData = sentimentMap.get(lead.id)
        return {
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
          tags: lead.leadTags.map((lt: any) => ({
            id: lt.tag.id,
            name: lt.tag.name,
            colorHex: lt.tag.colorHex,
            source: lt.source,
          })),
        }
      }),
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
