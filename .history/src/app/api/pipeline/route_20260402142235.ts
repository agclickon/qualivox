import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/pipeline - Obter pipeline com leads agrupados por estágio
export async function GET() {
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
        ...lead,
        tags: lead.leadTags.map((lt) => ({
          id: lt.tag.id,
          name: lt.tag.name,
          colorHex: lt.tag.colorHex,
          source: lt.source,
        })),
        leadTags: undefined,
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
