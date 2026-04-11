import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/analytics/overview - Métricas gerais do dashboard
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalLeads,
      newLeadsToday,
      closedWon,
      closedLost,
      leadsByStatus,
      leadsBySource,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { status: "fechado_ganho" } }),
      prisma.lead.count({ where: { status: "fechado_perdido" } }),
      prisma.lead.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        _count: { source: true },
      }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          assignedTo: { select: { id: true, name: true } },
          pipelineStage: { select: { name: true, color: true } },
        },
      }),
    ])

    const conversionRate = totalLeads > 0
      ? Number(((closedWon / totalLeads) * 100).toFixed(1))
      : 0

    const avgScore = await prisma.lead.aggregate({
      _avg: { score: true },
    })

    const statusMap: Record<string, number> = {}
    leadsByStatus.forEach((item) => {
      statusMap[item.status] = item._count.status
    })

    const sourceMap: Record<string, number> = {}
    leadsBySource.forEach((item) => {
      sourceMap[item.source] = item._count.source
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalLeads,
          newLeadsToday,
          conversionRate,
          averageScore: Math.round(avgScore._avg.score || 0),
          closedWon,
          closedLost,
        },
        leadsByStatus: statusMap,
        leadsBySource: sourceMap,
        recentLeads,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar analytics:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar métricas" } },
      { status: 500 }
    )
  }
}
