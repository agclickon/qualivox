import { NextRequest, NextResponse } from "next/server"
import { getPrismaFromRequest } from "@/lib/prisma-tenant"
import { executeAutomations } from "@/lib/automation-engine"
import { createLeadSchema } from "@/lib/validators"

// GET /api/leads - Listar leads com paginação, busca e ordenação
export async function GET(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const source = searchParams.get("source") || ""
    const sortBy = searchParams.get("sortBy") || "createdAt"
    const sortOrder = searchParams.get("sortOrder") || "desc"
    const assignedToId = searchParams.get("assignedToId") || ""
    const lifecycleStage = searchParams.get("lifecycleStage") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { companyName: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (source) {
      where.source = source
    }

    if (assignedToId) {
      where.assignedToId = assignedToId
    }

    if (lifecycleStage) {
      where.lifecycleStage = lifecycleStage
    }

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom + "T00:00:00.000Z") } : {}),
        ...(dateTo   ? { lte: new Date(dateTo   + "T23:59:59.999Z") } : {}),
      }
    }

    const orderBy: Record<string, string> = {}
    const validSortFields = ["name", "email", "status", "score", "createdAt", "updatedAt", "lastInteraction"]
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc"
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: { id: true, name: true, avatarUrl: true },
          },
          pipelineStage: {
            select: { id: true, name: true, color: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("Erro ao listar leads:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao listar leads" } },
      { status: 500 }
    )
  }
}

// POST /api/leads - Criar lead
export async function POST(request: NextRequest) {
  const prisma = await getPrismaFromRequest(request)
  try {
    const body = await request.json()
    const validation = createLeadSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Dados inválidos",
            details: validation.error.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        },
        { status: 400 }
      )
    }

    const data = validation.data
    const userId = request.headers.get("x-user-id")

    // Buscar o primeiro estágio do pipeline como padrão
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { isDefault: true },
      orderBy: { order: "asc" },
    })

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        source: data.source,
        companyName: data.companyName || null,
        position: data.position || null,
        notes: data.notes || null,
        tags: JSON.stringify(data.tags || []),
        assignedToId: data.assignedToId || null,
        createdById: userId || null,
        pipelineStageId: defaultStage?.id || null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, avatarUrl: true },
        },
        pipelineStage: {
          select: { id: true, name: true, color: true },
        },
      },
    })

    // Disparar automações em background (não bloqueia resposta)
    executeAutomations({
      event: "lead.created",
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: lead.phone || undefined,
      leadEmail: lead.email || undefined,
    }, prisma).catch((err) => console.error("Erro ao executar automações:", err))

    return NextResponse.json(
      { success: true, data: lead },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erro ao criar lead:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro ao criar lead" } },
      { status: 500 }
    )
  }
}
