import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/audit - Listar logs de auditoria
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get("x-user-role")
    if (userRole !== "super_admin" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Sem permissão" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const entity = searchParams.get("entity") || ""
    const action = searchParams.get("action") || ""
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (entity) where.entity = entity
    if (action) where.action = { contains: action, mode: "insensitive" }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    })
  } catch (error) {
    console.error("Erro ao listar auditoria:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Erro interno" } },
      { status: 500 }
    )
  }
}
