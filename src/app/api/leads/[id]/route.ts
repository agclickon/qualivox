import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"

// GET /api/leads/:id - Obter lead por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(_request)
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        pipelineStage: {
          select: { id: true, name: true, color: true, order: true },
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        conversations: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    console.error("Erro ao buscar lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao buscar lead" } },
      { status: 500 }
    )
  }
}

// PUT /api/leads/:id - Atualizar lead
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()

    const existing = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        phone: body.phone !== undefined ? body.phone : existing.phone,
        email: body.email !== undefined ? body.email : existing.email,
        status: body.status ?? existing.status,
        score: body.score ?? existing.score,
        qualificationLevel: body.qualificationLevel ?? existing.qualificationLevel,
        source: body.source ?? existing.source,
        companyName: body.companyName !== undefined ? body.companyName : existing.companyName,
        position: body.position !== undefined ? body.position : existing.position,
        budgetCents: body.budgetCents ?? existing.budgetCents,
        urgency: body.urgency ?? existing.urgency,
        tags: body.tags ? JSON.stringify(body.tags) : existing.tags,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        customFields: body.customFields ?? existing.customFields,
        assignedToId: body.assignedToId !== undefined ? body.assignedToId : existing.assignedToId,
        pipelineStageId: body.pipelineStageId !== undefined ? body.pipelineStageId : existing.pipelineStageId,
        lastInteraction: body.lastInteraction ?? existing.lastInteraction,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        pipelineStage: { select: { id: true, name: true, color: true } },
      },
    })

    return NextResponse.json({ success: true, data: lead })
  } catch (error) {
    console.error("Erro ao atualizar lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar lead" } },
      { status: 500 }
    )
  }
}

// DELETE /api/leads/:id - Excluir lead
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const prisma = await getPrismaFromRequest(_request)
  try {
    const existing = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Lead não encontrado" } },
        { status: 404 }
      )
    }

    await prisma.lead.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true, data: { message: "Lead excluído com sucesso" } })
  } catch (error) {
    console.error("Erro ao excluir lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao excluir lead" } },
      { status: 500 }
    )
  }
}
