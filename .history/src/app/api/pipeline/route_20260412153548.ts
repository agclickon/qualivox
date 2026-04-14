import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// GET /api/pipeline - Obter pipeline com leads agrupados por estágio
export async function GET(req: NextRequest) {
  const prisma = await getPrismaFromRequest(req)
  try {
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
          },
        },
        _count: {
          select: { leads: true },
        },
      },
    })

    const parsed = stages.map((stage) => ({
      ...stage,
      leads: stage.leads.map((lead) => ({
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
        tags: lead.leadTags.map((lt) => ({
          id: lt.tag.id,
          name: lt.tag.name,
          colorHex: lt.tag.colorHex,
          source: lt.source,
        })),
      })),
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
